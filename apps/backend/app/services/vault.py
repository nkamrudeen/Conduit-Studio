"""Secrets Vault — encrypted storage for named secret references.

Secrets are stored in  <project_folder>/.secrets.json  (AES-256 via Fernet).
If no key file exists, one is generated and stored in  <project_folder>/.vault.key.

In production you would back the key with OS key-chain or AWS KMS.
For desktop (Electron), swap the key storage with safeStorage.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

_VAULT_FILE = ".secrets.json"
_KEY_FILE   = ".vault.key"


def _fernet(vault_dir: Path):
    try:
        from cryptography.fernet import Fernet
    except ImportError:
        raise RuntimeError(
            "cryptography package is required for the secrets vault. "
            "Install with: pip install cryptography"
        )
    key_path = vault_dir / _KEY_FILE
    if key_path.exists():
        key = key_path.read_bytes()
    else:
        key = Fernet.generate_key()
        key_path.write_bytes(key)
        # Restrict permissions on Unix
        try:
            os.chmod(str(key_path), 0o600)
        except Exception:
            pass
    return Fernet(key)


def _vault_path(vault_dir: str) -> tuple[Path, Path]:
    d = Path(vault_dir).expanduser().resolve()
    d.mkdir(parents=True, exist_ok=True)
    return d, d / _VAULT_FILE


def load_secrets(vault_dir: str) -> dict[str, str]:
    """Return all decrypted secrets as {name: value}."""
    d, vf = _vault_path(vault_dir)
    if not vf.exists():
        return {}
    try:
        f = _fernet(d)
        raw = json.loads(vf.read_text(encoding="utf-8"))
        return {k: f.decrypt(v.encode()).decode() for k, v in raw.items()}
    except Exception:
        return {}


def save_secrets(vault_dir: str, secrets: dict[str, str]) -> None:
    """Encrypt and persist all secrets."""
    d, vf = _vault_path(vault_dir)
    f = _fernet(d)
    encrypted = {k: f.encrypt(v.encode()).decode() for k, v in secrets.items()}
    vf.write_text(json.dumps(encrypted, indent=2), encoding="utf-8")
    try:
        os.chmod(str(vf), 0o600)
    except Exception:
        pass


def set_secret(vault_dir: str, name: str, value: str) -> None:
    secrets = load_secrets(vault_dir)
    secrets[name] = value
    save_secrets(vault_dir, secrets)


def delete_secret(vault_dir: str, name: str) -> bool:
    secrets = load_secrets(vault_dir)
    if name not in secrets:
        return False
    del secrets[name]
    save_secrets(vault_dir, secrets)
    return True


def list_secret_names(vault_dir: str) -> list[str]:
    """Return secret names without values."""
    return list(load_secrets(vault_dir).keys())


def resolve_secrets(vault_dir: str, text: str) -> str:
    """Replace $VAR_NAME references in text with their vault values.

    Used by code generation to inject secrets as os.environ references.
    """
    secrets = load_secrets(vault_dir)
    for name, value in secrets.items():
        text = text.replace(f"${name}", value)
    return text


def to_env_references(text: str) -> str:
    """Convert $VAR_NAME tokens to os.environ['VAR_NAME'] in Python code."""
    import re
    return re.sub(r'\$([A-Z][A-Z0-9_]*)', r'os.environ["\1"]', text)
