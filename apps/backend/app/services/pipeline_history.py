"""Pipeline snapshot history — SQLite-backed store.

Auto-save: the frontend POST /history/save every 30s + on manual save.
Snapshots are kept for 7 days (configurable) and capped at 200 per pipeline.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

_MAX_SNAPSHOTS = 200
_RETENTION_DAYS = 7
_DB_FILE = ".pipeline_history.db"


def _connect(vault_dir: str) -> sqlite3.Connection:
    db_path = Path(vault_dir).expanduser().resolve() / _DB_FILE
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            pipeline_id TEXT NOT NULL,
            label     TEXT NOT NULL DEFAULT '',
            dag_json  TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    return conn


def save_snapshot(project_dir: str, dag: dict[str, Any], label: str = "") -> int:
    conn = _connect(project_dir)
    pipeline_id = dag.get("id", "unknown")
    now = datetime.utcnow().isoformat()
    cur = conn.execute(
        "INSERT INTO snapshots (pipeline_id, label, dag_json, created_at) VALUES (?, ?, ?, ?)",
        (pipeline_id, label, json.dumps(dag), now),
    )
    snap_id = cur.lastrowid
    conn.commit()
    _prune(conn, pipeline_id)
    conn.close()
    return snap_id


def _prune(conn: sqlite3.Connection, pipeline_id: str) -> None:
    cutoff = (datetime.utcnow() - timedelta(days=_RETENTION_DAYS)).isoformat()
    conn.execute(
        "DELETE FROM snapshots WHERE pipeline_id = ? AND created_at < ?",
        (pipeline_id, cutoff),
    )
    # Keep only the most recent MAX_SNAPSHOTS
    conn.execute(
        """
        DELETE FROM snapshots
        WHERE pipeline_id = ?
          AND id NOT IN (
              SELECT id FROM snapshots WHERE pipeline_id = ?
              ORDER BY id DESC LIMIT ?
          )
        """,
        (pipeline_id, pipeline_id, _MAX_SNAPSHOTS),
    )
    conn.commit()


def list_snapshots(project_dir: str, pipeline_id: str) -> list[dict[str, Any]]:
    conn = _connect(project_dir)
    rows = conn.execute(
        """
        SELECT id, pipeline_id, label, created_at,
               json_array_length(json_extract(dag_json, '$.nodes')) AS node_count
        FROM snapshots WHERE pipeline_id = ?
        ORDER BY id DESC LIMIT 100
        """,
        (pipeline_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_snapshot(project_dir: str, snapshot_id: int) -> dict[str, Any] | None:
    conn = _connect(project_dir)
    row = conn.execute(
        "SELECT id, pipeline_id, label, created_at, dag_json FROM snapshots WHERE id = ?",
        (snapshot_id,),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    d = dict(row)
    d["dag"] = json.loads(d.pop("dag_json"))
    return d


def diff_snapshots(
    project_dir: str, snap_a_id: int, snap_b_id: int
) -> dict[str, Any]:
    """Compute a structural diff between two snapshots.

    Returns:
        {
            added:   [node definitions in B but not A],
            removed: [node definitions in A but not B],
            changed: [{node_id, def_id, config_a, config_b, config_diff}],
        }
    """
    a = get_snapshot(project_dir, snap_a_id)
    b = get_snapshot(project_dir, snap_b_id)
    if a is None or b is None:
        return {"error": "snapshot not found", "added": [], "removed": [], "changed": []}

    nodes_a = {n["id"]: n for n in a["dag"].get("nodes", [])}
    nodes_b = {n["id"]: n for n in b["dag"].get("nodes", [])}

    added   = [nodes_b[nid] for nid in nodes_b if nid not in nodes_a]
    removed = [nodes_a[nid] for nid in nodes_a if nid not in nodes_b]
    changed = []
    for nid in nodes_a:
        if nid not in nodes_b:
            continue
        cfg_a = nodes_a[nid].get("config", {})
        cfg_b = nodes_b[nid].get("config", {})
        if cfg_a != cfg_b:
            all_keys = set(cfg_a) | set(cfg_b)
            diff = {
                k: {"from": cfg_a.get(k), "to": cfg_b.get(k)}
                for k in all_keys
                if cfg_a.get(k) != cfg_b.get(k)
            }
            changed.append({
                "node_id": nid,
                "definition_id": nodes_a[nid].get("definitionId"),
                "config_diff": diff,
            })

    return {"added": added, "removed": removed, "changed": changed}
