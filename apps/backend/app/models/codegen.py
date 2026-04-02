from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field
from app.models.pipeline import PipelineDAG

CodeGenFormat = Literal["python", "notebook", "kubeflow", "docker"]


class CodeGenRequest(BaseModel):
    dag: PipelineDAG
    format: CodeGenFormat = "python"
    # When set, generated files are written to this folder on the server.
    project_folder: str | None = None
    # Use Python package layout (src/<slug>/ with per-category modules).
    use_package_layout: bool = False


class CodeGenResponse(BaseModel):
    format: CodeGenFormat
    code: str
    filename: str
    requiredPackages: list[str]
    warnings: list[str]
    # Absolute paths of files written to the project folder (if requested).
    saved_files: list[str] = Field(default_factory=list)
