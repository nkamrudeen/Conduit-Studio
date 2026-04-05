"""Cloud deployment router — Azure ML (AWS and GCP coming soon)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import azure_ml

router = APIRouter()


# ── Shared request shapes ─────────────────────────────────────────────────────

class AzureWorkspaceConfig(BaseModel):
    subscription_id: str
    resource_group: str
    workspace_name: str
    tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""


class AzureTestRequest(BaseModel):
    workspace: AzureWorkspaceConfig


class AzureJobRequest(BaseModel):
    workspace: AzureWorkspaceConfig
    dag: dict[str, Any]
    compute: str
    experiment_name: str = "conduitcraft-pipeline"
    environment: str = ""


class AzureJobStatusRequest(BaseModel):
    workspace: AzureWorkspaceConfig
    job_name: str


class AzureEndpointRequest(BaseModel):
    workspace: AzureWorkspaceConfig
    endpoint_name: str
    model_name: str          # e.g. "azureml:my-model:1"
    instance_type: str = "Standard_DS3_v2"
    instance_count: int = 1


class AzureListRequest(BaseModel):
    workspace: AzureWorkspaceConfig


# ── Azure routes ──────────────────────────────────────────────────────────────

@router.post("/azure/test")
async def azure_test(req: AzureTestRequest) -> dict[str, Any]:
    return await azure_ml.test_connection(req.workspace.model_dump())


@router.post("/azure/job")
async def azure_submit_job(req: AzureJobRequest) -> dict[str, Any]:
    return await azure_ml.submit_pipeline_job(
        cfg=req.workspace.model_dump(),
        dag=req.dag,
        compute=req.compute,
        experiment_name=req.experiment_name,
        environment=req.environment,
    )


@router.post("/azure/job/status")
async def azure_job_status(req: AzureJobStatusRequest) -> dict[str, Any]:
    return await azure_ml.get_job_status(
        cfg=req.workspace.model_dump(),
        job_name=req.job_name,
    )


@router.post("/azure/endpoint")
async def azure_deploy_endpoint(req: AzureEndpointRequest) -> dict[str, Any]:
    return await azure_ml.deploy_endpoint(
        cfg=req.workspace.model_dump(),
        endpoint_name=req.endpoint_name,
        model_name=req.model_name,
        instance_type=req.instance_type,
        instance_count=req.instance_count,
    )


@router.post("/azure/computes")
async def azure_list_computes(req: AzureListRequest) -> list[dict[str, Any]]:
    return await azure_ml.list_computes(req.workspace.model_dump())


@router.post("/azure/models")
async def azure_list_models(req: AzureListRequest) -> list[dict[str, Any]]:
    return await azure_ml.list_models(req.workspace.model_dump())
