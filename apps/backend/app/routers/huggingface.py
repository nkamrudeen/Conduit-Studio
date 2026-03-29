"""FastAPI router for HuggingFace Hub integration. Mount at prefix /huggingface."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.integrations.huggingface_client import (
    download_model,
    get_model_info,
    push_model,
    search_datasets,
    search_models,
)

router = APIRouter(tags=["huggingface"])


# ---------------------------------------------------------------------------
# GET /models
# ---------------------------------------------------------------------------


@router.get("/models")
async def get_models(
    query: str,
    task: str = "",
    limit: int = 20,
) -> list[dict]:
    """Search HuggingFace Hub models."""
    try:
        return search_models(query, task, limit)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /datasets
# ---------------------------------------------------------------------------


@router.get("/datasets")
async def get_datasets(query: str, limit: int = 20) -> list[dict]:
    """Search HuggingFace Hub datasets."""
    try:
        return search_datasets(query, limit)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /models/{model_id}
# ---------------------------------------------------------------------------


@router.get("/models/{model_id:path}")
async def get_model(model_id: str, token: str = "") -> dict:
    """Fetch detailed information for a specific HuggingFace model."""
    try:
        return get_model_info(model_id, token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /push
# ---------------------------------------------------------------------------


class PushModelRequest(BaseModel):
    repo_id: str
    local_dir: str
    token: str


@router.post("/push")
async def push_hf_model(body: PushModelRequest) -> dict:
    """Upload a local model directory to HuggingFace Hub."""
    try:
        url = push_model(
            repo_id=body.repo_id,
            local_dir=body.local_dir,
            token=body.token,
        )
        return {"repo_url": url}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /download
# ---------------------------------------------------------------------------


class DownloadModelRequest(BaseModel):
    model_id: str
    token: str = ""
    cache_dir: str = ""


@router.post("/download")
async def download_hf_model(body: DownloadModelRequest) -> dict:
    """Download a model snapshot from HuggingFace Hub."""
    try:
        local_path = download_model(
            model_id=body.model_id,
            token=body.token,
            cache_dir=body.cache_dir,
        )
        return {"local_path": local_path}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
