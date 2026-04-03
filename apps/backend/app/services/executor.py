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
    extra_env: dict[str, str] | None = None,
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

    # Force UTF-8 I/O so emoji / non-ASCII chars from libraries (e.g. MLflow's
    # 🏃 run URL line) don't crash with UnicodeEncodeError on Windows cp1252.
    run_env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1", **(extra_env or {})}
    stderr_opt = subprocess.STDOUT if combine_stderr else subprocess.PIPE
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=stderr_opt, cwd=cwd, env=run_env)

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

def _build_capture_code(node_id: str) -> str:
    """Return Python source that serializes node output variables and prints them.

    The generated code runs inside the try-block (after the node's snippet),
    so it has access to the variables defined by the snippet.  It:
    - Scans globals() for DataFrames, sklearn-style models, dicts, scalars
    - Skips private names and the _aiide_* internals
    - Prints a single ``__AIIDE_OUTPUT:{node_id}:{json}__`` line
    """
    nid = node_id
    return f"""\
    try:
        import json as _j, time as _t
        _dur = int((_t.time() - _aiide_t0) * 1000)
        _out = []
        _skip = set(dir(__builtins__) if isinstance(__builtins__, dict) else [])
        for _k, _v in list(globals().items()):
            if _k.startswith('_') or _k in _skip:
                continue
            try:
                _rec = {{"name": _k}}
                try:
                    import pandas as _pd
                    if isinstance(_v, _pd.DataFrame):
                        _safe = _v.head(5).copy()
                        for _c in _safe.select_dtypes(include='object').columns:
                            _safe[_c] = _safe[_c].astype(str)
                        _rec.update({{"type": "DataFrame",
                            "shape": list(_v.shape),
                            "columns": list(_v.columns.astype(str)),
                            "dtypes": {{c: str(t) for c, t in _v.dtypes.items()}},
                            "rows": _safe.fillna("").to_dict("records")}})
                        _out.append(_rec)
                        continue
                except Exception:
                    pass
                if hasattr(_v, 'predict') and hasattr(_v, 'fit'):
                    _rec.update({{"type": "Model", "className": type(_v).__name__}})
                    _out.append(_rec)
                elif isinstance(_v, dict) and all(isinstance(_kk, str) and isinstance(_vv, (int, float)) for _kk, _vv in _v.items()):
                    _rec.update({{"type": "Metrics", "value": _v}})
                    _out.append(_rec)
                elif isinstance(_v, (int, float)) and not isinstance(_v, bool):
                    _rec.update({{"type": "Number", "value": _v}})
                    _out.append(_rec)
                elif isinstance(_v, str) and len(_v) <= 1000:
                    _rec.update({{"type": "Text", "value": _v}})
                    _out.append(_rec)
            except Exception:
                pass
        _payload = _j.dumps({{"outputs": _out, "durationMs": _dur}}, default=str)
        print(f"__AIIDE_OUTPUT:{nid}:{{_payload}}__", flush=True)
    except Exception:
        pass
"""

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


