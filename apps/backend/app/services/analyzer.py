"""Pre-run pipeline analyzer: package conflict detection + cost estimation."""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

from app.models.pipeline import PipelineDAG
from app.services.codegen.engine import _NODE_META

# ---------------------------------------------------------------------------
# Known incompatible package pairs (package_a, package_b, reason)
# ---------------------------------------------------------------------------
_KNOWN_CONFLICTS: list[tuple[str, str, str]] = [
    ("tensorflow", "torch", "TensorFlow and PyTorch share GPU/CUDA libraries and often conflict at install time."),
    ("tensorflow", "jax", "TensorFlow and JAX can conflict over XLA and CUDA versions."),
    ("faiss-cpu", "faiss-gpu", "Install faiss-cpu OR faiss-gpu, not both."),
    ("langchain-openai", "openai", "langchain-openai pins its own openai version — installing both can cause version conflicts."),
    ("llama-index", "langchain", "llama-index and langchain both vendor httpx/pydantic and can pin incompatible versions."),
    ("evidently", "evidently>=0.4.0,<0.5.0", "Multiple evidently version constraints found — pin a single version."),
]

# ---------------------------------------------------------------------------
# LLM cost table (USD per 1M tokens, [input, output])
# ---------------------------------------------------------------------------
_LLM_COSTS: dict[str, dict[str, tuple[float, float]]] = {
    "llm.model.openai": {
        "gpt-4o":            (2.50,  10.00),
        "gpt-4o-mini":       (0.15,   0.60),
        "gpt-4-turbo":       (10.00, 30.00),
        "gpt-3.5-turbo":     (0.50,   1.50),
    },
    "llm.model.anthropic": {
        "claude-opus-4-6":    (15.00, 75.00),
        "claude-sonnet-4-6":  (3.00,  15.00),
        "claude-haiku-4-5":   (0.25,   1.25),
    },
    "llm.model.ollama": {},   # free / local
    "llm.model.vllm":   {},   # self-hosted
}

_DEFAULT_MODEL: dict[str, str] = {
    "llm.model.openai":    "gpt-4o-mini",
    "llm.model.anthropic": "claude-sonnet-4-6",
}

# Rough size estimates in MB for heavyweight packages
_PACKAGE_SIZES: dict[str, int] = {
    "tensorflow": 600,
    "torch": 800,
    "transformers": 250,
    "langchain": 80,
    "scikit-learn": 30,
    "xgboost": 25,
    "faiss-cpu": 40,
    "faiss-gpu": 45,
    "chromadb": 60,
    "evidently": 90,
    "llama-index": 150,
    "trl": 60,
    "peft": 40,
}


def _base_name(pkg: str) -> str:
    """Strip version specifiers: 'scikit-learn>=1.0,<2.0' → 'scikit-learn'."""
    return re.split(r"[>=<!~\[]", pkg)[0].strip().lower()


def analyze(dag_dict: dict[str, Any]) -> dict[str, Any]:
    dag = PipelineDAG(**dag_dict)

    # ── Collect packages per node ─────────────────────────────────────────
    node_packages: dict[str, list[str]] = {}  # node_id → [pkg, ...]
    for node in dag.nodes:
        meta = _NODE_META.get(node.definitionId)
        node_packages[node.id] = list(meta["packages"]) if meta else []

    all_packages: list[str] = []
    for pkgs in node_packages.values():
        all_packages.extend(pkgs)
    unique_packages = list(dict.fromkeys(all_packages))

    # ── Conflict detection ────────────────────────────────────────────────
    base_names = {_base_name(p) for p in unique_packages}
    conflicts: list[dict] = []

    for pkg_a, pkg_b, reason in _KNOWN_CONFLICTS:
        a = _base_name(pkg_a)
        b = _base_name(pkg_b)
        if a in base_names and b in base_names:
            conflicts.append({
                "package_a": pkg_a,
                "package_b": pkg_b,
                "severity": "error",
                "message": reason,
            })

    # Detect duplicate base names with different version pins
    version_map: dict[str, list[str]] = defaultdict(list)
    for pkg in unique_packages:
        version_map[_base_name(pkg)].append(pkg)
    for base, variants in version_map.items():
        if len(variants) > 1:
            conflicts.append({
                "package_a": variants[0],
                "package_b": variants[1],
                "severity": "warning",
                "message": f"Multiple version constraints for '{base}': {', '.join(variants)}. This may cause a resolver conflict.",
            })

    # ── Cost estimation ───────────────────────────────────────────────────
    cost_items: list[dict] = []
    total_min = 0.0
    total_max = 0.0

    for node in dag.nodes:
        if node.definitionId not in _LLM_COSTS:
            continue
        model_table = _LLM_COSTS[node.definitionId]
        if not model_table:
            cost_items.append({
                "node_id": node.id,
                "definition_id": node.definitionId,
                "model": "local / self-hosted",
                "cost_per_1m_input": 0,
                "cost_per_1m_output": 0,
                "note": "Free — runs locally",
            })
            continue

        model = node.config.get("model") or _DEFAULT_MODEL.get(node.definitionId, "")
        # Fuzzy match: find closest key
        matched = next((k for k in model_table if model.startswith(k) or k.startswith(model.split("-")[0])), None)
        if not matched:
            matched = next(iter(model_table))
        inp, out = model_table[matched]
        # Estimate 1K calls × 500 tokens in/out per call = rough range
        est_min = (500 * 1000 / 1_000_000) * inp
        est_max = (500 * 1000 / 1_000_000) * out
        total_min += est_min
        total_max += est_max
        cost_items.append({
            "node_id": node.id,
            "definition_id": node.definitionId,
            "model": matched,
            "cost_per_1m_input": inp,
            "cost_per_1m_output": out,
            "note": f"~${est_min:.2f}–${est_max:.2f} per 1K calls (500 tokens in/out est.)",
        })

    # ── Package size estimate ─────────────────────────────────────────────
    total_size_mb = sum(_PACKAGE_SIZES.get(_base_name(p), 5) for p in unique_packages)
    heavy = [p for p in unique_packages if _PACKAGE_SIZES.get(_base_name(p), 0) >= 100]

    return {
        "packages": unique_packages,
        "node_packages": {n.id: node_packages[n.id] for n in dag.nodes},
        "conflicts": conflicts,
        "cost_items": cost_items,
        "total_cost_range": {"min_usd": round(total_min, 4), "max_usd": round(total_max, 4)},
        "total_size_mb": total_size_mb,
        "heavy_packages": heavy,
    }
