from fastapi import APIRouter, HTTPException
from app.models.codegen import CodeGenRequest, CodeGenResponse
from app.services.codegen.engine import generate

router = APIRouter()


@router.post("/generate", response_model=CodeGenResponse)
async def generate_code(request: CodeGenRequest) -> CodeGenResponse:
    try:
        return generate(request.dag, request.format)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Code generation failed: {exc}") from exc
