"""Local filesystem connector — CSV, Parquet, JSON."""
from __future__ import annotations
from pathlib import Path
from typing import Any

from .base import DataConnector


class LocalConnector(DataConnector):
    async def test_connection(self, config: dict[str, Any]) -> bool:
        path = config.get("file_path", "")
        if not path:
            return False
        return Path(path).exists()

    async def get_schema(self, config: dict[str, Any]) -> list[dict]:
        df = self._read(config, n_rows=0)
        return [{"name": col, "dtype": str(dtype)} for col, dtype in df.dtypes.items()]

    async def preview(self, config: dict[str, Any], n_rows: int = 50) -> dict:
        df = self._read(config, n_rows=n_rows)
        return {"columns": df.columns.tolist(), "rows": df.to_dict("records")}

    def _read(self, config: dict[str, Any], n_rows: int):
        import pandas as pd
        path = Path(config["file_path"])
        nrows = n_rows if n_rows > 0 else None
        match path.suffix.lower():
            case ".csv":
                return pd.read_csv(
                    path,
                    sep=config.get("separator", ","),
                    encoding=config.get("encoding", "utf-8"),
                    nrows=nrows,
                )
            case ".parquet":
                df = pd.read_parquet(path)
                return df.head(nrows) if nrows else df
            case ".json" | ".jsonl":
                df = pd.read_json(path, lines=path.suffix == ".jsonl")
                return df.head(nrows) if nrows else df
            case _:
                raise ValueError(f"Unsupported file format: {path.suffix}")
