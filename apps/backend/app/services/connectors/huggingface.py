"""HuggingFace Datasets connector — loads datasets from the Hub or local cache."""
from __future__ import annotations

import asyncio
from typing import Any

from .base import DataConnector


class HuggingFaceConnector(DataConnector):
    """Connector for HuggingFace Hub datasets.

    Config keys used:
      dataset_name  — HuggingFace dataset id, e.g. "imdb" or "csv" for local
      split         — dataset split to load (default: "train")
      token         — optional HF access token for gated datasets
    """

    async def test_connection(self, config: dict[str, Any]) -> bool:
        name = config.get("dataset_name", "")
        if not name:
            return False
        token = config.get("token") or config.get("hf_token") or ""
        try:
            await asyncio.to_thread(self._dataset_info, name, token)
            return True
        except Exception:
            return False

    async def get_schema(self, config: dict[str, Any]) -> list[dict]:
        ds = await self._load(config, n_rows=1)
        return [{"name": col, "dtype": str(dtype)} for col, dtype in ds.dtypes.items()]

    async def preview(self, config: dict[str, Any], n_rows: int = 50) -> dict:
        df = await self._load(config, n_rows=n_rows)
        return {"columns": df.columns.tolist(), "rows": df.to_dict("records")}

    # ── internals ────────────────────────────────────────────────────────────

    @staticmethod
    def _dataset_info(name: str, token: str) -> None:
        try:
            from huggingface_hub import dataset_info  # noqa: PLC0415
        except ImportError as exc:
            raise ImportError(
                "huggingface_hub is not installed. Run: pip install huggingface-hub"
            ) from exc
        kwargs: dict = {"repo_id": name}
        if token:
            kwargs["token"] = token
        dataset_info(**kwargs)

    async def _load(self, config: dict[str, Any], n_rows: int):
        import pandas as pd  # noqa: PLC0415
        name = config.get("dataset_name", "")
        split = config.get("split", "train") or "train"
        token = config.get("token") or config.get("hf_token") or ""
        if not name:
            raise ValueError("dataset_name is required")

        def _do_load():
            try:
                from datasets import load_dataset  # noqa: PLC0415
            except ImportError as exc:
                raise ImportError(
                    "The 'datasets' package is required for HuggingFace data preview. "
                    "Install it with: pip install datasets"
                ) from exc
            kwargs: dict = {"path": name, "split": split, "streaming": True}
            if token:
                kwargs["token"] = token
            ds = load_dataset(**kwargs)
            rows = list(ds.take(n_rows))
            return pd.DataFrame(rows)

        return await asyncio.to_thread(_do_load)
