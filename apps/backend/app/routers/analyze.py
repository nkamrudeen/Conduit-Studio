"""Pre-run pipeline analysis: package conflicts + cost estimation."""
from __future__ import annotations

from fastapi import APIRouter

from app.models.pipeline import PipelineDAG
from app.services import analyzer

router = APIRouter(tags=["analyze"])


@router.post("/pipeline")
async def analyze_pipeline(dag: PipelineDAG) -> dict:
    """Return package conflicts, cost estimates, and size warnings for a pipeline DAG."""
    return analyzer.analyze(dag.model_dump())
