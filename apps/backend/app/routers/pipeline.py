from __future__ import annotations
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models.pipeline import PipelineRunRequest, PipelineRunResponse

router = APIRouter()

# In-memory run store (replace with DB in production)
_runs: dict[str, dict] = {}


@router.post("/run", response_model=PipelineRunResponse)
async def run_pipeline(request: PipelineRunRequest) -> PipelineRunResponse:
    run_id = str(uuid.uuid4())
    _runs[run_id] = {"status": "pending", "dag": request.dag.model_dump(), "logs": []}
    # TODO: submit to executor service
    return PipelineRunResponse(run_id=run_id, status="pending")


@router.get("/{run_id}/status")
async def get_run_status(run_id: str) -> dict:
    run = _runs.get(run_id)
    if run is None:
        return {"error": "run not found"}
    return {"run_id": run_id, "status": run["status"]}


@router.websocket("/{run_id}/logs")
async def stream_logs(websocket: WebSocket, run_id: str) -> None:
    await websocket.accept()
    try:
        run = _runs.get(run_id)
        if run is None:
            await websocket.send_json({"error": "run not found"})
            await websocket.close()
            return
        for log in run.get("logs", []):
            await websocket.send_text(log)
        # Keep connection open for live tailing (executor appends to run["logs"])
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
