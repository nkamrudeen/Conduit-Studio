from __future__ import annotations
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.connectors import CONNECTORS

router = APIRouter()


class ConnectorRequest(BaseModel):
    connector_id: str
    config: dict[str, Any]


@router.get("/")
async def list_connectors() -> dict:
    return {
        "connectors": [
            {"id": "local", "label": "Local File", "formats": ["csv", "parquet", "json"]},
            {"id": "s3", "label": "AWS S3", "formats": ["csv", "parquet", "json"]},
            {"id": "azure", "label": "Azure Blob Storage", "formats": ["csv", "parquet", "json"]},
            {"id": "gcs", "label": "Google Cloud Storage", "formats": ["csv", "parquet", "json"]},
            {"id": "postgres", "label": "PostgreSQL", "formats": ["sql"]},
            {"id": "database", "label": "Generic SQL (SQLAlchemy)", "formats": ["sql"]},
        ]
    }


@router.post("/test")
async def test_connector(req: ConnectorRequest) -> dict:
    connector = CONNECTORS.get(req.connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {req.connector_id}")
    ok = await connector.test_connection(req.config)
    return {"connector_id": req.connector_id, "success": ok}


@router.post("/schema")
async def get_schema(req: ConnectorRequest) -> dict:
    connector = CONNECTORS.get(req.connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {req.connector_id}")
    try:
        schema = await connector.get_schema(req.config)
        return {"columns": schema}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/preview")
async def preview_data(req: ConnectorRequest, n_rows: int = 50) -> dict:
    connector = CONNECTORS.get(req.connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {req.connector_id}")
    try:
        return await connector.preview(req.config, n_rows=n_rows)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
