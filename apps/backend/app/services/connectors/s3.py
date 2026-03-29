"""AWS S3 connector."""
from __future__ import annotations
import io
import os
from typing import Any
import pandas as pd

from .base import DataConnector


class S3Connector(DataConnector):
    async def test_connection(self, config: dict[str, Any]) -> bool:
        try:
            import boto3
            s3 = self._client(config)
            s3.head_bucket(Bucket=config["bucket"])
            return True
        except Exception:
            return False

    async def get_schema(self, config: dict[str, Any]) -> list[dict]:
        df = await self.preview_df(config, n_rows=1)
        return [{"name": col, "dtype": str(dtype)} for col, dtype in df.dtypes.items()]

    async def preview(self, config: dict[str, Any], n_rows: int = 50) -> dict:
        df = self._read(config)
        df = df.head(n_rows)
        return {"columns": df.columns.tolist(), "rows": df.to_dict("records")}

    def _client(self, config: dict[str, Any]):
        import boto3
        session_kwargs: dict[str, Any] = {"region_name": config.get("aws_region", "us-east-1")}
        if profile := config.get("aws_profile"):
            session_kwargs["profile_name"] = profile
        return boto3.Session(**session_kwargs).client("s3")

    def _read(self, config: dict[str, Any]) -> pd.DataFrame:
        s3 = self._client(config)
        obj = s3.get_object(Bucket=config["bucket"], Key=config["key"])
        body = obj["Body"].read()
        fmt = config.get("file_format", "csv")
        match fmt:
            case "parquet":
                return pd.read_parquet(io.BytesIO(body))
            case "json":
                return pd.read_json(io.BytesIO(body))
            case _:
                return pd.read_csv(io.BytesIO(body))
