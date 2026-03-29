"""
Code generation engine.

Takes a PipelineDAG, performs a topological sort, renders each node's
Jinja2 template, then hands the ordered snippets to a format assembler.

Variable passing: each node's output is tracked by (node_id, source_handle)
so multi-output nodes (e.g. train/test split) correctly pass the right
variable to each downstream target handle.
"""
from __future__ import annotations
import sys
from collections import deque
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, Undefined

from app.models.pipeline import PipelineDAG, PipelineNode
from app.models.codegen import CodeGenFormat, CodeGenResponse

# When running as a PyInstaller bundle, __file__ is inside the compressed archive
# and the data files are extracted to sys._MEIPASS.  In normal mode the templates
# sit two directories up from this file (app/services/codegen/ → app/templates/).
if getattr(sys, 'frozen', False):
    TEMPLATES_DIR = Path(sys._MEIPASS) / "app" / "templates"  # type: ignore[attr-defined]
else:
    TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    undefined=Undefined,  # lenient: missing keys render as empty string / falsy
    trim_blocks=True,
    lstrip_blocks=True,
)


# ── Node metadata registry (mirrors the TypeScript node-registry) ──────────
# Maps definitionId → (templateId, requiredPackages)
_NODE_META: dict[str, dict] = {
    # ML Ingest
    "ml.ingest.csv": {"template": "ml/ingest_csv.py.j2", "packages": ["pandas"]},
    "ml.ingest.parquet": {"template": "ml/ingest_parquet.py.j2", "packages": ["pandas", "pyarrow"]},
    "ml.ingest.s3": {"template": "ml/ingest_s3.py.j2", "packages": ["pandas", "boto3", "s3fs"]},
    "ml.ingest.azure": {"template": "ml/ingest_azure.py.j2", "packages": ["pandas", "azure-storage-blob"]},
    "ml.ingest.gcs": {"template": "ml/ingest_gcs.py.j2", "packages": ["pandas", "gcsfs"]},
    "ml.ingest.postgres": {"template": "ml/ingest_postgres.py.j2", "packages": ["pandas", "sqlalchemy", "psycopg2-binary"]},
    "ml.ingest.huggingface": {"template": "ml/ingest_huggingface.py.j2", "packages": ["datasets", "pandas"]},
    # ML Transform
    "ml.transform.column_select": {"template": "ml/transform_column_select.py.j2", "packages": ["pandas"]},
    "ml.transform.missing_values": {"template": "ml/transform_missing_values.py.j2", "packages": ["pandas"]},
    "ml.transform.row_filter": {"template": "ml/transform_row_filter.py.j2", "packages": ["pandas"]},
    "ml.transform.scaler": {"template": "ml/transform_scaler.py.j2", "packages": ["pandas", "scikit-learn"]},
    "ml.transform.encoder": {"template": "ml/transform_encoder.py.j2", "packages": ["pandas", "scikit-learn"]},
    "ml.transform.outlier_remove": {"template": "ml/transform_outlier_remove.py.j2", "packages": ["pandas", "scipy"]},
    "ml.transform.train_test_split": {"template": "ml/transform_train_test_split.py.j2", "packages": ["pandas", "scikit-learn"]},
    # ML Train
    "ml.train.sklearn.random_forest": {"template": "ml/train_sklearn_random_forest.py.j2", "packages": ["scikit-learn", "pandas"]},
    "ml.train.sklearn.gradient_boosting": {"template": "ml/train_sklearn_gradient_boosting.py.j2", "packages": ["scikit-learn", "pandas"]},
    "ml.train.sklearn.logistic_regression": {"template": "ml/train_sklearn_logistic_regression.py.j2", "packages": ["scikit-learn", "pandas"]},
    "ml.train.sklearn.svm": {"template": "ml/train_sklearn_svm.py.j2", "packages": ["scikit-learn", "pandas"]},
    "ml.train.sklearn.xgboost": {"template": "ml/train_xgboost.py.j2", "packages": ["xgboost", "pandas"]},
    "ml.train.keras.sequential": {"template": "ml/train_keras_sequential.py.j2", "packages": ["tensorflow", "pandas", "scikit-learn"]},
    "ml.train.pytorch.tabular": {"template": "ml/train_pytorch_tabular.py.j2", "packages": ["torch", "pandas", "scikit-learn"]},
    # ML Evaluate
    "ml.evaluate.classification": {"template": "ml/evaluate_classification.py.j2", "packages": ["scikit-learn", "matplotlib", "seaborn"]},
    "ml.evaluate.regression": {"template": "ml/evaluate_regression.py.j2", "packages": ["scikit-learn", "matplotlib"]},
    "ml.evaluate.cross_validation": {"template": "ml/evaluate_cross_validation.py.j2", "packages": ["scikit-learn"]},
    # ML Deploy
    "ml.deploy.mlflow": {"template": "ml/deploy_mlflow.py.j2", "packages": ["mlflow"]},
    "ml.deploy.fastapi": {"template": "ml/deploy_fastapi.py.j2", "packages": ["fastapi", "uvicorn", "joblib"]},
    "ml.deploy.huggingface_hub": {"template": "ml/deploy_huggingface_hub.py.j2", "packages": ["huggingface_hub"]},
    # ML Monitor
    "ml.monitor.evidently_drift": {"template": "ml/monitor_evidently_drift.py.j2", "packages": ["evidently>=0.4.0,<0.5.0"]},
    "ml.monitor.model_performance": {"template": "ml/monitor_model_performance.py.j2", "packages": ["scikit-learn", "evidently>=0.4.0,<0.5.0"]},
    # ML MLflow Experiment Tracking
    "ml.mlflow.set_experiment": {"template": "ml/mlflow_set_experiment.py.j2", "packages": ["mlflow"]},
    "ml.mlflow.autolog": {"template": "ml/mlflow_autolog.py.j2", "packages": ["mlflow"]},
    "ml.mlflow.log_params": {"template": "ml/mlflow_log_params.py.j2", "packages": ["mlflow"]},
    "ml.mlflow.compare_runs": {"template": "ml/mlflow_compare_runs.py.j2", "packages": ["mlflow", "pandas"]},
    "ml.mlflow.load_model": {"template": "ml/mlflow_load_model.py.j2", "packages": ["mlflow"]},
    # LLM
    "llm.ingest.pdf": {"template": "llm/ingest_pdf.py.j2", "packages": ["langchain", "pypdf"]},
    "llm.ingest.web": {"template": "llm/ingest_web.py.j2", "packages": ["langchain", "beautifulsoup4"]},
    "llm.ingest.s3_docs": {"template": "llm/ingest_s3_docs.py.j2", "packages": ["langchain", "boto3"]},
    "llm.chunk.recursive": {"template": "llm/chunk_recursive.py.j2", "packages": ["langchain"]},
    "llm.chunk.markdown": {"template": "llm/chunk_markdown.py.j2", "packages": ["langchain"]},
    "llm.embed.openai": {"template": "llm/embed_openai.py.j2", "packages": ["langchain-openai"]},
    "llm.embed.huggingface": {"template": "llm/embed_huggingface.py.j2", "packages": ["langchain-huggingface", "sentence-transformers"]},
    "llm.embed.ollama": {"template": "llm/embed_ollama.py.j2", "packages": ["langchain-ollama"]},
    "llm.vectorstore.chroma": {"template": "llm/vectorstore_chroma.py.j2", "packages": ["langchain-chroma", "chromadb"]},
    "llm.vectorstore.faiss": {"template": "llm/vectorstore_faiss.py.j2", "packages": ["langchain-community", "faiss-cpu"]},
    "llm.vectorstore.pinecone": {"template": "llm/vectorstore_pinecone.py.j2", "packages": ["langchain-pinecone"]},
    "llm.model.openai": {"template": "llm/model_openai.py.j2", "packages": ["langchain-openai"]},
    "llm.model.anthropic": {"template": "llm/model_anthropic.py.j2", "packages": ["langchain-anthropic"]},
    "llm.model.ollama": {"template": "llm/model_ollama.py.j2", "packages": ["langchain-ollama"]},
    "llm.model.vllm": {"template": "llm/model_vllm.py.j2", "packages": ["langchain-openai"]},
    "llm.chain.rag": {"template": "llm/chain_rag.py.j2", "packages": ["langchain", "langchain-core"]},
    "llm.chain.react_agent": {"template": "llm/chain_react_agent.py.j2", "packages": ["langchain", "langgraph"]},
    "llm.chain.langgraph_workflow": {"template": "llm/chain_langgraph_workflow.py.j2", "packages": ["langgraph"]},
    "llm.chain.llamaindex_query": {"template": "llm/chain_llamaindex_query.py.j2", "packages": ["llama-index"]},
    "llm.deploy.langserve": {"template": "llm/deploy_langserve.py.j2", "packages": ["langserve", "fastapi", "uvicorn"]},
    "llm.deploy.fastapi": {"template": "llm/deploy_fastapi.py.j2", "packages": ["fastapi", "uvicorn"]},
    "llm.monitor.usage": {"template": "llm/monitor_usage.py.j2", "packages": ["langsmith"]},
    # LLM Fine-tuning
    "llm.finetune.dataset_prep": {"template": "llm/finetune_dataset_prep.py.j2", "packages": ["datasets", "transformers", "pandas"]},
    "llm.finetune.lora_config": {"template": "llm/finetune_lora_config.py.j2", "packages": ["peft", "transformers"]},
    "llm.finetune.qlora_config": {"template": "llm/finetune_qlora_config.py.j2", "packages": ["peft", "transformers", "bitsandbytes"]},
    "llm.finetune.sft_trainer": {"template": "llm/finetune_sft_trainer.py.j2", "packages": ["trl", "peft", "transformers", "accelerate", "torch"]},
    "llm.finetune.merge_push": {"template": "llm/finetune_merge_push.py.j2", "packages": ["peft", "transformers", "huggingface_hub"]},
}

