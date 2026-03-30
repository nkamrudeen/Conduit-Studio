from __future__ import annotations
from pydantic import BaseModel


class ProjectCreateRequest(BaseModel):
    folder: str
    create: bool = True  # create if it doesn't exist


class ProjectFile(BaseModel):
    path: str       # relative to project_folder
    abs_path: str
    size: int
    modified: float
    is_dir: bool


class ProjectFilesResponse(BaseModel):
    folder: str
    files: list[ProjectFile]
