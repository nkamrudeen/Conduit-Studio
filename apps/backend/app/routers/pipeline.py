from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, WebSocket, WebSocketDisconnect

from app.models.pipeline import PipelineRunRequest, PipelineRunResponse, KubeflowRunRequest
from app.services import executor

router = APIRouter()


@router.post("/run-docker", response_model=PipelineRunResponse)
async def run_pipeline_docker(
    request: PipelineRunRequest,
    background_tasks: BackgroundTasks,
) -> PipelineRunResponse:
    """Build a Docker image from the pipeline DAG and run it in a container.

    Requires Docker to be installed and running on the host.
    Returns a *run_id* for log streaming via the same WebSocket endpoint.
    """
    run_id = str(uuid.uuid4())
    background_tasks.add_task(
        executor.execute_pipeline_docker,
        run_id,
        request.dag.model_dump(),
    )
    return PipelineRunResponse(run_id=run_id, status="pending")


@router.post("/run", response_model=PipelineRunResponse)
async def run_pipeline(
    request: PipelineRunRequest,
    background_tasks: BackgroundTasks,
) -> PipelineRunResponse:
    """Submit a pipeline DAG for execution.

    Returns immediately with a *run_id* that callers use to poll status or
    subscribe to the live log stream via WebSocket.
    """
    run_id = str(uuid.uuid4())
    background_tasks.add_task(
        executor.execute_pipeline,
        run_id,
        request.dag.model_dump(),
        request.env_vars,
    )
    return PipelineRunResponse(run_id=run_id, status="pending")


@router.post("/run-install", response_model=PipelineRunResponse)
async def run_pipeline_with_install(
    request: PipelineRunRequest,
    background_tasks: BackgroundTasks,
) -> PipelineRunResponse:
    """Install required packages via pip, then run the pipeline locally."""
    run_id = str(uuid.uuid4())
    background_tasks.add_task(
        executor.execute_pipeline_with_install,
        run_id,
        request.dag.model_dump(),
        request.env_vars,
    )
    return PipelineRunResponse(run_id=run_id, status="pending")


@router.post("/run-docker-install", response_model=PipelineRunResponse)
async def run_pipeline_docker_with_install(
    request: PipelineRunRequest,
    background_tasks: BackgroundTasks,
) -> PipelineRunResponse:
    """Pre-validate packages, then build and run the pipeline in Docker."""
    run_id = str(uuid.uuid4())
    background_tasks.add_task(
        executor.execute_pipeline_docker_with_install,
        run_id,
        request.dag.model_dump(),
    )
    return PipelineRunResponse(run_id=run_id, status="pending")


@router.post("/run-kubeflow", response_model=PipelineRunResponse)
async def run_pipeline_kubeflow(
    request: KubeflowRunRequest,
    background_tasks: BackgroundTasks,
) -> PipelineRunResponse:
    """Compile the pipeline to KFP DSL and submit to a Kubeflow cluster."""
    run_id = str(uuid.uuid4())
    background_tasks.add_task(
        executor.execute_pipeline_kubeflow,
        run_id,
        request.dag.model_dump(),
        request.kubeflow_host,
        request.experiment_name,
    )
    return PipelineRunResponse(run_id=run_id, status="pending")


@router.get("/{run_id}/status")
async def get_run_status(run_id: str) -> dict:
    """Return the current execution status for *run_id*.

    Possible status values: ``pending``, ``running``, ``success``, ``error``,
    ``not_found``.
    """
    status = executor.get_status(run_id)
    return {"run_id": run_id, "status": status or "not_found"}


@router.websocket("/{run_id}/logs")
async def stream_logs(websocket: WebSocket, run_id: str) -> None:
    """WebSocket endpoint that streams execution logs for a pipeline run.

    The server sends JSON messages with the following shapes:

    * ``{"type": "log",    "text": "...", "stream": "stdout|stderr"}``
    * ``{"type": "status", "status": "running|success|error", "node_id": null}``
    * ``{"type": "error",  "text": "..."}``
    * ``{"type": "done"}``  — final sentinel; connection is closed after this.

    The client does **not** need to send any messages; the handler ignores
    incoming frames and closes the socket after the sentinel arrives or on
    timeout / disconnect.
    """
    await websocket.accept()
    try:
        # Wait up to 5 s for the executor to register its queue (the background
        # task may not have started yet when the client connects immediately
        # after POST /run).
        queue: asyncio.Queue | None = None
        for _ in range(50):
            queue = executor.get_queue(run_id)
            if queue is not None:
                break
            await asyncio.sleep(0.1)

        if queue is None:
            await websocket.send_json({"type": "error", "text": "Run not found"})
            return

        while True:
            msg = await asyncio.wait_for(queue.get(), timeout=60.0)
            await websocket.send_json(msg)
            if msg.get("type") == "done":
                break

    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        await websocket.send_json(
            {"type": "error", "text": "Log stream timed out waiting for next message"}
        )
    finally:
        await websocket.close()
