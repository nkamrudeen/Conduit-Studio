"""Debug router — retrieval trace for RAG chain nodes."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import retrieval_debug

router = APIRouter()

DEFAULT_PROMPT = (
    "Answer the question based on the context.\n\n"
    "Context: {context}\n\nQuestion: {question}"
)


class RetrievalDebugRequest(BaseModel):
    vectorstore_type: str = "chroma"   # "chroma" | "faiss"
    vectorstore_config: dict[str, Any] = {}
    llm_type: str = "openai"           # "openai" | "anthropic" | "ollama"
    llm_config: dict[str, Any] = {}
    query: str
    k: int = 4
    prompt_template: str = DEFAULT_PROMPT


@router.post("/retrieval")
async def retrieval_debug_run(req: RetrievalDebugRequest) -> dict[str, Any]:
    try:
        result = await retrieval_debug.run_rag_debug(
            vectorstore_config=req.vectorstore_config,
            vectorstore_type=req.vectorstore_type,
            llm_config=req.llm_config,
            llm_type=req.llm_type,
            query=req.query,
            k=req.k,
            prompt_template=req.prompt_template,
        )
        return {"ok": True, **result}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "query": req.query, "chunks": [], "assembled_prompt": "", "response": ""}
