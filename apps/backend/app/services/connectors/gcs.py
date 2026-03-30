"""Google Cloud Storage connector."""
from __future__ import annotations
import io
from typing import Any

from .base import DataConnector


class GCSConnector(DataConnector):
    async def test_connection(self, config: dict[str, Any]) -> bool:
        try:
            from google.cloud import storage
            client = storage.Client(project=config.get("project"))
            client.get_bucket(config["bucket"])
            return True
        except Exception:
            return False

    async def get_schema(self, config: dict[str, Any]) -> list[dict]:
        df = await self.preview_df(config, n_rows=1)
        return [{"name": col, "dtype": str(dtype)} for col, dtype in df.dtypes.items()]

    async def preview(self, config: dict[str, Any], n_rows: int = 50) -> dict:
        df = self._read(config).head(n_rows)
        return {"columns": df.columns.tolist(), "rows": df.to_dict("records")}

    def _read(self, config: dict[str, Any]):
        import pandas as pd
        from google.cloud import storage
        client = storage.Client(project=config.get("project"))
        data = client.bucket(config["bucket"]).blob(config["blob"]).download_as_bytes()
        fmt = config.get("file_format", "csv")
        match fmt:
            case "parquet":
                return pd.read_parquet(io.BytesIO(data))
            case "json":
                return pd.read_json(io.BytesIO(data))
            case _:
                return pd.read_csv(io.BytesIO(data))
