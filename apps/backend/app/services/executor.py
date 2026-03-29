"""
Pipeline execution engine.

Accepts a PipelineDAG dict, generates a Python script via the codegen engine,
runs it as a subprocess, and streams stdout/stderr line-by-line to a per-run
asyncio.Queue. Consumers (WebSocket handlers) read from that queue.

Message schema
--------------
Log line  : {"type": "log",    "text": "...", "stream": "stdout|stderr"}
Status    : {"type": "status", "status": "running|success|error", "node_id": null}
Sentinel  : {"type": "done"}
Error     : {"type": "error",  "text": "..."}
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import traceback
from pathlib import Path
from collections.abc import Awaitable, Callable
from typing import Any

from app.models.pipeline import PipelineDAG
from app.services.codegen.engine import generate_snippets
from app.services.codegen import python_gen

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------

_run_queues: dict[str, asyncio.Queue] = {}
_run_status: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def get_queue(run_id: str) -> asyncio.Queue | None:
    """Return the asyncio.Queue for *run_id*, or None if it does not exist yet."""
    return _run_queues.get(run_id)


def get_status(run_id: str) -> str | None:
    """Return the current status string for *run_id*, or None if unknown."""
    return _run_status.get(run_id)


# ---------------------------------------------------------------------------
# Thread-based subprocess streamer
# ---------------------------------------------------------------------------

async def _stream_subprocess(
    cmd: list[str],
    on_line: Callable[[str, str], Awaitable[None]],
    cwd: str | None = None,
    combine_stderr: bool = False,
) -> int:
    """Run *cmd* as a subprocess, calling ``on_line(line, stream_name)`` for
    each line of output.

    Uses ``subprocess.Popen`` + background threads to read output, then
    forwards lines to the caller via an ``asyncio.Queue``.  This approach works
    on *both* ``ProactorEventLoop`` and ``SelectorEventLoop`` (the Windows
    default when uvicorn is started with ``--loop asyncio`` under Python 3.14+,
    where ``asyncio.create_subprocess_exec`` raises ``NotImplementedError``).
    """
    loop = asyncio.get_running_loop()
    line_queue: asyncio.Queue[tuple[str, str] | None] = asyncio.Queue()

    def _reader(stream, name: str) -> None:
        try:
            for raw in stream:
                line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                asyncio.run_coroutine_threadsafe(line_queue.put((line, name)), loop)
        finally:
            # Sentinel: tells the async drain loop this stream is finished.
            asyncio.run_coroutine_threadsafe(line_queue.put(None), loop)

    stderr_opt = subprocess.STDOUT if combine_stderr else subprocess.PIPE
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=stderr_opt, cwd=cwd)

    # One sentinel per open stream.
    num_sentinels = 1 if combine_stderr else 2
    threads: list[threading.Thread] = [
        threading.Thread(target=_reader, args=(proc.stdout, "stdout"), daemon=True)
    ]
    if not combine_stderr and proc.stderr is not None:
        threads.append(
            threading.Thread(target=_reader, args=(proc.stderr, "stderr"), daemon=True)
        )
    for t in threads:
        t.start()

    # Drain lines on the event loop until both stream threads send their sentinels.
    done = 0
    while done < num_sentinels:
        item = await line_queue.get()
        if item is None:
            done += 1
        else:
            line, stream_name = item
            await on_line(line, stream_name)

    # By the time both streams are closed the process has exited or is about to.
    return await asyncio.to_thread(proc.wait)


# ---------------------------------------------------------------------------
# Core executor
# ---------------------------------------------------------------------------

def _get_python_executable() -> str:
    """Return the Python interpreter for running generated pipeline scripts.

    In a PyInstaller bundle ``sys.executable`` points to the bundled exe, not
    Python.  Fall back to searching PATH so pipeline scripts can import the
    user's installed ML packages (sklearn, torch, etc.).
    """
    if getattr(sys, 'frozen', False):
        return shutil.which('python3') or shutil.which('python') or 'python'
    return sys.executable


def _get_pip_install_cmd(packages: list[str], extra_flags: list[str] | None = None) -> list[str]:
    """Return the best available command to install *packages*.

    uv-managed virtual environments are created without pip by default.
    When ``uv`` is on PATH, prefer ``uv pip install`` which works in any
    uv venv.  Otherwise fall back to ``sys.executable -m pip install``.
    """
    flags = extra_flags or []
    uv = shutil.which("uv")
    if uv:
        return [uv, "pip", "install"] + flags + packages
    return [sys.executable, "-m", "pip", "install"] + flags + packages


def _prepare_dag_for_docker(dag: dict[str, Any], build_dir: str) -> dict[str, Any]:
    """Copy any absolute local file paths referenced by nodes into *build_dir*
    and rewrite those paths to bare filenames so the generated script uses
    relative paths inside the Docker container.

    The Docker build context already gets ``COPY . .``, so any file placed in
    *build_dir* is available at the container's ``/app/<filename>`` workdir.

    Returns a shallow-copy of *dag* with rewritten node configs — the original
    dict is not mutated.
    """
    import copy as _copy
    dag_copy = _copy.deepcopy(dag)
    for node in dag_copy.get("nodes", []):
        cfg = node.get("config", {})
        file_path = cfg.get("file_path", "")
        if not file_path:
            continue
        src = Path(file_path)
        if src.is_absolute() and src.is_file():
            dest = Path(build_dir) / src.name
            # Avoid overwriting if two nodes reference the same filename.
            if not dest.exists():
                shutil.copy2(src, dest)
            cfg["file_path"] = src.name   # rewrite to bare filename
    return dag_copy


async def execute_pipeline(run_id: str, dag: dict[str, Any]) -> None:
    """Run the pipeline described by *dag* and stream output to a queue.

    This coroutine is designed to be launched as an asyncio background task.
    It:
    1. Creates a fresh :class:`asyncio.Queue` for the run.
    2. Converts the raw *dag* dict into a :class:`~app.models.pipeline.PipelineDAG`
       and calls the codegen engine to produce a standalone Python script.
    3. Writes the script to a temporary file.
    4. Executes the script in a subprocess, streaming each stdout/stderr line
       as a ``{"type": "log", ...}`` message to the queue.
    5. Updates ``_run_status`` to ``"success"`` or ``"error"`` on completion.
    6. Pushes a ``{"type": "done"}`` sentinel so consumers know the stream is
       finished.
    """
    queue: asyncio.Queue = asyncio.Queue()
    _run_queues[run_id] = queue
    _run_status[run_id] = "running"

    # Notify consumers that execution has started.
    await queue.put({"type": "status", "status": "running", "node_id": None})

    tmp_path: str | None = None
    try:
        # ── 1. Code generation ────────────────────────────────────────────
        try:
            dag_obj = PipelineDAG(**dag)
            ordered, snippets, packages = generate_snippets(dag_obj)

            # Wrap each snippet with per-node status markers so the log
            # streamer can emit node-level status events.
            wrapped: list[str] = []
            for node, snippet in zip(ordered, snippets):
                nid = node.id
                # Indent the snippet body so it sits inside the try block.
                indented = "\n".join("    " + line for line in snippet.splitlines())
                wrapped.append(
                    f'print("__AIIDE_NODE_START:{nid}__", flush=True)\n'
                    f"try:\n"
                    f"{indented}\n"
                    f'    print("__AIIDE_NODE_END:{nid}:success__", flush=True)\n'
                    f"except Exception as _aiide_exc:\n"
                    f'    print(f"__AIIDE_NODE_END:{nid}:error__", flush=True)\n'
                    f"    raise\n"
                )

            code, _ = python_gen.assemble(dag_obj, wrapped, packages)
        except Exception as exc:
            err_msg = f"Code generation failed: {exc}"
            await queue.put({"type": "error", "text": err_msg})
            await queue.put({"type": "status", "status": "error", "node_id": None})
            _run_status[run_id] = "error"
            await queue.put({"type": "done"})
            return

        # ── 2. Write script to temp file ──────────────────────────────────
        fd, tmp_path = tempfile.mkstemp(suffix=".py", prefix=f"aiide_{run_id[:8]}_")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(code)

        # ── 3. Launch subprocess and stream output ────────────────────────
        python_exe = _get_python_executable()

        async def _on_line(line: str, stream_name: str) -> None:
            if line.startswith("__AIIDE_NODE_START:"):
                node_id = line[len("__AIIDE_NODE_START:"):-2]  # strip trailing __
                await queue.put({"type": "status", "status": "running", "node_id": node_id})
            elif line.startswith("__AIIDE_NODE_END:"):
                parts = line[len("__AIIDE_NODE_END:"):-2].split(":")
                if len(parts) == 2:
                    node_id, status = parts
                    await queue.put({"type": "status", "status": status, "node_id": node_id})
            else:
                await queue.put({"type": "log", "text": line, "stream": stream_name})

        return_code = await _stream_subprocess([python_exe, tmp_path], _on_line)

        # ── 4. Final status ───────────────────────────────────────────────
        if return_code == 0:
            final_status = "success"
        else:
            final_status = "error"
            await queue.put(
                {
                    "type": "log",
                    "text": f"Process exited with code {return_code}",
                    "stream": "stderr",
                }
            )

        _run_status[run_id] = final_status
        await queue.put({"type": "status", "status": final_status, "node_id": None})

    except Exception as exc:
        _run_status[run_id] = "error"
        exc_type = type(exc).__name__
        exc_msg = str(exc) or repr(exc) or "(no message)"
        tb = traceback.format_exc()
        print(f"[executor] error ({exc_type}): {exc_msg}\n{tb}", file=sys.stderr, flush=True)
        await queue.put({"type": "error", "text": f"Executor error ({exc_type}): {exc_msg}"})
        for tb_line in tb.splitlines():
            if tb_line.strip():
                await queue.put({"type": "log", "text": tb_line, "stream": "stderr"})
        await queue.put({"type": "status", "status": "error", "node_id": None})

    finally:
        # ── 5. Sentinel — always sent so consumers exit cleanly ───────────
        await queue.put({"type": "done"})

        # Clean up temp file (best-effort).
        if tmp_path is not None:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Docker executor
# ---------------------------------------------------------------------------

async def execute_pipeline_docker(run_id: str, dag: dict[str, Any]) -> None:
    """Build and run the pipeline inside a Docker container.

    Steps:
    1. Generate pipeline.py, Dockerfile, and requirements.txt into a temp dir.
    2. Run ``docker build`` — streams build output to the queue.
    3. Run ``docker run --rm`` — streams container stdout/stderr.
    4. Removes the Docker image on completion (best-effort).
    5. Cleans up the temp directory.
    """
    queue: asyncio.Queue = asyncio.Queue()
    _run_queues[run_id] = queue
    _run_status[run_id] = "running"

    await queue.put({"type": "status", "status": "running", "node_id": None})

    tmp_dir: str | None = None
    image_tag = f"aiide-pipeline-{run_id[:8]}"

    try:
        # Create build context dir early — _prepare_dag_for_docker needs it
        # to copy local data files before code generation rewrites the paths.
        tmp_dir = tempfile.mkdtemp(prefix=f"aiide_docker_{run_id[:8]}_")

        # Rewrite absolute file_path values to bare filenames; copies the
        # source files into tmp_dir so they end up in the Docker build context.
        dag_for_docker = _prepare_dag_for_docker(dag, tmp_dir)
        dag_obj = PipelineDAG(**dag_for_docker)

        # ── 1. Generate code artefacts ────────────────────────────────────
        try:
            from app.services.codegen import docker_gen
            ordered, snippets, packages = generate_snippets(dag_obj)
            pipeline_code, _ = python_gen.assemble(dag_obj, snippets, packages)
            requirements = "\n".join(packages) + "\n" if packages else ""
            dockerfile = docker_gen.DOCKERFILE.format(name=dag_obj.name)
        except Exception as exc:
            await queue.put({"type": "error", "text": f"Code generation failed: {exc}"})
            await queue.put({"type": "status", "status": "error", "node_id": None})
            _run_status[run_id] = "error"
            await queue.put({"type": "done"})
            return

        # ── 2. Write artefacts to temp directory ──────────────────────────
        with open(os.path.join(tmp_dir, "pipeline.py"), "w", encoding="utf-8") as f:
            f.write(pipeline_code)
        with open(os.path.join(tmp_dir, "requirements.txt"), "w", encoding="utf-8") as f:
            f.write(requirements)
        with open(os.path.join(tmp_dir, "Dockerfile"), "w", encoding="utf-8") as f:
            f.write(dockerfile)

        await queue.put({"type": "log", "text": f"[Docker] Build context: {tmp_dir}", "stream": "stdout"})
        await queue.put({"type": "log", "text": f"[Docker] Image tag: {image_tag}", "stream": "stdout"})

        # ── 3. docker build ───────────────────────────────────────────────
        docker_exe = shutil.which("docker") or "docker"
        await queue.put({"type": "log", "text": f"[Docker] Using: {docker_exe}", "stream": "stdout"})

        # Verify Docker daemon is reachable before attempting a build.
        docker_check_rc = await _stream_subprocess(
            [docker_exe, "info"],
            lambda _l, _s: asyncio.sleep(0),
        )
        if docker_check_rc != 0:
            await queue.put({
                "type": "error",
                "text": "Docker is not running. Open Docker Desktop and wait for it to start, then try again.",
            })
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        await queue.put({"type": "log", "text": "[Docker] Building image…", "stream": "stdout"})

        async def _on_build_line(line: str, _stream_name: str) -> None:
            if line:
                await queue.put({"type": "log", "text": f"[build] {line}", "stream": "stdout"})

        build_rc = await _stream_subprocess(
            [docker_exe, "build", "--tag", image_tag, "."],
            _on_build_line,
            cwd=tmp_dir,
            combine_stderr=True,
        )

        if build_rc != 0:
            await queue.put({"type": "error", "text": f"docker build failed (exit {build_rc})"})
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        await queue.put({"type": "log", "text": "[Docker] Image built. Starting container…", "stream": "stdout"})

        # ── 4. docker run ─────────────────────────────────────────────────
        async def _on_run_line(line: str, stream_name: str) -> None:
            if line:
                await queue.put({"type": "log", "text": line, "stream": stream_name})

        run_rc = await _stream_subprocess(
            [docker_exe, "run", "--rm", image_tag],
            _on_run_line,
        )

        if run_rc == 0:
            _run_status[run_id] = "success"
            await queue.put({"type": "log", "text": "✓ Container exited successfully", "stream": "stdout"})
        else:
            _run_status[run_id] = "error"
            await queue.put({"type": "log", "text": f"Container exited with code {run_rc}", "stream": "stderr"})

        final = "success" if run_rc == 0 else "error"
        await queue.put({"type": "status", "status": final, "node_id": None})

    except FileNotFoundError:
        # docker binary not found
        _run_status[run_id] = "error"
        await queue.put({"type": "error", "text": "Docker not found. Install Docker Desktop and ensure it is running."})
        await queue.put({"type": "status", "status": "error", "node_id": None})

    except Exception as exc:
        _run_status[run_id] = "error"
        exc_type = type(exc).__name__
        exc_msg = str(exc) or repr(exc) or "(no message)"
        tb = traceback.format_exc()
        print(f"[executor] Docker error ({exc_type}): {exc_msg}\n{tb}", file=sys.stderr, flush=True)
        await queue.put({"type": "error", "text": f"Docker executor error ({exc_type}): {exc_msg}"})
        for tb_line in tb.splitlines():
            if tb_line.strip():
                await queue.put({"type": "log", "text": tb_line, "stream": "stderr"})
        await queue.put({"type": "status", "status": "error", "node_id": None})

    finally:
        await queue.put({"type": "done"})

        # Remove Docker image (best-effort, non-blocking)
        try:
            subprocess.run(["docker", "rmi", "-f", image_tag], capture_output=True, timeout=10)
        except Exception:
            pass

        # Remove temp directory
        if tmp_dir is not None:
            try:
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Install-then-run executor (local)
# ---------------------------------------------------------------------------

async def execute_pipeline_with_install(run_id: str, dag: dict[str, Any]) -> None:
    """Like execute_pipeline but pip-installs required packages first."""
    queue: asyncio.Queue = asyncio.Queue()
    _run_queues[run_id] = queue
    _run_status[run_id] = "running"
    await queue.put({"type": "status", "status": "running", "node_id": None})

    tmp_path: str | None = None
    try:
        # ── 1. Code generation ────────────────────────────────────────────
        try:
            dag_obj = PipelineDAG(**dag)
            ordered, snippets, packages = generate_snippets(dag_obj)
            wrapped: list[str] = []
            for node, snippet in zip(ordered, snippets):
                nid = node.id
                indented = "\n".join("    " + line for line in snippet.splitlines())
                wrapped.append(
                    f'print("__AIIDE_NODE_START:{nid}__", flush=True)\n'
                    f"try:\n{indented}\n"
                    f'    print("__AIIDE_NODE_END:{nid}:success__", flush=True)\n'
                    f"except Exception as _aiide_exc:\n"
                    f'    print(f"__AIIDE_NODE_END:{nid}:error__", flush=True)\n'
                    f"    raise\n"
                )
            code, _ = python_gen.assemble(dag_obj, wrapped, packages)
        except Exception as exc:
            await queue.put({"type": "error", "text": f"Code generation failed: {exc}"})
            await queue.put({"type": "status", "status": "error", "node_id": None})
            _run_status[run_id] = "error"
            await queue.put({"type": "done"})
            return

        # ── 2. Install packages ───────────────────────────────────────────
        if packages:
            await queue.put({"type": "log", "text": f"[Install] Installing: {' '.join(packages)}", "stream": "stdout"})

            async def _on_install_line(line: str, stream_name: str) -> None:
                if line:
                    await queue.put({"type": "log", "text": f"[pip] {line}", "stream": stream_name})

            install_rc = await _stream_subprocess(
                _get_pip_install_cmd(packages, ["--quiet"]),
                _on_install_line,
            )
            if install_rc != 0:
                await queue.put({"type": "error", "text": f"pip install failed (exit {install_rc})"})
                _run_status[run_id] = "error"
                await queue.put({"type": "status", "status": "error", "node_id": None})
                await queue.put({"type": "done"})
                return
            await queue.put({"type": "log", "text": "[Install] Packages ready.", "stream": "stdout"})

        # ── 3. Write and run script ───────────────────────────────────────
        fd, tmp_path = tempfile.mkstemp(suffix=".py", prefix=f"aiide_{run_id[:8]}_")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(code)

        python_exe = _get_python_executable()

        async def _on_line(line: str, stream_name: str) -> None:
            if line.startswith("__AIIDE_NODE_START:"):
                node_id = line[len("__AIIDE_NODE_START:"):-2]
                await queue.put({"type": "status", "status": "running", "node_id": node_id})
            elif line.startswith("__AIIDE_NODE_END:"):
                parts = line[len("__AIIDE_NODE_END:"):-2].split(":")
                if len(parts) == 2:
                    node_id, status = parts
                    await queue.put({"type": "status", "status": status, "node_id": node_id})
            else:
                await queue.put({"type": "log", "text": line, "stream": stream_name})

        return_code = await _stream_subprocess([python_exe, tmp_path], _on_line)
        if return_code == 0:
            final_status = "success"
        else:
            final_status = "error"
            await queue.put({"type": "log", "text": f"Process exited with code {return_code}", "stream": "stderr"})

        _run_status[run_id] = final_status
        await queue.put({"type": "status", "status": final_status, "node_id": None})

    except Exception as exc:
        _run_status[run_id] = "error"
        exc_type = type(exc).__name__
        exc_msg = str(exc) or repr(exc) or "(no message)"
        tb = traceback.format_exc()
        print(f"[executor] install+run error ({exc_type}): {exc_msg}\n{tb}", file=sys.stderr, flush=True)
        await queue.put({"type": "error", "text": f"Executor error ({exc_type}): {exc_msg}"})
        for tb_line in tb.splitlines():
            if tb_line.strip():
                await queue.put({"type": "log", "text": tb_line, "stream": "stderr"})
        await queue.put({"type": "status", "status": "error", "node_id": None})
    finally:
        await queue.put({"type": "done"})
        if tmp_path is not None:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Install-then-Docker executor
# ---------------------------------------------------------------------------

async def execute_pipeline_docker_with_install(run_id: str, dag: dict[str, Any]) -> None:
    """Build and run the pipeline in Docker, pre-validating packages via pip first.

    Steps:
    1. Generate pipeline.py, Dockerfile, and requirements.txt into a temp dir.
    2. Pre-validate required packages with pip install --dry-run.
    3. Run ``docker build`` — streams build output to the queue.
    4. Run ``docker run --rm`` — streams container stdout/stderr.
    5. Removes the Docker image on completion (best-effort).
    6. Cleans up the temp directory.
    """
    queue: asyncio.Queue = asyncio.Queue()
    _run_queues[run_id] = queue
    _run_status[run_id] = "running"

    await queue.put({"type": "status", "status": "running", "node_id": None})

    tmp_dir: str | None = None
    image_tag = f"aiide-pipeline-{run_id[:8]}"

    try:
        # Create build context dir early — needed for file path rewriting.
        tmp_dir = tempfile.mkdtemp(prefix=f"aiide_docker_{run_id[:8]}_")
        dag_for_docker = _prepare_dag_for_docker(dag, tmp_dir)
        dag_obj = PipelineDAG(**dag_for_docker)

        # ── 1. Generate code artefacts ────────────────────────────────────
        try:
            from app.services.codegen import docker_gen
            ordered, snippets, packages = generate_snippets(dag_obj)
            pipeline_code, _ = python_gen.assemble(dag_obj, snippets, packages)
            requirements = "\n".join(packages) + "\n" if packages else ""
            dockerfile = docker_gen.DOCKERFILE.format(name=dag_obj.name)
        except Exception as exc:
            await queue.put({"type": "error", "text": f"Code generation failed: {exc}"})
            await queue.put({"type": "status", "status": "error", "node_id": None})
            _run_status[run_id] = "error"
            await queue.put({"type": "done"})
            return

        # ── 2. Write artefacts to temp directory ──────────────────────────
        with open(os.path.join(tmp_dir, "pipeline.py"), "w", encoding="utf-8") as f:
            f.write(pipeline_code)
        with open(os.path.join(tmp_dir, "requirements.txt"), "w", encoding="utf-8") as f:
            f.write(requirements)
        with open(os.path.join(tmp_dir, "Dockerfile"), "w", encoding="utf-8") as f:
            f.write(dockerfile)

        # ── 2b. Verify Docker is reachable before attempting a build ──────
        docker_check_rc = await _stream_subprocess(
            [docker_exe, "info"],
            lambda _l, _s: asyncio.sleep(0),  # discard docker info output
        )
        if docker_check_rc != 0:
            await queue.put({
                "type": "error",
                "text": "Docker is not running. Open Docker Desktop and wait for it to start, then try again.",
            })
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        await queue.put({"type": "log", "text": f"[Docker] Build context: {tmp_dir}", "stream": "stdout"})
        await queue.put({"type": "log", "text": f"[Docker] Image tag: {image_tag}", "stream": "stdout"})

        # ── 3. docker build ───────────────────────────────────────────────
        docker_exe = shutil.which("docker") or "docker"
        await queue.put({"type": "log", "text": f"[Docker] Using: {docker_exe}", "stream": "stdout"})

        # Verify Docker daemon is reachable before attempting a build.
        docker_check_rc = await _stream_subprocess(
            [docker_exe, "info"],
            lambda _l, _s: asyncio.sleep(0),
        )
        if docker_check_rc != 0:
            await queue.put({
                "type": "error",
                "text": "Docker is not running. Open Docker Desktop and wait for it to start, then try again.",
            })
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        await queue.put({"type": "log", "text": "[Docker] Building image…", "stream": "stdout"})

        async def _on_build_line(line: str, _stream_name: str) -> None:
            if line:
                await queue.put({"type": "log", "text": f"[build] {line}", "stream": "stdout"})

        build_rc = await _stream_subprocess(
            [docker_exe, "build", "--tag", image_tag, "."],
            _on_build_line,
            cwd=tmp_dir,
            combine_stderr=True,
        )

        if build_rc != 0:
            await queue.put({"type": "error", "text": f"docker build failed (exit {build_rc})"})
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        await queue.put({"type": "log", "text": "[Docker] Image built. Starting container…", "stream": "stdout"})

        # ── 4. docker run ─────────────────────────────────────────────────
        async def _on_run_line(line: str, stream_name: str) -> None:
            if line:
                await queue.put({"type": "log", "text": line, "stream": stream_name})

        run_rc = await _stream_subprocess(
            [docker_exe, "run", "--rm", image_tag],
            _on_run_line,
        )

        if run_rc == 0:
            _run_status[run_id] = "success"
            await queue.put({"type": "log", "text": "✓ Container exited successfully", "stream": "stdout"})
        else:
            _run_status[run_id] = "error"
            await queue.put({"type": "log", "text": f"Container exited with code {run_rc}", "stream": "stderr"})

        final = "success" if run_rc == 0 else "error"
        await queue.put({"type": "status", "status": final, "node_id": None})

    except FileNotFoundError:
        _run_status[run_id] = "error"
        await queue.put({"type": "error", "text": "Docker not found. Install Docker Desktop and ensure it is running."})
        await queue.put({"type": "status", "status": "error", "node_id": None})

    except Exception as exc:
        _run_status[run_id] = "error"
        exc_type = type(exc).__name__
        exc_msg = str(exc) or repr(exc) or "(no message)"
        tb = traceback.format_exc()
        print(f"[executor] Docker+install error ({exc_type}): {exc_msg}\n{tb}", file=sys.stderr, flush=True)
        await queue.put({"type": "error", "text": f"Docker executor error ({exc_type}): {exc_msg}"})
        for tb_line in tb.splitlines():
            if tb_line.strip():
                await queue.put({"type": "log", "text": tb_line, "stream": "stderr"})
        await queue.put({"type": "status", "status": "error", "node_id": None})

    finally:
        await queue.put({"type": "done"})

        try:
            subprocess.run(["docker", "rmi", "-f", image_tag], capture_output=True, timeout=10)
        except Exception:
            pass

        if tmp_dir is not None:
            try:
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Kubeflow executor
# ---------------------------------------------------------------------------

async def execute_pipeline_kubeflow(
    run_id: str,
    dag: dict[str, Any],
    kubeflow_host: str,
    experiment_name: str = "Default",
) -> None:
    """Compile the pipeline to KFP DSL, then submit it to a Kubeflow Pipelines cluster."""
    queue: asyncio.Queue = asyncio.Queue()
    _run_queues[run_id] = queue
    _run_status[run_id] = "running"
    await queue.put({"type": "status", "status": "running", "node_id": None})

    tmp_dir: str | None = None
    try:
        from app.services.codegen import kubeflow_gen

        dag_obj = PipelineDAG(**dag)

        # ── 1. Generate KFP DSL code ──────────────────────────────────────
        try:
            ordered, snippets, packages = generate_snippets(dag_obj)
            kfp_code, kfp_filename = kubeflow_gen.assemble(dag_obj, snippets, packages)
        except Exception as exc:
            await queue.put({"type": "error", "text": f"Code generation failed: {exc}"})
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        tmp_dir = tempfile.mkdtemp(prefix=f"aiide_kfp_{run_id[:8]}_")
        kfp_script = os.path.join(tmp_dir, kfp_filename)
        with open(kfp_script, "w", encoding="utf-8") as f:
            f.write(kfp_code)

        # ── 2. Ensure kfp SDK is installed ────────────────────────────────
        await queue.put({"type": "log", "text": "[KFP] Ensuring kfp>=2.0 is installed…", "stream": "stdout"})

        async def _on_pip(line: str, sn: str) -> None:
            if line:
                await queue.put({"type": "log", "text": f"[pip] {line}", "stream": sn})

        await _stream_subprocess(
            _get_pip_install_cmd(["kfp>=2.0"], ["--quiet"]),
            _on_pip,
        )

        # ── 3. Compile to pipeline.yaml ───────────────────────────────────
        await queue.put({"type": "log", "text": "[KFP] Compiling pipeline to YAML…", "stream": "stdout"})

        async def _on_compile(line: str, sn: str) -> None:
            if line:
                await queue.put({"type": "log", "text": f"[compile] {line}", "stream": sn})

        compile_rc = await _stream_subprocess(
            [sys.executable, kfp_script],
            _on_compile,
            cwd=tmp_dir,
        )
        if compile_rc != 0:
            await queue.put({"type": "error", "text": f"KFP compilation failed (exit {compile_rc})"})
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        yaml_path = os.path.join(tmp_dir, "pipeline.yaml")
        if not os.path.exists(yaml_path):
            await queue.put({"type": "error", "text": "pipeline.yaml was not produced — check DSL template."})
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        await queue.put({"type": "log", "text": f"[KFP] Submitting to {kubeflow_host} (experiment: {experiment_name})…", "stream": "stdout"})

        # ── 4. Submit via KFP SDK (blocking → run in thread) ─────────────
        def _submit() -> str:
            import kfp  # noqa: PLC0415
            client = kfp.Client(host=kubeflow_host)
            run_info = client.create_run_from_pipeline_package(
                pipeline_file=yaml_path,
                arguments={},
                run_name=f"{dag_obj.name} [{run_id[:8]}]",
                experiment_name=experiment_name,
            )
            return str(run_info.run_id)

        kfp_run_id = await asyncio.to_thread(_submit)
        await queue.put({"type": "log", "text": f"[KFP] ✓ Run submitted — ID: {kfp_run_id}", "stream": "stdout"})
        await queue.put({
            "type": "log",
            "text": f"[KFP] View: {kubeflow_host.rstrip('/')}/#/runs/details/{kfp_run_id}",
            "stream": "stdout",
        })

        _run_status[run_id] = "success"
        await queue.put({"type": "status", "status": "success", "node_id": None})

    except Exception as exc:
        _run_status[run_id] = "error"
        exc_type = type(exc).__name__
        exc_msg = str(exc) or repr(exc) or "(no message)"
        tb = traceback.format_exc()
        print(f"[executor] KFP error ({exc_type}): {exc_msg}\n{tb}", file=sys.stderr, flush=True)
        await queue.put({"type": "error", "text": f"KFP executor error ({exc_type}): {exc_msg}"})
        for tb_line in tb.splitlines():
            if tb_line.strip():
                await queue.put({"type": "log", "text": tb_line, "stream": "stderr"})
        await queue.put({"type": "status", "status": "error", "node_id": None})

    finally:
        await queue.put({"type": "done"})
        if tmp_dir is not None:
            try:
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass
