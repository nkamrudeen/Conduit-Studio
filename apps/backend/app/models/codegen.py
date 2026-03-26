from __future__ import annotations
from typing import Literal
from pydantic import BaseModel
from app.models.pipeline import PipelineDAG

CodeGenFormat = Literal["python", "notebook", "kubeflow", "docker"]


class CodeGenRequest(BaseModel):
    dag: PipelineDAG
    format: CodeGenFormat = "python"


class CodeGenResponse(BaseModel):
    format: CodeGenFormat
    code: str
    filename: str
    requiredPackages: list[str]
    warnings: list[str]
