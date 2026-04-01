"""
ConduitCraft AI MCP Server.

Exposes pipeline execution tools via the Model Context Protocol (MCP),
allowing Claude Code (or any MCP client) to install packages and run
ConduitCraft AI pipelines directly.

Usage:
  uv run python mcp_server.py            # stdio transport (Claude Code)

Add to Claude Code:
  claude mcp add conduitcraft-ai -- uv run python apps/backend/mcp_server.py
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

# Ensure the backend package is importable when run from repo root.
_BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(_BACKEND_DIR))

try:
    from fastmcp import FastMCP
except ImportError:
    print(
        "fastmcp is not installed. Run: pip install fastmcp",
        file=sys.stderr,
    )
    sys.exit(1)

mcp = FastMCP("ConduitCraft AI")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stream_subprocess_sync(cmd: list[str], cwd: str | None = None) -> tuple[int, str]:
    """Run *cmd* synchronously and return (exit_code, combined_output)."""
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=cwd,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    output, _ = proc.communicate()
    return proc.returncode, output.strip()


# ---------------------------------------------------------------------------
# Tool: install_packages
# ---------------------------------------------------------------------------

@mcp.tool()
def install_packages(packages: list[str]) -> str:
    """Install one or more Python packages into the current environment via pip.

    Args:
        packages: List of package specifiers, e.g. ["pandas", "scikit-learn>=1.4"].

    Returns:
        A summary of the installation result.
    """
    if not packages:
        return "No packages specified."
    cmd = [sys.executable, "-m", "pip", "install"] + packages
    rc, out = _stream_subprocess_sync(cmd)
    if rc == 0:
        return f"✓ Installed: {', '.join(packages)}\n{out}"
    return f"✗ pip install failed (exit {rc}):\n{out}"


# ---------------------------------------------------------------------------
# Tool: run_pipeline
# ---------------------------------------------------------------------------

@mcp.tool()
def run_pipeline(dag_json: str, install_deps: bool = True) -> str:
    """Generate Python code from a pipeline DAG and run it.

    The DAG must be a JSON string with the same schema accepted by
    POST /pipeline/run (nodes, edges, config).

    Args:
        dag_json: JSON-encoded PipelineDAG.
        install_deps: If True, pip-install required packages first.

    Returns:
        Combined stdout/stderr from the pipeline run.
    """
    from app.models.pipeline import PipelineDAG
    from app.services.codegen.engine import generate_snippets
    from app.services.codegen import python_gen

    try:
        dag_dict = json.loads(dag_json)
        dag_obj = PipelineDAG(**dag_dict)
    except Exception as exc:
        return f"Invalid DAG JSON: {exc}"

    try:
        ordered, snippets, packages = generate_snippets(dag_obj)
        code, _ = python_gen.assemble(dag_obj, snippets, packages)
    except Exception as exc:
        return f"Code generation failed: {exc}"

    output_parts: list[str] = []

    if install_deps and packages:
        output_parts.append(f"[Install] pip install {' '.join(packages)}")
        rc, out = _stream_subprocess_sync(
            [sys.executable, "-m", "pip", "install", "--quiet"] + packages
        )
        if rc != 0:
            return f"pip install failed (exit {rc}):\n{out}"
        output_parts.append("[Install] Done.")

    fd, tmp_path = tempfile.mkstemp(suffix=".py", prefix="conduit_mcp_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(code)
        rc, out = _stream_subprocess_sync([sys.executable, tmp_path])
        output_parts.append(out)
        if rc != 0:
            output_parts.append(f"Process exited with code {rc}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return "\n".join(output_parts)


# ---------------------------------------------------------------------------
# Tool: run_pipeline_docker
# ---------------------------------------------------------------------------

@mcp.tool()
def run_pipeline_docker(dag_json: str) -> str:
    """Build a Docker image from a pipeline DAG and run it.

    Requires Docker to be installed and the Docker daemon to be running.

    Args:
        dag_json: JSON-encoded PipelineDAG.

    Returns:
        Combined docker build + container output.
    """
    from app.models.pipeline import PipelineDAG
    from app.services.codegen.engine import generate_snippets
    from app.services.codegen import python_gen, docker_gen

    try:
        dag_dict = json.loads(dag_json)
        dag_obj = PipelineDAG(**dag_dict)
    except Exception as exc:
        return f"Invalid DAG JSON: {exc}"

    docker_exe = shutil.which("docker")
    if not docker_exe:
        return "Docker not found — install Docker Desktop and ensure it is running."

    try:
        ordered, snippets, packages = generate_snippets(dag_obj)
        pipeline_code, _ = python_gen.assemble(dag_obj, snippets, packages)
        requirements = "\n".join(packages) + "\n" if packages else ""
        dockerfile = docker_gen.DOCKERFILE.format(name=dag_obj.name)
    except Exception as exc:
        return f"Code generation failed: {exc}"

    tmp_dir = tempfile.mkdtemp(prefix="conduit_mcp_docker_")
    image_tag = f"conduit-mcp-{dag_obj.id[:8]}"
    output_parts: list[str] = []
    try:
        with open(os.path.join(tmp_dir, "pipeline.py"), "w") as f:
            f.write(pipeline_code)
        with open(os.path.join(tmp_dir, "requirements.txt"), "w") as f:
            f.write(requirements)
        with open(os.path.join(tmp_dir, "Dockerfile"), "w") as f:
            f.write(dockerfile)

        rc, out = _stream_subprocess_sync(
            [docker_exe, "build", "--tag", image_tag, "."], cwd=tmp_dir
        )
        output_parts.append(f"[docker build]\n{out}")
        if rc != 0:
            return "\n".join(output_parts) + f"\ndocker build failed (exit {rc})"

        rc, out = _stream_subprocess_sync([docker_exe, "run", "--rm", image_tag])
        output_parts.append(f"[docker run]\n{out}")
        if rc != 0:
            output_parts.append(f"Container exited with code {rc}")
    finally:
        try:
            subprocess.run([docker_exe, "rmi", "-f", image_tag], capture_output=True, timeout=10)
        except Exception:
            pass
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return "\n".join(output_parts)


# ---------------------------------------------------------------------------
# Tool: run_pipeline_kubeflow
# ---------------------------------------------------------------------------

@mcp.tool()
def run_pipeline_kubeflow(
    dag_json: str,
    kubeflow_host: str,
    experiment_name: str = "Default",
) -> str:
    """Compile a pipeline to KFP DSL and submit it to a Kubeflow Pipelines cluster.

    Requires the kfp package and a reachable Kubeflow host.

    Args:
        dag_json: JSON-encoded PipelineDAG.
        kubeflow_host: Full URL of the Kubeflow Pipelines API, e.g. http://localhost:8080.
        experiment_name: Name of the KFP experiment to run under.

    Returns:
        Submission result including the KFP run ID and dashboard URL.
    """
    from app.models.pipeline import PipelineDAG
    from app.services.codegen.engine import generate_snippets
    from app.services.codegen import kubeflow_gen

    try:
        dag_dict = json.loads(dag_json)
        dag_obj = PipelineDAG(**dag_dict)
    except Exception as exc:
        return f"Invalid DAG JSON: {exc}"

    try:
        ordered, snippets, packages = generate_snippets(dag_obj)
        kfp_code, kfp_filename = kubeflow_gen.assemble(dag_obj, snippets, packages)
    except Exception as exc:
        return f"Code generation failed: {exc}"

    # Ensure kfp is available
    rc, out = _stream_subprocess_sync(
        [sys.executable, "-m", "pip", "install", "--quiet", "kfp>=2.0"]
    )
    if rc != 0:
        return f"Failed to install kfp: {out}"

    tmp_dir = tempfile.mkdtemp(prefix="conduit_mcp_kfp_")
    output_parts: list[str] = []
    try:
        kfp_script = os.path.join(tmp_dir, kfp_filename)
        with open(kfp_script, "w", encoding="utf-8") as f:
            f.write(kfp_code)

        # Compile to pipeline.yaml
        rc, out = _stream_subprocess_sync([sys.executable, kfp_script], cwd=tmp_dir)
        output_parts.append(f"[compile]\n{out}")
        if rc != 0:
            return "\n".join(output_parts) + f"\nCompilation failed (exit {rc})"

        yaml_path = os.path.join(tmp_dir, "pipeline.yaml")
        if not os.path.exists(yaml_path):
            return "\n".join(output_parts) + "\npipeline.yaml not produced."

        # Submit
        import kfp  # noqa: PLC0415
        client = kfp.Client(host=kubeflow_host)
        run_info = client.create_run_from_pipeline_package(
            pipeline_file=yaml_path,
            arguments={},
            run_name=f"{dag_obj.name} [mcp]",
            experiment_name=experiment_name,
        )
        kfp_run_id = str(run_info.run_id)
        output_parts.append(f"✓ Submitted — Run ID: {kfp_run_id}")
        output_parts.append(f"View: {kubeflow_host.rstrip('/')}/#/runs/details/{kfp_run_id}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return "\n".join(output_parts)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
