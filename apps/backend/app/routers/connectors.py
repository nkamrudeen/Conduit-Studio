from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_connectors() -> dict:
    """List available data source connector types."""
    return {
        "connectors": [
            {"id": "local", "label": "Local File", "status": "available"},
            {"id": "s3", "label": "AWS S3", "status": "available"},
            {"id": "azure", "label": "Azure Blob", "status": "available"},
            {"id": "gcs", "label": "Google Cloud Storage", "status": "available"},
            {"id": "postgres", "label": "PostgreSQL", "status": "available"},
        ]
    }


@router.post("/test")
async def test_connector(connector_id: str, config: dict) -> dict:
    """Test a connector configuration (stub — implement per connector)."""
    return {"connector_id": connector_id, "status": "not_implemented"}
