"""
Playground router — live prompt testing with SSE streaming + version history.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.playground import stream_response

router = APIRouter()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class PlaygroundRunRequest(BaseModel):
    definition_id: str
    config: dict = {}
    prompt: str
    system_prompt: str = ""


class VersionSaveRequest(BaseModel):
    node_id: str
    definition_id: str
    prompt: str
    system_prompt: str = ""
    label: str = ""


# ---------------------------------------------------------------------------
# Version storage helpers (JSON file alongside project, fallback to temp dir)
# ---------------------------------------------------------------------------

def _versions_path() -> Path:
    base = os.environ.get("CONDUIT_PROJECT_FOLDER") or os.path.join(
        os.path.expanduser("~"), ".conduitcraft"
    )
    p = Path(base) / ".playground_versions.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _load_all_versions() -> dict:
    p = _versions_path()
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            pass
    return {}


def _save_all_versions(data: dict) -> None:
    _versions_path().write_text(json.dumps(data, indent=2))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/run")
async def playground_run(req: PlaygroundRunRequest):
    """Stream LLM tokens as Server-Sent Events."""
    return StreamingResponse(
        stream_response(req.definition_id, req.config, req.prompt, req.system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/versions/{node_id}")
async def get_versions(node_id: str):
    """Return all saved prompt versions for a node."""
    all_versions = _load_all_versions()
    return {"versions": all_versions.get(node_id, [])}


@router.post("/versions/{node_id}")
async def save_version(node_id: str, req: VersionSaveRequest):
    """Save a new prompt version for a node."""
    all_versions = _load_all_versions()
    versions = all_versions.get(node_id, [])
    version_num = len(versions) + 1
    versions.append({
        "version": version_num,
        "label": req.label or f"v{version_num}",
        "prompt": req.prompt,
        "system_prompt": req.system_prompt,
        "definition_id": req.definition_id,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    })
    all_versions[node_id] = versions
    _save_all_versions(all_versions)
    return {"version": version_num, "total": len(versions)}


@router.delete("/versions/{node_id}/{version_num}")
async def delete_version(node_id: str, version_num: int):
    """Delete a specific version."""
    all_versions = _load_all_versions()
    versions = all_versions.get(node_id, [])
    all_versions[node_id] = [v for v in versions if v["version"] != version_num]
    _save_all_versions(all_versions)
    return {"ok": True}
