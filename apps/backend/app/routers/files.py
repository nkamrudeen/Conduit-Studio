"""File upload service.

Lets users upload local CSV / Parquet (or any) data files through the web UI
so that pipeline nodes can reference them by a stable server-side path.

Routes
------
POST   /files/upload          — upload a file, returns file_id + server_path
GET    /files/                 — list uploaded files
DELETE /files/{file_id}       — delete an uploaded file
"""
from __future__ import annotations

import shutil
import sys
import uuid
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi import File as FastAPIFile

router = APIRouter(tags=["files"])

# ---------------------------------------------------------------------------
# Uploads directory
# ---------------------------------------------------------------------------
# When frozen by PyInstaller, __file__ resolves inside the read-only MEIPASS
# temp dir.  Use the directory that contains the executable instead so we
# always write to a user-writable location.
if getattr(sys, 'frozen', False):
    UPLOADS_DIR = Path(sys.executable).parent / "uploads"
else:
    UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _find_upload(file_id: str) -> Path | None:
    """Return the Path for *file_id*, or None if not found."""
    for f in UPLOADS_DIR.iterdir():
        if f.is_file() and f.name.startswith(file_id + "_"):
            return f
    return None


# ---------------------------------------------------------------------------
# POST /upload
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    project_folder: str | None = Form(None),
) -> dict:
    """Upload a data file.

    When *project_folder* is provided the file is stored inside
    ``{project_folder}/data/`` so it lives alongside generated code.
    Otherwise it falls back to the global uploads directory.

    Returns ``file_id``, ``filename``, ``server_path``, and ``size``.
    """
    safe_name = Path(file.filename or "upload").name

    if project_folder:
        data_dir = Path(project_folder).expanduser().resolve() / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        dest = data_dir / safe_name
        file_id = safe_name  # stable ID == filename when in project folder
    else:
        file_id = str(uuid.uuid4())
        dest = UPLOADS_DIR / f"{file_id}_{safe_name}"

    with dest.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return {
        "file_id": file_id,
        "filename": safe_name,
        "server_path": str(dest),
        "size": dest.stat().st_size,
    }


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@router.get("/")
async def list_files() -> list[dict]:
    """List all uploaded files."""
    result = []
    for f in sorted(UPLOADS_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not f.is_file():
            continue
        parts = f.name.split("_", 1)
        result.append({
            "file_id": parts[0],
            "filename": parts[1] if len(parts) == 2 else f.name,
            "server_path": str(f),
            "size": f.stat().st_size,
        })
    return result


# ---------------------------------------------------------------------------
# DELETE /{file_id}
# ---------------------------------------------------------------------------

@router.delete("/{file_id}")
async def delete_file(file_id: str) -> dict:
    """Delete an uploaded file by its file_id."""
    path = _find_upload(file_id)
    if path is None:
        raise HTTPException(status_code=404, detail="File not found")
    path.unlink()
    return {"deleted": True, "file_id": file_id}
