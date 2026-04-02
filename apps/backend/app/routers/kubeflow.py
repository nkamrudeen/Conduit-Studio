"""FastAPI router for Kubeflow Pipelines integration. Mount at prefix /kubeflow."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.integrations.kubeflow_client import (
    get_run_status,
    list_pipelines,
    list_runs,
    submit_run,
)

router = APIRouter(tags=["kubeflow"])


@router.get("/pipelines")
async def get_pipelines(host: str, token: str = "") -> list[dict]:
    """List all Kubeflow pipelines on the given host."""
    try:
        return await asyncio.to_thread(list_pipelines, host, token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/runs")
async def get_runs(host: str, experiment_id: str = "", token: str = "") -> list[dict]:
    """List Kubeflow pipeline runs, optionally filtered by experiment."""
    try:
        return await asyncio.to_thread(list_runs, host, experiment_id, token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


class SubmitRunRequest(BaseModel):
    host: str
    pipeline_id: str
    run_name: str
    params: dict = {}
    token: str = ""


@router.post("/submit")
async def submit_pipeline_run(body: SubmitRunRequest) -> dict:
    """Submit a Kubeflow pipeline run."""
    try:
        return await asyncio.to_thread(
            submit_run,
            host=body.host,
            pipeline_id=body.pipeline_id,
            run_name=body.run_name,
            params=body.params,
            token=body.token,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/runs/{run_id}")
async def get_kubeflow_run_status(run_id: str, host: str, token: str = "") -> dict:
    """Return the current status of a specific Kubeflow pipeline run."""
    try:
        return await asyncio.to_thread(get_run_status, host, run_id, token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
