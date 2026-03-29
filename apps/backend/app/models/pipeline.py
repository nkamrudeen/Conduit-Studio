from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field


class NodePosition(BaseModel):
    x: float
    y: float


class PipelineNode(BaseModel):
    id: str
    definitionId: str
    position: NodePosition
    config: dict[str, Any] = Field(default_factory=dict)
    status: Literal["idle", "running", "success", "error"] = "idle"
    error: str | None = None


class PipelineEdge(BaseModel):
    id: str
    source: str
    sourceHandle: str = ""
    target: str
    targetHandle: str = ""


class PipelineDAG(BaseModel):
    id: str
    name: str
    pipeline: Literal["ml", "llm"]
    nodes: list[PipelineNode]
    edges: list[PipelineEdge]
    createdAt: str = ""
    updatedAt: str = ""


class PipelineRunRequest(BaseModel):
    dag: PipelineDAG


class PipelineRunResponse(BaseModel):
    run_id: str
    status: Literal["pending", "running", "success", "failed"]
