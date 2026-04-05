"""Pipeline history router — snapshot save, list, diff."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import pipeline_history

router = APIRouter()


class SaveSnapshotRequest(BaseModel):
    project_dir: str
    dag: dict[str, Any]
    label: str = ""


class ListSnapshotsRequest(BaseModel):
    project_dir: str
    pipeline_id: str


class GetSnapshotRequest(BaseModel):
    project_dir: str
    snapshot_id: int


class DiffRequest(BaseModel):
    project_dir: str
    snapshot_a_id: int
    snapshot_b_id: int


@router.post("/save")
def save_snapshot(req: SaveSnapshotRequest) -> dict:
    try:
        snap_id = pipeline_history.save_snapshot(req.project_dir, req.dag, req.label)
        return {"ok": True, "snapshot_id": snap_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/list")
def list_snapshots(req: ListSnapshotsRequest) -> list[dict]:
    try:
        return pipeline_history.list_snapshots(req.project_dir, req.pipeline_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/get")
def get_snapshot(req: GetSnapshotRequest) -> dict:
    try:
        snap = pipeline_history.get_snapshot(req.project_dir, req.snapshot_id)
        if snap is None:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        return snap
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/diff")
def diff_snapshots(req: DiffRequest) -> dict:
    try:
        return pipeline_history.diff_snapshots(req.project_dir, req.snapshot_a_id, req.snapshot_b_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
