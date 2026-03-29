"""HuggingFace Hub integration client — imports huggingface_hub lazily inside each function."""

from __future__ import annotations


def _get_hub():
    try:
        import huggingface_hub  # noqa: PLC0415
        return huggingface_hub
    except ImportError as exc:
        raise ImportError(
            "huggingface_hub is not installed. Install it with: pip install huggingface-hub"
        ) from exc


def search_models(
    query: str,
    task: str = "",
    limit: int = 20,
) -> list[dict]:
    """Search HuggingFace Hub models and return key metadata."""
    hub = _get_hub()
    kwargs: dict = {"search": query, "limit": limit}
    if task:
        kwargs["task"] = task
    models = hub.list_models(**kwargs)
    results = []
    for m in models:
        results.append(
            {
                "modelId": m.modelId,
                "downloads": getattr(m, "downloads", None),
                "likes": getattr(m, "likes", None),
                "tags": list(m.tags) if m.tags else [],
                "pipeline_tag": getattr(m, "pipeline_tag", None),
            }
        )
    return results


def search_datasets(query: str, limit: int = 20) -> list[dict]:
    """Search HuggingFace Hub datasets and return key metadata."""
    hub = _get_hub()
    datasets = hub.list_datasets(search=query, limit=limit)
    results = []
    for d in datasets:
        results.append(
            {
                "id": d.id,
                "downloads": getattr(d, "downloads", None),
                "likes": getattr(d, "likes", None),
                "tags": list(d.tags) if d.tags else [],
            }
        )
    return results


def get_model_info(model_id: str, token: str = "") -> dict:
    """Fetch detailed info for a specific model."""
    hub = _get_hub()
    kwargs: dict = {"repo_id": model_id}
    if token:
        kwargs["token"] = token
    info = hub.model_info(**kwargs)
    return {
        "modelId": info.modelId,
        "pipeline_tag": getattr(info, "pipeline_tag", None),
        "tags": list(info.tags) if info.tags else [],
        "downloads": getattr(info, "downloads", None),
        "likes": getattr(info, "likes", None),
        "sha": getattr(info, "sha", None),
        "private": getattr(info, "private", None),
        "library_name": getattr(info, "library_name", None),
    }


def push_model(repo_id: str, local_dir: str, token: str) -> str:
    """Upload a local model directory to HuggingFace Hub and return the repo URL."""
    hub = _get_hub()
    hub.create_repo(repo_id=repo_id, token=token, exist_ok=True)
    hub.upload_folder(
        repo_id=repo_id,
        folder_path=local_dir,
        token=token,
    )
    return f"https://huggingface.co/{repo_id}"


def download_model(
    model_id: str,
    token: str = "",
    cache_dir: str = "",
) -> str:
    """Download a model snapshot from HuggingFace Hub and return the local path."""
    hub = _get_hub()
    kwargs: dict = {"repo_id": model_id}
    if token:
        kwargs["token"] = token
    if cache_dir:
        kwargs["cache_dir"] = cache_dir
    local_path = hub.snapshot_download(**kwargs)
    return local_path
