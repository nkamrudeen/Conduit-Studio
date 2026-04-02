"""Project folder management — create, list files, read file content."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from app.models.project import ProjectCreateRequest, ProjectFile, ProjectFilesResponse

router = APIRouter(tags=["project"])

# Maximum directory depth to walk (prevents huge responses on deep trees)
_MAX_DEPTH = 6


@router.post("/create")
async def create_project_folder(body: ProjectCreateRequest) -> dict:
    """Create a project folder (and any missing parents) and return its canonical path."""
    try:
        p = Path(body.folder).expanduser().resolve()
        if body.create:
            p.mkdir(parents=True, exist_ok=True)
        elif not p.exists():
            raise HTTPException(status_code=404, detail=f"Folder not found: {p}")
        return {"folder": str(p)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/files", response_model=ProjectFilesResponse)
async def list_project_files(folder: str = Query(...)) -> ProjectFilesResponse:
    """Walk *folder* up to _MAX_DEPTH levels and return a flat file list."""
    root = Path(folder).expanduser().resolve()
    if not root.exists():
        raise HTTPException(status_code=404, detail=f"Folder not found: {root}")
    if not root.is_dir():
        raise HTTPException(status_code=400, detail=f"Not a directory: {root}")

    files: list[ProjectFile] = []

    def _walk(path: Path, depth: int) -> None:
        if depth > _MAX_DEPTH:
            return
        try:
            entries = sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        except PermissionError:
            return
        for entry in entries:
            try:
                stat = entry.stat()
                rel = entry.relative_to(root)
                files.append(ProjectFile(
                    path=str(rel).replace("\\", "/"),
                    abs_path=str(entry),
                    size=stat.st_size,
                    modified=stat.st_mtime,
                    is_dir=entry.is_dir(),
                ))
                if entry.is_dir():
                    _walk(entry, depth + 1)
            except (OSError, PermissionError):
                continue

    _walk(root, 1)
    return ProjectFilesResponse(folder=str(root), files=files)


class SavePipelineRequest(BaseModel):
    folder: str
    dag: dict[str, Any]


@router.post("/save-pipeline")
async def save_pipeline(body: SavePipelineRequest) -> dict:
    """Write the pipeline DAG as a .ccraft file inside *folder*."""
    try:
        folder = Path(body.folder).expanduser().resolve()
        if not folder.exists():
            folder.mkdir(parents=True, exist_ok=True)
        name = (body.dag.get("name") or "pipeline").lower().replace(" ", "_")
        dest = folder / f"{name}.ccraft"
        dest.write_text(json.dumps(body.dag, indent=2), encoding="utf-8")
        return {"saved_to": str(dest)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/file", response_class=PlainTextResponse)
async def read_project_file(path: str = Query(...)) -> str:
    """Return the text content of a single file for preview."""
    p = Path(path).expanduser().resolve()
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if not p.is_file():
        raise HTTPException(status_code=400, detail="Not a file")
    if p.stat().st_size > 2 * 1024 * 1024:  # 2 MB cap
        raise HTTPException(status_code=413, detail="File too large to preview (> 2 MB)")
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
