"""FastAPI router for MLflow integration. Mount at prefix /mlflow."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.integrations.mlflow_client import (
    get_model_uri,
    list_experiments,
    list_registered_models,
    list_runs,
    log_run,
)

router = APIRouter(tags=["mlflow"])


# ---------------------------------------------------------------------------
# GET /experiments
# ---------------------------------------------------------------------------


@router.get("/experiments")
async def get_experiments(tracking_uri: str) -> list[dict]:
    """List all MLflow experiments for the given tracking server."""
    try:
        return list_experiments(tracking_uri)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /runs
# ---------------------------------------------------------------------------


@router.get("/runs")
async def get_runs(
    tracking_uri: str,
    experiment_id: str,
    max_results: int = 50,
) -> list[dict]:
    """List runs for an MLflow experiment."""
    try:
        return list_runs(tracking_uri, experiment_id, max_results)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /models
# ---------------------------------------------------------------------------


@router.get("/models")
async def get_models(tracking_uri: str) -> list[dict]:
    """List all registered models in the MLflow Model Registry."""
    try:
        return list_registered_models(tracking_uri)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /log
# ---------------------------------------------------------------------------


class LogRunRequest(BaseModel):
    tracking_uri: str
    experiment_name: str
    run_name: str
    params: dict = {}
    metrics: dict = {}
    tags: dict = {}


@router.post("/log")
async def log_mlflow_run(body: LogRunRequest) -> dict:
    """Create an MLflow run and log params, metrics, and tags."""
    try:
        run_id = log_run(
            tracking_uri=body.tracking_uri,
            experiment_name=body.experiment_name,
            run_name=body.run_name,
            params=body.params,
            metrics=body.metrics,
            tags=body.tags,
        )
        return {"run_id": run_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /model-uri
# ---------------------------------------------------------------------------


@router.get("/model-uri")
async def get_mlflow_model_uri(
    tracking_uri: str,
    model_name: str,
    stage: str = "Production",
) -> dict:
    """Return the MLflow model URI for a registered model at a given stage."""
    try:
        uri = get_model_uri(tracking_uri, model_name, stage)
        return {"model_uri": uri}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
