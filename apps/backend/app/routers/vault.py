"""Secrets Vault router."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import vault

router = APIRouter()


class VaultRequest(BaseModel):
    vault_dir: str


class SetSecretRequest(BaseModel):
    vault_dir: str
    name: str
    value: str


class DeleteSecretRequest(BaseModel):
    vault_dir: str
    name: str


@router.post("/list")
def list_secrets(req: VaultRequest) -> dict:
    """Return secret names (not values)."""
    try:
        names = vault.list_secret_names(req.vault_dir)
        return {"names": names}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/set")
def set_secret(req: SetSecretRequest) -> dict:
    """Create or update a secret."""
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not req.name.replace("_", "").isalnum() or req.name[0].isdigit():
        raise HTTPException(
            status_code=400,
            detail="name must be uppercase alphanumeric + underscores, not starting with a digit (e.g. MY_API_KEY)"
        )
    try:
        vault.set_secret(req.vault_dir, req.name.upper(), req.value)
        return {"ok": True, "name": req.name.upper()}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/delete")
def delete_secret(req: DeleteSecretRequest) -> dict:
    """Delete a secret by name."""
    try:
        found = vault.delete_secret(req.vault_dir, req.name.upper())
        if not found:
            raise HTTPException(status_code=404, detail=f"Secret '{req.name}' not found")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
