"""Lightweight connectivity test endpoints for each integration.

GET /integrations/test/mlflow?tracking_uri=...
GET /integrations/test/kubeflow?host=...&token=...
GET /integrations/test/huggingface?token=...
GET /integrations/test/openai?api_key=...&base_url=...
GET /integrations/test/anthropic?api_key=...
GET /integrations/test/s3?aws_access_key_id=...&aws_secret_access_key=...&aws_region=...

All return {"ok": true, "message": "..."} or raise HTTP 400 with detail.
"""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["integrations"])


# ── MLflow ────────────────────────────────────────────────────────────────────

@router.get("/test/mlflow")
async def test_mlflow(tracking_uri: str = "http://localhost:5000") -> dict:
    def _check():
        try:
            import mlflow  # noqa: PLC0415
            mlflow.set_tracking_uri(tracking_uri)
            client = mlflow.tracking.MlflowClient()
            client.search_experiments()
            return "Connected to MLflow"
        except Exception as exc:
            raise ConnectionError(str(exc)) from exc

    try:
        msg = await asyncio.to_thread(_check)
        return {"ok": True, "message": msg}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── Kubeflow ──────────────────────────────────────────────────────────────────

@router.get("/test/kubeflow")
async def test_kubeflow(host: str = "http://localhost:8080", token: str = "") -> dict:
    from app.services.integrations.kubeflow_client import list_pipelines  # noqa: PLC0415
    try:
        await asyncio.to_thread(list_pipelines, host, token)
        return {"ok": True, "message": f"Connected to Kubeflow at {host}"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── HuggingFace Hub ───────────────────────────────────────────────────────────

@router.get("/test/huggingface")
async def test_huggingface(token: str = "") -> dict:
    def _check():
        try:
            from huggingface_hub import whoami  # noqa: PLC0415
            info = whoami(token=token or None)
            return f"Connected as {info.get('name', 'unknown')}"
        except Exception as exc:
            raise ConnectionError(str(exc)) from exc

    try:
        msg = await asyncio.to_thread(_check)
        return {"ok": True, "message": msg}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── OpenAI ────────────────────────────────────────────────────────────────────

@router.get("/test/openai")
async def test_openai(api_key: str = "", base_url: str = "") -> dict:
    def _check():
        try:
            from openai import OpenAI  # noqa: PLC0415
            kwargs: dict = {"api_key": api_key or None}
            if base_url:
                kwargs["base_url"] = base_url
            client = OpenAI(**kwargs)
            models = client.models.list()
            count = len(list(models))
            return f"Connected — {count} models available"
        except Exception as exc:
            raise ConnectionError(str(exc)) from exc

    try:
        msg = await asyncio.to_thread(_check)
        return {"ok": True, "message": msg}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── Anthropic ─────────────────────────────────────────────────────────────────

@router.get("/test/anthropic")
async def test_anthropic(api_key: str = "") -> dict:
    def _check():
        try:
            import anthropic  # noqa: PLC0415
            client = anthropic.Anthropic(api_key=api_key or None)
            # Cheapest possible call: count tokens on an empty string
            client.messages.count_tokens(
                model="claude-haiku-4-5-20251001",
                messages=[{"role": "user", "content": "hi"}],
            )
            return "Connected to Anthropic API"
        except Exception as exc:
            raise ConnectionError(str(exc)) from exc

    try:
        msg = await asyncio.to_thread(_check)
        return {"ok": True, "message": msg}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── AWS S3 ────────────────────────────────────────────────────────────────────

@router.get("/test/s3")
async def test_s3(
    aws_access_key_id: str = "",
    aws_secret_access_key: str = "",
    aws_region: str = "us-east-1",
    default_bucket: str = "",
) -> dict:
    def _check():
        try:
            import boto3  # noqa: PLC0415
            kwargs: dict = {"region_name": aws_region}
            if aws_access_key_id:
                kwargs["aws_access_key_id"] = aws_access_key_id
            if aws_secret_access_key:
                kwargs["aws_secret_access_key"] = aws_secret_access_key
            s3 = boto3.client("s3", **kwargs)
            if default_bucket:
                s3.head_bucket(Bucket=default_bucket)
                return f"Connected — bucket '{default_bucket}' is accessible"
            else:
                buckets = s3.list_buckets().get("Buckets", [])
                return f"Connected — {len(buckets)} bucket(s) visible"
        except Exception as exc:
            raise ConnectionError(str(exc)) from exc

    try:
        msg = await asyncio.to_thread(_check)
        return {"ok": True, "message": msg}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