# ── Per-handle output variable names for multi-output nodes ──────────────
# Maps definitionId → {output_handle_id: var_name_template}
# Use {short} as a placeholder for the 8-char node short ID.
_NODE_HANDLE_OUTPUTS: dict[str, dict[str, str]] = {
    "ml.transform.train_test_split": {
        "df_train": "df_train_{short}",
        "df_test": "df_test_{short}",
    },
}

# ── Default output variable prefix for single-output nodes ─────────────
_NODE_OUTPUT_PREFIX: dict[str, str] = {
    # ML Ingest
    "ml.ingest.csv": "df",
    "ml.ingest.parquet": "df",
    "ml.ingest.s3": "df",
    "ml.ingest.azure": "df",
    "ml.ingest.gcs": "df",
    "ml.ingest.postgres": "df",
    "ml.ingest.huggingface": "df",
    # ML Transform
    "ml.transform.column_select": "df",
    "ml.transform.missing_values": "df",
    "ml.transform.row_filter": "df",
    "ml.transform.scaler": "df",
    "ml.transform.encoder": "df",
    "ml.transform.outlier_remove": "df",
    # ML Train
    "ml.train.sklearn.random_forest": "model",
    "ml.train.sklearn.gradient_boosting": "model",
    "ml.train.sklearn.logistic_regression": "model",
    "ml.train.sklearn.svm": "model",
    "ml.train.sklearn.xgboost": "model",
    "ml.train.keras.sequential": "model",
    "ml.train.pytorch.tabular": "model",
    # ML Evaluate
    "ml.evaluate.classification": "metrics",
    "ml.evaluate.regression": "metrics",
    "ml.evaluate.cross_validation": "metrics",
    # ML Deploy
    "ml.deploy.mlflow": "artifact",
    "ml.deploy.fastapi": "artifact",
    "ml.deploy.huggingface_hub": "artifact",
    # ML Monitor
    "ml.monitor.evidently_drift": "metrics",
    "ml.monitor.model_performance": "metrics",
    # ML MLflow
    "ml.mlflow.set_experiment": "run",
    "ml.mlflow.autolog": "run",
    "ml.mlflow.log_params": "run",
    "ml.mlflow.compare_runs": "df",
    "ml.mlflow.load_model": "model",
    # LLM Ingest
    "llm.ingest.pdf": "docs",
    "llm.ingest.web": "docs",
    "llm.ingest.s3_docs": "docs",
    # LLM Chunk
    "llm.chunk.recursive": "chunks",
    "llm.chunk.markdown": "chunks",
    # LLM Embed
    "llm.embed.openai": "embeddings",
    "llm.embed.huggingface": "embeddings",
    "llm.embed.ollama": "embeddings",
    # LLM VectorStore
    "llm.vectorstore.chroma": "vectorstore",
    "llm.vectorstore.faiss": "vectorstore",
    "llm.vectorstore.pinecone": "vectorstore",
    # LLM Model
    "llm.model.openai": "llm",
    "llm.model.anthropic": "llm",
    "llm.model.ollama": "llm",
    "llm.model.vllm": "llm",
    # LLM Chain
    "llm.chain.rag": "chain",
    "llm.chain.react_agent": "chain",
    "llm.chain.langgraph_workflow": "chain",
    "llm.chain.llamaindex_query": "chain",
    # LLM Deploy
    "llm.deploy.langserve": "artifact",
    "llm.deploy.fastapi": "artifact",
    # LLM Monitor
    "llm.monitor.usage": "metrics",
    # LLM Fine-tuning
    "llm.finetune.dataset_prep": "dataset",
    "llm.finetune.lora_config": "config",
    "llm.finetune.qlora_config": "config",
    "llm.finetune.sft_trainer": "model",
    "llm.finetune.merge_push": "artifact",
}


