from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from app.models.codegen import CodeGenRequest, CodeGenResponse
from app.services.codegen.engine import generate, generate_snippets, save_all

router = APIRouter()


@router.post("/generate", response_model=CodeGenResponse)
async def generate_code(request: CodeGenRequest) -> CodeGenResponse:
    try:
        result = generate(request.dag, request.format)

        if request.project_folder:
            # Re-run snippet generation (cheap) to get the ordered nodes + snippets
            # so we can call save_all without duplicating generate()'s internal work.
            ordered, snippets, packages = await asyncio.to_thread(
                generate_snippets, request.dag
            )
            saved = await asyncio.to_thread(
                save_all,
                request.dag,
                ordered,
                snippets,
                packages,
                request.project_folder,
                request.use_package_layout,
            )
            result.saved_files = saved

        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Code generation failed: {exc}") from exc
