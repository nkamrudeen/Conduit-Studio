"""Azure ML service — pipeline job submission and online endpoint deployment."""
from __future__ import annotations

import os
import tempfile
from typing import Any

from fastapi import HTTPException


def _get_ml_client(cfg: dict[str, str]):
    """Build an MLClient from config dict. Raises HTTPException on import/auth failure."""
    try:
        from azure.ai.ml import MLClient
        from azure.identity import ClientSecretCredential, DefaultAzureCredential
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="azure-ai-ml and azure-identity packages are required. Install with: pip install azure-ai-ml azure-identity",
        )

    subscription_id = cfg.get("subscription_id", "").strip()
    resource_group = cfg.get("resource_group", "").strip()
    workspace_name = cfg.get("workspace_name", "").strip()

    if not all([subscription_id, resource_group, workspace_name]):
        raise HTTPException(
            status_code=400,
            detail="subscription_id, resource_group, and workspace_name are required",
        )

    # Use service principal if provided, otherwise DefaultAzureCredential
    tenant_id = cfg.get("tenant_id", "").strip()
    client_id = cfg.get("client_id", "").strip()
    client_secret = cfg.get("client_secret", "").strip()

    if tenant_id and client_id and client_secret:
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
    else:
        credential = DefaultAzureCredential()

    return MLClient(
        credential=credential,
        subscription_id=subscription_id,
        resource_group_name=resource_group,
        workspace_name=workspace_name,
    )


async def test_connection(cfg: dict[str, str]) -> dict[str, Any]:
    """Test Azure ML workspace connectivity."""
    try:
        ml_client = _get_ml_client(cfg)
        ws = ml_client.workspaces.get(cfg["workspace_name"])
        return {"ok": True, "message": f"Connected to workspace '{ws.name}' in '{ws.location}'"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def submit_pipeline_job(
    cfg: dict[str, str],
    dag: dict[str, Any],
    compute: str,
    experiment_name: str,
    environment: str,
) -> dict[str, Any]:
    """
    Generate a Python pipeline script and submit it as an Azure ML Command job.
    Returns job name, id, and studio URL.
    """
    try:
        from azure.ai.ml import MLClient, command
        from azure.ai.ml.entities import Environment
        from azure.identity import ClientSecretCredential, DefaultAzureCredential
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="azure-ai-ml and azure-identity packages are required.",
        )

    # Generate pipeline Python code from DAG via local import
    try:
        from app.services.codegen.engine import CodeGenEngine
        from app.models.pipeline import PipelineDAG

        engine = CodeGenEngine()
        pipeline_obj = PipelineDAG(**dag)
        pipeline_code = engine.generate(pipeline_obj, "python")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Code generation failed: {exc}") from exc

    ml_client = _get_ml_client(cfg)

    # Write pipeline code to a temp file
    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = os.path.join(tmpdir, "pipeline.py")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(pipeline_code)

        # Build the Command job
        env_str = environment.strip() or "azureml:AzureML-sklearn-1.0-ubuntu20.04-py38-cpu:1"

        job = command(
            code=tmpdir,
            command="python pipeline.py",
            environment=env_str,
            compute=compute.strip(),
            experiment_name=experiment_name.strip() or "conduitcraft-pipeline",
            display_name=f"{dag.get('name', 'pipeline')}-run",
            description=f"Submitted via ConduitCraft AI — pipeline: {dag.get('name', 'unnamed')}",
        )

        try:
            returned_job = ml_client.jobs.create_or_update(job)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Job submission failed: {exc}") from exc

    return {
        "job_name": returned_job.name,
        "job_id": returned_job.id,
        "status": returned_job.status,
        "studio_url": returned_job.studio_url,
    }


async def get_job_status(cfg: dict[str, str], job_name: str) -> dict[str, Any]:
    """Poll the status of an Azure ML job."""
    try:
        ml_client = _get_ml_client(cfg)
        job = ml_client.jobs.get(job_name)
        return {
            "job_name": job.name,
            "status": job.status,
            "studio_url": job.studio_url,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def deploy_endpoint(
    cfg: dict[str, str],
    endpoint_name: str,
    model_name: str,
    instance_type: str,
    instance_count: int,
) -> dict[str, Any]:
    """
    Deploy a registered model to an Azure ML online managed endpoint.
    Returns endpoint name and scoring URI.
    """
    try:
        from azure.ai.ml.entities import (
            ManagedOnlineDeployment,
            ManagedOnlineEndpoint,
            Model,
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="azure-ai-ml package is required.",
        )

    if not endpoint_name.strip():
        raise HTTPException(status_code=400, detail="endpoint_name is required")
    if not model_name.strip():
        raise HTTPException(status_code=400, detail="model_name is required")

    ml_client = _get_ml_client(cfg)

    # Create or update the online endpoint
    endpoint = ManagedOnlineEndpoint(
        name=endpoint_name.strip(),
        description=f"Deployed via ConduitCraft AI",
        auth_mode="key",
    )

    try:
        ml_client.online_endpoints.begin_create_or_update(endpoint).result()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Endpoint creation failed: {exc}") from exc

    # Create a deployment under the endpoint
    deployment_name = "default"
    deployment = ManagedOnlineDeployment(
        name=deployment_name,
        endpoint_name=endpoint_name.strip(),
        model=model_name.strip(),  # e.g. "azureml:my-model:1"
        instance_type=instance_type.strip() or "Standard_DS3_v2",
        instance_count=instance_count or 1,
    )

    try:
        ml_client.online_deployments.begin_create_or_update(deployment).result()
        # Route 100% traffic to this deployment
        endpoint.traffic = {deployment_name: 100}
        ml_client.online_endpoints.begin_create_or_update(endpoint).result()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Deployment failed: {exc}") from exc

    # Fetch the scoring URI
    try:
        created = ml_client.online_endpoints.get(endpoint_name.strip())
        scoring_uri = created.scoring_uri
    except Exception:
        scoring_uri = None

    return {
        "endpoint_name": endpoint_name.strip(),
        "deployment_name": deployment_name,
        "scoring_uri": scoring_uri,
    }


async def list_computes(cfg: dict[str, str]) -> list[dict[str, Any]]:
    """List available compute targets in the workspace."""
    try:
        ml_client = _get_ml_client(cfg)
        computes = list(ml_client.compute.list())
        return [
            {
                "name": c.name,
                "type": getattr(c, "type", "unknown"),
                "state": getattr(c, "provisioning_state", "unknown"),
            }
            for c in computes
        ]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def list_models(cfg: dict[str, str]) -> list[dict[str, Any]]:
    """List registered models in the workspace."""
    try:
        ml_client = _get_ml_client(cfg)
        models = list(ml_client.models.list())
        return [
            {
                "name": m.name,
                "version": m.version,
                "id": f"azureml:{m.name}:{m.version}",
            }
            for m in models
        ]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
