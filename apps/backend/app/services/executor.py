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
import traceback
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

        # ── 3. Launch subprocess ──────────────────────────────────────────
        # In a PyInstaller bundle sys.executable is the bundled .exe, not Python.
        # Generated pipeline scripts must run under the user's system Python.
        python_exe = _get_python_executable()
        proc = await asyncio.create_subprocess_exec(
            python_exe,
            tmp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # ── 4. Stream stdout and stderr concurrently ──────────────────────
        async def _drain(stream: asyncio.StreamReader, stream_name: str) -> None:
            while True:
                line_bytes = await stream.readline()
                if not line_bytes:
                    break
                line = line_bytes.decode("utf-8", errors="replace").rstrip("\r\n")

                # Parse per-node status markers injected during code generation
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

        await asyncio.gather(
            _drain(proc.stdout, "stdout"),  # type: ignore[arg-type]
            _drain(proc.stderr, "stderr"),  # type: ignore[arg-type]
        )

        return_code = await proc.wait()

        # ── 5. Final status ───────────────────────────────────────────────
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
        # ── 6. Sentinel — always sent so consumers exit cleanly ───────────
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
        dag_obj = PipelineDAG(**dag)

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
        tmp_dir = tempfile.mkdtemp(prefix=f"aiide_docker_{run_id[:8]}_")
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
        await queue.put({"type": "log", "text": "[Docker] Building image…", "stream": "stdout"})

        build_proc = await asyncio.create_subprocess_exec(
            docker_exe, "build", "--tag", image_tag, ".",
            cwd=tmp_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        async def _stream(stream: asyncio.StreamReader | None, label: str) -> None:
            if stream is None:
                return
            while True:
                line_bytes = await stream.readline()
                if not line_bytes:
                    break
                # Strip both \r and \n so Windows CRLF lines render cleanly
                line = line_bytes.decode("utf-8", errors="replace").rstrip("\r\n")
                if line:
                    await queue.put({"type": "log", "text": f"[{label}] {line}", "stream": "stdout"})

        await _stream(build_proc.stdout, "build")
        build_rc = await build_proc.wait()

        if build_rc != 0:
            await queue.put({"type": "error", "text": f"docker build failed (exit {build_rc})"})
            _run_status[run_id] = "error"
            await queue.put({"type": "status", "status": "error", "node_id": None})
            await queue.put({"type": "done"})
            return

        await queue.put({"type": "log", "text": "[Docker] Image built. Starting container…", "stream": "stdout"})

        # ── 4. docker run ─────────────────────────────────────────────────
        run_proc = await asyncio.create_subprocess_exec(
            docker_exe, "run", "--rm", image_tag,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await asyncio.gather(
            _stream(run_proc.stdout, "container"),  # type: ignore[arg-type]
            _stream(run_proc.stderr, "container"),  # type: ignore[arg-type]
        )
        run_rc = await run_proc.wait()

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
        # Print full traceback to server stderr for debugging
        print(f"[executor] Docker error ({exc_type}): {exc_msg}\n{tb}", file=sys.stderr, flush=True)
        # Send a clean one-line summary to the UI
        await queue.put({"type": "error", "text": f"Docker executor error ({exc_type}): {exc_msg}"})
        # Send traceback as individual log lines so they're visible in the panel
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
