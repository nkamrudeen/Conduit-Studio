"""Abstract base class for all data connectors."""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any
import pandas as pd


class DataConnector(ABC):
    """All connectors must implement preview, schema, and read."""

    @abstractmethod
    async def test_connection(self, config: dict[str, Any]) -> bool:
        """Return True if the connection is reachable."""

    @abstractmethod
    async def get_schema(self, config: dict[str, Any]) -> list[dict]:
        """Return column names + dtypes: [{"name": str, "dtype": str}]."""

    @abstractmethod
    async def preview(self, config: dict[str, Any], n_rows: int = 50) -> dict:
        """Return first n_rows as a JSON-serialisable dict."""

    async def preview_df(self, config: dict[str, Any], n_rows: int = 50) -> pd.DataFrame:
        result = await self.preview(config, n_rows)
        return pd.DataFrame(result["rows"], columns=result["columns"])
