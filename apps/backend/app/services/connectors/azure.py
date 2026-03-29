"""Azure Blob Storage connector."""
from __future__ import annotations
import io
import os
from typing import Any
import pandas as pd

from .base import DataConnector


class AzureConnector(DataConnector):
    async def test_connection(self, config: dict[str, Any]) -> bool:
        try:
            from azure.storage.blob import BlobServiceClient
            client = self._client(config)
            client.get_container_client(config["container"]).get_container_properties()
            return True
        except Exception:
            return False

    async def get_schema(self, config: dict[str, Any]) -> list[dict]:
        df = await self.preview_df(config, n_rows=1)
        return [{"name": col, "dtype": str(dtype)} for col, dtype in df.dtypes.items()]

    async def preview(self, config: dict[str, Any], n_rows: int = 50) -> dict:
        df = self._read(config).head(n_rows)
        return {"columns": df.columns.tolist(), "rows": df.to_dict("records")}

    def _client(self, config: dict[str, Any]):
        from azure.storage.blob import BlobServiceClient
        conn_str = os.environ[config.get("connection_string_env", "AZURE_STORAGE_CONNECTION_STRING")]
        return BlobServiceClient.from_connection_string(conn_str)

    def _read(self, config: dict[str, Any]) -> pd.DataFrame:
        client = self._client(config)
        data = client.get_container_client(config["container"]).download_blob(config["blob_name"]).readall()
        fmt = config.get("file_format", "csv")
        match fmt:
            case "parquet":
                return pd.read_parquet(io.BytesIO(data))
            case "json":
                return pd.read_json(io.BytesIO(data))
            case _:
                return pd.read_csv(io.BytesIO(data))
