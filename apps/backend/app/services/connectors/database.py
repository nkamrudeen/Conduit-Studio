"""SQLAlchemy database connector (PostgreSQL, MySQL, SQLite, etc.)."""
from __future__ import annotations
import os
from typing import Any
import pandas as pd

from .base import DataConnector


class DatabaseConnector(DataConnector):
    async def test_connection(self, config: dict[str, Any]) -> bool:
        try:
            from sqlalchemy import create_engine, text
            engine = self._engine(config)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()
            return True
        except Exception:
            return False

    async def get_schema(self, config: dict[str, Any]) -> list[dict]:
        from sqlalchemy import create_engine, inspect
        engine = self._engine(config)
        try:
            inspector = inspect(engine)
            # Try to infer table from query
            if table := config.get("table"):
                cols = inspector.get_columns(table)
                return [{"name": c["name"], "dtype": str(c["type"])} for c in cols]
            # Fall back to querying first row
            df = pd.read_sql(f"SELECT * FROM ({config['query']}) q LIMIT 1", con=engine)
            return [{"name": col, "dtype": str(dtype)} for col, dtype in df.dtypes.items()]
        finally:
            engine.dispose()

    async def preview(self, config: dict[str, Any], n_rows: int = 50) -> dict:
        from sqlalchemy import create_engine
        engine = self._engine(config)
        try:
            query = config.get("query", f"SELECT * FROM {config.get('table', 'table_name')} LIMIT {n_rows}")
            df = pd.read_sql(query, con=engine)
            return {"columns": df.columns.tolist(), "rows": df.head(n_rows).to_dict("records")}
        finally:
            engine.dispose()

    def _engine(self, config: dict[str, Any]):
        from sqlalchemy import create_engine
        conn_str = os.environ[config.get("connection_string_env", "DATABASE_URL")]
        return create_engine(conn_str)