def _get_docker_host_ip() -> str:
    """Return the host identifier that containers should use to reach the host.

    On Docker Desktop (Windows / Mac) containers run inside a Linux VM, so
    the conventional Linux bridge gateway (172.17.0.1) is the VM's own
    bridge — NOT the Windows/Mac host.  Docker Desktop injects
    ``host.docker.internal`` into every container's /etc/hosts pointing at
    the real host, so we return that sentinel on non-Linux platforms.

    The MLflow templates resolve ``host.docker.internal`` to an IP *inside
    the container* at runtime, which bypasses MLflow's DNS-rebinding check
    (it only rejects hostname Host: headers, not IP-based ones).

    Strategy:
    1. Non-Linux host (Docker Desktop) → return ``host.docker.internal``
       so the container resolves it correctly at runtime.
    2. Linux host → ask Docker for the bridge-network gateway (authoritative).
    3. Linux fallback → conventional bridge default ``172.17.0.1``.
    """
    import platform
    if platform.system() != "Linux":
        # Docker Desktop on Windows/Mac: containers resolve host.docker.internal
        # to the real host IP via /etc/hosts injected by Docker Desktop.
        return "host.docker.internal"

    # Linux Docker Engine: bridge gateway is the correct host-reachable IP.
    try:
        result = subprocess.run(
            [
                shutil.which("docker") or "docker",
                "network", "inspect", "bridge",
                "--format", "{{range .IPAM.Config}}{{.Gateway}}{{end}}",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        ip = result.stdout.strip()
        if ip:
            return ip
    except Exception:
        pass

    return "172.17.0.1"


def _rewrite_localhost_for_docker(dag: dict[str, Any], host_ip: str) -> dict[str, Any]:
    """Replace ``localhost`` / ``127.0.0.1`` in node config string values with
    *host_ip* so that services running on the host (MLflow, databases, etc.)
    are reachable from inside the Docker container using the IP address.

    Using an IP rather than a hostname avoids MLflow's DNS-rebinding
    protection, which rejects requests with a non-IP ``Host`` header.
    """
    import copy as _copy
    dag_copy = _copy.deepcopy(dag)
    for node in dag_copy.get("nodes", []):
        cfg = node.get("config", {})
        for key, val in cfg.items():
            if isinstance(val, str):
                cfg[key] = (
                    val
                    .replace("localhost", host_ip)
                    .replace("127.0.0.1", host_ip)
                )
    return dag_copy


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


async def execute_pipeline(run_id: str, dag: dict[str, Any], env_vars: dict[str, str] | None = None) -> None:
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
            # streamer can emit node-level status events and output previews.
            wrapped: list[str] = []
            for node, snippet in zip(ordered, snippets):
                nid = node.id
                # Indent the snippet body so it sits inside the try block.
                indented = "\n".join("    " + line for line in snippet.splitlines())
                # After a successful run, capture output variables and emit a preview.
                # _build_capture_code returns code already at 4-space indent so it
                # slots directly inside the try: block — do NOT re-indent it.
                capture = _build_capture_code(nid)
                wrapped.append(
                    f'print("__AIIDE_NODE_START:{nid}__", flush=True)\n'
                    f"_aiide_t0 = __import__('time').time()\n"
                    f"try:\n"
                    f"{indented}\n"
                    f'    print("__AIIDE_NODE_END:{nid}:success__", flush=True)\n'
                    f"{capture}"
                    f"except Exception as _aiide_exc:\n"
                    f'    import traceback as _aiide_tb\n'
                    f'    print("__AIIDE_NODE_END:{nid}:error__", flush=True)\n'
                    f'    print(f"[{nid}] error: {{_aiide_exc}}", flush=True)\n'
                    f'    _aiide_tb.print_exc()\n'
                    # Do NOT re-raise — downstream nodes that depend on this output
                    # will fail naturally with a NameError caught by their own try/except.
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
            elif line.startswith("__AIIDE_OUTPUT:"):
                # Format: __AIIDE_OUTPUT:{node_id}:{json_payload}__
                rest = line[len("__AIIDE_OUTPUT:"):-2]  # strip trailing __
                colon = rest.index(":")
                node_id = rest[:colon]
                try:
                    payload = json.loads(rest[colon + 1:])
                    await queue.put({"type": "node_output", "node_id": node_id, **payload})
                except Exception:
                    pass  # malformed payload — skip silently
            else:
                await queue.put({"type": "log", "text": line, "stream": stream_name})

        return_code = await _stream_subprocess([python_exe, tmp_path], _on_line, extra_env=env_vars or {})

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
        # Rewrite localhost → host IP so the container can reach host services.
        # Using the IP (not hostname) avoids MLflow's DNS-rebinding Host check.
        _host_ip = _get_docker_host_ip()
        await queue.put({"type": "log", "text": f"[Docker] Host gateway IP: {_host_ip} (localhost URIs rewritten)", "stream": "stdout"})
        dag_for_docker = _prepare_dag_for_docker(dag, tmp_dir)
        dag_for_docker = _rewrite_localhost_for_docker(dag_for_docker, _host_ip)
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
            [docker_exe, "run", "--rm",
             "--add-host=host.docker.internal:host-gateway",
             "-e", "MLFLOW_HTTP_REQUEST_MAX_RETRIES=0",
             "-e", "MLFLOW_HTTP_REQUEST_TIMEOUT=5",
             image_tag],
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

async def execute_pipeline_with_install(run_id: str, dag: dict[str, Any], env_vars: dict[str, str] | None = None) -> None:
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
                capture = _build_capture_code(nid)
                wrapped.append(
                    f'print("__AIIDE_NODE_START:{nid}__", flush=True)\n'
                    f"_aiide_t0 = __import__('time').time()\n"
                    f"try:\n{indented}\n"
                    f'    print("__AIIDE_NODE_END:{nid}:success__", flush=True)\n'
                    f"{capture}"
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
            elif line.startswith("__AIIDE_OUTPUT:"):
                rest = line[len("__AIIDE_OUTPUT:"):-2]
                colon = rest.index(":")
                node_id = rest[:colon]
                try:
                    payload = json.loads(rest[colon + 1:])
                    await queue.put({"type": "node_output", "node_id": node_id, **payload})
                except Exception:
                    pass
            else:
                await queue.put({"type": "log", "text": line, "stream": stream_name})

        return_code = await _stream_subprocess([python_exe, tmp_path], _on_line, extra_env=env_vars or {})
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
        _host_ip = _get_docker_host_ip()
        await queue.put({"type": "log", "text": f"[Docker] Host gateway IP: {_host_ip} (localhost URIs rewritten)", "stream": "stdout"})
        dag_for_docker = _prepare_dag_for_docker(dag, tmp_dir)
        dag_for_docker = _rewrite_localhost_for_docker(dag_for_docker, _host_ip)
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
            [docker_exe, "run", "--rm",
             "--add-host=host.docker.internal:host-gateway",
             "-e", "MLFLOW_HTTP_REQUEST_MAX_RETRIES=0",
             "-e", "MLFLOW_HTTP_REQUEST_TIMEOUT=5",
             image_tag],
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
    kubeflow_token: str = "",
    kubeflow_namespace: str = "kubeflow",
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

        # ── 4. Submit via KFP v2 REST API directly ───────────────────────
        # We bypass kfp.Client entirely because its __init__ always calls
        # get_kfp_healthz() which fails behind Istio/oauth2-proxy regardless
        # of the namespace kwarg in some SDK versions.
        def _submit() -> str:
            import json as _json  # noqa: PLC0415
            import requests  # noqa: PLC0415

            base = kubeflow_host.rstrip("/")
            clean_token = "".join(c for c in kubeflow_token.strip() if ord(c) < 256)

            session = requests.Session()
            if clean_token:
                # Parse the host to get the domain for cookie binding
                from urllib.parse import urlparse as _urlparse  # noqa: PLC0415
                _host_domain = _urlparse(kubeflow_host).hostname or "localhost"

                # Detect token type:
                # - JWT (two dots) → send as Authorization: Bearer header only
                # - Everything else (oauth2_proxy / authservice session cookie)
                #   → set as Cookie header string directly (requests.Session
                #   .cookies.set without a domain silently skips the cookie)
                is_jwt = clean_token.count(".") == 2
                if is_jwt:
                    session.headers["Authorization"] = f"Bearer {clean_token}"
                else:
                    # Send both common cookie names as a raw Cookie header so
                    # they are included regardless of domain matching rules.
                    session.headers["Cookie"] = (
                        f"oauth2_proxy_kubeflow={clean_token}; "
                        f"authservice_session={clean_token}"
                    )

            # KFP on Kind routes through /pipeline prefix with v1beta1 API
            api = f"{base}/pipeline/apis/v1beta1"

            def _check(resp: "requests.Response", label: str) -> None:
                ct = resp.headers.get("content-type", "")
                if not resp.ok or "application/json" not in ct:
                    body = resp.text[:400] if resp.text else "(empty)"
                    raise RuntimeError(
                        f"KFP {label} — HTTP {resp.status_code} ({ct})\n{body}"
                    )

            # 1. Resolve or create the experiment
            exp_resp = session.get(
                f"{api}/experiments",
                params={"resource_reference_key.type": "NAMESPACE", "resource_reference_key.id": kubeflow_namespace},
                timeout=15,
            )
            _check(exp_resp, "GET /experiments")
            experiments = exp_resp.json().get("experiments") or []
            exp_id = next(
                (e["id"] for e in experiments if e.get("name") == experiment_name),
                None,
            )
            if not exp_id:
                create_resp = session.post(
                    f"{api}/experiments",
                    json={
                        "name": experiment_name,
                        "resource_references": [
                            {"key": {"type": "NAMESPACE", "id": kubeflow_namespace}, "relationship": "OWNER"},
                        ],
                    },
                    timeout=15,
                )
                _check(create_resp, "POST /experiments")
                exp_id = create_resp.json()["id"]

            # 2. Upload the pipeline YAML (v1beta1 multipart upload)
            run_label = f"{dag_obj.name} [{run_id[:8]}]"
            with open(yaml_path, "rb") as fh:
                upload_resp = session.post(
                    f"{base}/pipeline/apis/v1beta1/pipelines/upload",
                    params={"name": run_label},
                    files={"uploadfile": (os.path.basename(yaml_path), fh, "application/yaml")},
                    timeout=30,
                )
            _check(upload_resp, "POST /pipelines/upload")
            upload_data = upload_resp.json()
            pipeline_id = upload_data["id"]
            version_id = upload_data.get("default_version", {}).get("id") or pipeline_id

            # 3. Create the run
            run_payload = {
                "name": run_label,
                "pipeline_spec": {
                    "pipeline_id": pipeline_id,
                },
                "resource_references": [
                    {"key": {"type": "EXPERIMENT", "id": exp_id}, "relationship": "OWNER"},
                    {"key": {"type": "PIPELINE_VERSION", "id": version_id}, "relationship": "CREATOR"},
                ],
            }
            run_resp = session.post(f"{api}/runs", json=run_payload, timeout=15)
            _check(run_resp, "POST /runs")
            run_data = run_resp.json()
            # v1beta1 run object: top-level key is "run" containing the run details
            run_obj = run_data.get("run") or run_data
            run_id_str = run_obj.get("id") or run_obj.get("run_id") or str(run_data)
            return run_id_str

        kfp_run_id = await asyncio.to_thread(_submit)
        await queue.put({"type": "log", "text": f"[KFP] ✓ Run submitted — ID: {kfp_run_id}", "stream": "stdout"})
        await queue.put({
            "type": "log",
            "text": f"[KFP] View: {kubeflow_host.rstrip('/')}/_/pipeline/#/runs/details/{kfp_run_id}",
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
