"""FastAPI router for Kubeflow Pipelines integration. Mount at prefix /kubeflow."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.integrations.kubeflow_client import (
    get_run_status,
    list_pipelines,
    list_runs,
    submit_run,
)

router = APIRouter(tags=["kubeflow"])


# ---------------------------------------------------------------------------
# GET /pipelines
# ---------------------------------------------------------------------------


@router.get("/pipelines")
async def get_pipelines(host: str) -> list[dict]:
    """List all Kubeflow pipelines on the given host."""
    try:
        return list_pipelines(host)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /runs
# ---------------------------------------------------------------------------


@router.get("/runs")
async def get_runs(host: str, experiment_id: str = "") -> list[dict]:
    """List Kubeflow pipeline runs, optionally filtered by experiment."""
    try:
        return list_runs(host, experiment_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /submit
# ---------------------------------------------------------------------------


class SubmitRunRequest(BaseModel):
    host: str
    pipeline_id: str
    run_name: str
    params: dict = {}


@router.post("/submit")
async def submit_pipeline_run(body: SubmitRunRequest) -> dict:
    """Submit a Kubeflow pipeline run."""
    try:
        return submit_run(
            host=body.host,
            pipeline_id=body.pipeline_id,
            run_name=body.run_name,
            params=body.params,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /runs/{run_id}
# ---------------------------------------------------------------------------


@router.get("/runs/{run_id}")
async def get_kubeflow_run_status(run_id: str, host: str) -> dict:
    """Return the current status of a specific Kubeflow pipeline run."""
    try:
        return get_run_status(host, run_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