def topological_sort(dag: PipelineDAG) -> list[PipelineNode]:
    in_degree: dict[str, int] = {n.id: 0 for n in dag.nodes}
    adj: dict[str, list[str]] = {n.id: [] for n in dag.nodes}
    for edge in dag.edges:
        in_degree[edge.target] = in_degree.get(edge.target, 0) + 1
        adj[edge.source].append(edge.target)

    queue: deque[str] = deque(nid for nid, deg in in_degree.items() if deg == 0)
    sorted_ids: list[str] = []
    while queue:
        nid = queue.popleft()
        sorted_ids.append(nid)
        for neighbor in adj.get(nid, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(sorted_ids) != len(dag.nodes):
        raise ValueError("Pipeline DAG contains a cycle.")

    node_map = {n.id: n for n in dag.nodes}
    return [node_map[nid] for nid in sorted_ids]


def render_node(
    node: PipelineNode,
    inputs_by_handle: dict[str, str],
) -> tuple[str, list[str]]:
    """Render a single node's Jinja2 template.

    Args:
        node: The pipeline node to render.
        inputs_by_handle: Maps each target handle ID to the variable name
                          produced by the predecessor connected to that handle.

    Returns:
        (code_snippet, required_packages)
    """
    meta = _NODE_META.get(node.definitionId)
    if meta is None:
        return f"# ⚠ Unknown node type: {node.definitionId}\n", []

    # Primary input variable = first value in insertion order (handles are
    # added in edge order, which respects the DAG topology).
    input_var = next(iter(inputs_by_handle.values()), "") if inputs_by_handle else ""

    try:
        tmpl = _jinja_env.get_template(meta["template"])
        code = tmpl.render(
            node_id=node.id.replace("-", "_")[:8],
            config=node.config,
            input_var=input_var,
            inputs=inputs_by_handle,
        )
    except Exception as exc:
        code = f"# ⚠ Template error for {node.definitionId}: {exc}\n"

    return code, meta["packages"]


def generate_snippets(dag: PipelineDAG) -> tuple[list[PipelineNode], list[str], list[str]]:
    """Return (ordered_nodes, snippets, packages) without assembling.

    Used by the executor to inject per-node status markers at run time.
    """
    if not dag.nodes:
        return [], [], []

    ordered = topological_sort(dag)
    snippets: list[str] = []
    all_packages: list[str] = []
    source_vars: dict[str, dict[str, str]] = {}
    pred_edges: dict[str, list] = {}
    for edge in dag.edges:
        pred_edges.setdefault(edge.target, []).append(edge)

    for node in ordered:
        short = node.id.replace("-", "_")[:8]
        inputs_by_handle: dict[str, str] = {}
        for edge in pred_edges.get(node.id, []):
            src_node_vars = source_vars.get(edge.source, {})
            src_var = src_node_vars.get(edge.sourceHandle) or next(
                iter(src_node_vars.values()), ""
            )
            if src_var:
                inputs_by_handle[edge.targetHandle] = src_var
        snippet, pkgs = render_node(node, inputs_by_handle)
        snippets.append(snippet)
        all_packages.extend(pkgs)
        if node.definitionId in _NODE_HANDLE_OUTPUTS:
            source_vars[node.id] = {
                handle: tpl.format(short=short)
                for handle, tpl in _NODE_HANDLE_OUTPUTS[node.definitionId].items()
            }
        else:
            prefix = _NODE_OUTPUT_PREFIX.get(node.definitionId, "df")
            source_vars[node.id] = {node.definitionId: f"{prefix}_{short}"}

    return ordered, snippets, list(dict.fromkeys(all_packages))


def generate(dag: PipelineDAG, fmt: CodeGenFormat) -> CodeGenResponse:
    from app.services.codegen import python_gen, notebook_gen, kubeflow_gen, docker_gen

    warnings: list[str] = []
    if not dag.nodes:
        return CodeGenResponse(
            format=fmt, code="# Empty pipeline — add nodes to get started\n",
            filename="pipeline.py", requiredPackages=[], warnings=[]
        )

    ordered = topological_sort(dag)
    snippets: list[str] = []
    all_packages: list[str] = []

    # source_vars[node_id][handle_id] = variable_name produced by that output handle
    source_vars: dict[str, dict[str, str]] = {}

    # Build edge index: target_node_id → list of incoming edges
    pred_edges: dict[str, list] = {}
    for edge in dag.edges:
        pred_edges.setdefault(edge.target, []).append(edge)

    for node in ordered:
        short = node.id.replace("-", "_")[:8]

        # Build inputs_by_handle: target_handle → source variable name
        inputs_by_handle: dict[str, str] = {}
        for edge in pred_edges.get(node.id, []):
            src_node_vars = source_vars.get(edge.source, {})
            # Prefer the specific source handle; fall back to the first output var
            src_var = src_node_vars.get(edge.sourceHandle) or next(
                iter(src_node_vars.values()), ""
            )
            if src_var:
                inputs_by_handle[edge.targetHandle] = src_var

        snippet, pkgs = render_node(node, inputs_by_handle)
        snippets.append(snippet)
        all_packages.extend(pkgs)

        # Record output variables for this node
        if node.definitionId in _NODE_HANDLE_OUTPUTS:
            # Multi-output node: register each handle's variable
            source_vars[node.id] = {
                handle: tpl.format(short=short)
                for handle, tpl in _NODE_HANDLE_OUTPUTS[node.definitionId].items()
            }
        else:
            prefix = _NODE_OUTPUT_PREFIX.get(node.definitionId, "df")
            source_vars[node.id] = {node.definitionId: f"{prefix}_{short}"}

        if node.definitionId not in _NODE_META:
            warnings.append(
                f"Node '{node.definitionId}' has no template — placeholder generated."
            )

    unique_packages = list(dict.fromkeys(all_packages))

    match fmt:
        case "python":
            code, filename = python_gen.assemble(dag, snippets, unique_packages)
        case "notebook":
            code, filename = notebook_gen.assemble(dag, snippets, unique_packages)
        case "kubeflow":
            code, filename = kubeflow_gen.assemble(dag, snippets, unique_packages)
        case "docker":
            code, filename = docker_gen.assemble(dag, snippets, unique_packages)
        case _:
            code, filename = python_gen.assemble(dag, snippets, unique_packages)

    return CodeGenResponse(
        format=fmt,
        code=code,
        filename=filename,
        requiredPackages=unique_packages,
        warnings=warnings,
    )
