from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.codegen import CodeGenRequest, CodeGenResponse
from app.services.codegen.engine import generate, generate_snippets, save_format
from app.services.codegen import model_card_gen

router = APIRouter()


class ModelCardRequest(BaseModel):
    dag: dict[str, Any]
    project_folder: str = ""


@router.post("/model-card")
async def generate_model_card(req: ModelCardRequest) -> dict:
    try:
        content = model_card_gen.generate(req.dag)
        saved_path: str | None = None
        if req.project_folder:
            out = Path(req.project_folder).expanduser().resolve()
            out.mkdir(parents=True, exist_ok=True)
            p = out / "MODEL_CARD.md"
            p.write_text(content, encoding="utf-8")
            saved_path = str(p)
        return {"ok": True, "content": content, "saved_path": saved_path}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/generate", response_model=CodeGenResponse)
async def generate_code(request: CodeGenRequest) -> CodeGenResponse:
    try:
        result = generate(request.dag, request.format)

        if request.project_folder:
            # Re-run snippet generation to get ordered nodes + snippets + KFP metadata.
            ordered, snippets, packages, step_meta = await asyncio.to_thread(
                generate_snippets, request.dag, True
            )
            saved = await asyncio.to_thread(
                save_format,
                request.dag,
                request.format,
                ordered,
                snippets,
                packages,
                request.project_folder,
                request.use_package_layout,
                step_meta,
            )
            result.saved_files = saved

        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Code generation failed: {exc}") from exc
