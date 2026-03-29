"""
AI Pipeline Agent — validates the current DAG and suggests next steps.

Rule-based validation + optional Claude-powered smart analysis.
"""
from __future__ import annotations
import os
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.models.pipeline import PipelineDAG

router = APIRouter()

# ── Pydantic models ────────────────────────────────────────────────────────────

class ValidationIssue(BaseModel):
    severity: Literal["error", "warning", "info"]
    message: str
    node_id: str | None = None
    fix: str | None = None


class NodeSuggestion(BaseModel):
    definition_id: str
    label: str
    reason: str
    category: str


class AgentAnalysisRequest(BaseModel):
    dag: PipelineDAG
    use_ai: bool = False   # if True and ANTHROPIC_API_KEY set, call Claude


class AgentAnalysisResponse(BaseModel):
    issues: list[ValidationIssue]
    suggestions: list[NodeSuggestion]
    ai_analysis: str | None = None
    score: int  # 0-100 pipeline health score


# ── Category flow maps ─────────────────────────────────────────────────────────

_ML_FLOW: dict[str, list[dict]] = {
    "ingest": [
        {"definition_id": "ml.transform.missing_values", "label": "Handle Missing Values", "category": "transform", "reason": "Clean your data before training — handle NaN values by imputation or row removal."},
        {"definition_id": "ml.transform.column_select", "label": "Select Columns", "category": "transform", "reason": "Select only the features relevant to your target variable."},
    ],
    "transform": [
        {"definition_id": "ml.transform.train_test_split", "label": "Train/Test Split", "category": "split", "reason": "Split your data into training and evaluation sets before training."},
        {"definition_id": "ml.transform.scaler", "label": "Feature Scaler", "category": "transform", "reason": "Scale numerical features to improve model convergence."},
        {"definition_id": "ml.transform.encoder", "label": "Categorical Encoder", "category": "transform", "reason": "Encode categorical columns (one-hot or label) for ML algorithms."},
    ],
    "split": [
        {"definition_id": "ml.train.sklearn.random_forest", "label": "Random Forest", "category": "train", "reason": "A robust ensemble classifier/regressor — great starting point."},
        {"definition_id": "ml.train.sklearn.gradient_boosting", "label": "Gradient Boosting", "category": "train", "reason": "High-accuracy boosting algorithm for tabular data."},
        {"definition_id": "ml.train.sklearn.xgboost", "label": "XGBoost", "category": "train", "reason": "State-of-the-art gradient boosting — excellent for structured data."},
    ],
    "train": [
        {"definition_id": "ml.evaluate.classification", "label": "Classification Evaluation", "category": "evaluate", "reason": "Measure accuracy, precision, recall, and F1 on your test set."},
        {"definition_id": "ml.evaluate.regression", "label": "Regression Evaluation", "category": "evaluate", "reason": "Compute RMSE, MAE, and R² on your test set."},
        {"definition_id": "ml.mlflow.autolog", "label": "MLflow Autolog", "category": "experiment", "reason": "Enable automatic experiment tracking — logs metrics and model artifacts."},
    ],
    "evaluate": [
        {"definition_id": "ml.deploy.mlflow", "label": "MLflow Registry", "category": "deploy", "reason": "Register the trained model in MLflow for versioning and serving."},
        {"definition_id": "ml.deploy.fastapi", "label": "FastAPI Endpoint", "category": "deploy", "reason": "Deploy a REST inference endpoint for real-time predictions."},
    ],
    "deploy": [
        {"definition_id": "ml.monitor.evidently_drift", "label": "Data Drift Monitor", "category": "monitor", "reason": "Detect feature drift in production data vs. training distribution."},
        {"definition_id": "ml.monitor.model_performance", "label": "Performance Monitor", "category": "monitor", "reason": "Alert when model accuracy degrades below a threshold."},
    ],
    "experiment": [
        {"definition_id": "ml.deploy.mlflow", "label": "MLflow Registry", "category": "deploy", "reason": "Register the best model from your experiments."},
        {"definition_id": "ml.mlflow.compare_runs", "label": "Compare Runs", "category": "experiment", "reason": "Fetch all experiment runs into a DataFrame for comparison."},
    ],
}

_LLM_FLOW: dict[str, list[dict]] = {
    "ingest": [
        {"definition_id": "llm.chunk.recursive", "label": "Recursive Chunker", "category": "chunk", "reason": "Split documents into overlapping chunks for embedding."},
        {"definition_id": "llm.chunk.markdown", "label": "Markdown Chunker", "category": "chunk", "reason": "Split markdown-structured docs at heading boundaries."},
    ],
    "chunk": [
        {"definition_id": "llm.embed.openai", "label": "OpenAI Embeddings", "category": "embed", "reason": "Generate high-quality text embeddings using OpenAI's API."},
        {"definition_id": "llm.embed.huggingface", "label": "HuggingFace Embeddings", "category": "embed", "reason": "Use a local embedding model — no API cost."},
        {"definition_id": "llm.embed.ollama", "label": "Ollama Embeddings", "category": "embed", "reason": "Fully local embeddings using Ollama — ideal for private data."},
    ],
    "embed": [
        {"definition_id": "llm.vectorstore.chroma", "label": "Chroma Vector Store", "category": "vectorstore", "reason": "Persist embeddings in Chroma for semantic similarity search."},
        {"definition_id": "llm.vectorstore.faiss", "label": "FAISS Vector Store", "category": "vectorstore", "reason": "Fast in-memory similarity search — great for prototyping."},
        {"definition_id": "llm.vectorstore.pinecone", "label": "Pinecone Vector Store", "category": "vectorstore", "reason": "Managed vector DB — scales to billions of embeddings."},
    ],
    "vectorstore": [
        {"definition_id": "llm.model.openai", "label": "OpenAI GPT-4o", "category": "llm", "reason": "Connect a GPT-4o LLM to your retrieval pipeline."},
        {"definition_id": "llm.model.anthropic", "label": "Claude Sonnet", "category": "llm", "reason": "Connect Claude for high-quality, context-aware responses."},
        {"definition_id": "llm.model.ollama", "label": "Ollama (Local)", "category": "llm", "reason": "Fully local inference — no data leaves your machine."},
    ],
    "llm": [
        {"definition_id": "llm.chain.rag", "label": "RAG Chain", "category": "chain", "reason": "Wire the vector store and LLM into a retrieval-augmented generation chain."},
        {"definition_id": "llm.chain.react_agent", "label": "ReAct Agent", "category": "chain", "reason": "Build a tool-using agent with the ReAct framework."},
    ],
    "chain": [
        {"definition_id": "llm.deploy.langserve", "label": "LangServe", "category": "deploy", "reason": "Deploy your chain as a REST API with a built-in playground."},
        {"definition_id": "llm.deploy.fastapi", "label": "FastAPI Endpoint", "category": "deploy", "reason": "Wrap your chain in a custom FastAPI endpoint."},
        {"definition_id": "llm.monitor.usage", "label": "Usage Monitor", "category": "monitor", "reason": "Track token usage, latency, and cost with LangSmith."},
    ],
    "finetune": [
        {"definition_id": "llm.finetune.sft_trainer", "label": "SFT Trainer", "category": "finetune", "reason": "Train the model with your prepared dataset and LoRA config."},
        {"definition_id": "llm.finetune.merge_push", "label": "Merge & Push", "category": "finetune", "reason": "Merge LoRA weights and push the fine-tuned model to HuggingFace Hub."},
    ],
}


# ── Validation logic ───────────────────────────────────────────────────────────

def _validate(dag: PipelineDAG) -> tuple[list[ValidationIssue], int]:
    issues: list[ValidationIssue] = []
    nodes = dag.nodes
    edges = dag.edges

    if not nodes:
        issues.append(ValidationIssue(
            severity="warning", message="Pipeline is empty. Add a Data Ingestion node to start.",
            fix="Drag an Ingest node from the palette onto the canvas."
        ))
        return issues, 0

    node_map = {n.id: n for n in nodes}
    sources = {e.source for e in edges}
    targets = {e.target for e in edges}
    connected = sources | targets

    # Isolated nodes (not connected to anything)
    for node in nodes:
        if node.id not in connected and len(nodes) > 1:
            issues.append(ValidationIssue(
                severity="error",
                message=f"Node '{node.definitionId}' is isolated — not connected to any other node.",
                node_id=node.id,
                fix="Connect this node to the pipeline or remove it."
            ))

    # In-degree / out-degree per node
    in_deg = {n.id: 0 for n in nodes}
    out_deg = {n.id: 0 for n in nodes}
    for e in edges:
        out_deg[e.source] = out_deg.get(e.source, 0) + 1
        in_deg[e.target] = in_deg.get(e.target, 0) + 1

    # Source nodes (no incoming edges) — check they are ingest-type
    ingest_categories = {"ingest", "experiment"}
    terminal_categories = {"deploy", "monitor", "merge_push"}

    source_nodes = [n for n in nodes if in_deg[n.id] == 0]
    if not any(
        any(w in n.definitionId for w in ["ingest", "set_experiment", "load_model", "compare_runs", "dataset_prep", "lora_config", "qlora_config"])
        for n in source_nodes
    ):
        issues.append(ValidationIssue(
            severity="warning",
            message="No data source node found. Pipelines typically start with an Ingest or Dataset Prep node.",
            fix="Add an Ingest node (CSV, S3, PostgreSQL, PDF, etc.) or a Dataset Prep node."
        ))

    # Terminal nodes (no outgoing edges) — check they are deploy/monitor type
    terminal_nodes = [n for n in nodes if out_deg.get(n.id, 0) == 0]
    sink_keywords = ["deploy", "monitor", "merge_push", "compare_runs", "log_params"]
    non_sink_terminals = [
        n for n in terminal_nodes
        if not any(w in n.definitionId for w in sink_keywords)
    ]
    for node in non_sink_terminals:
        if len(nodes) > 1:
            issues.append(ValidationIssue(
                severity="info",
                message=f"Node '{node.definitionId}' has no downstream connections.",
                node_id=node.id,
                fix="Connect it to an Evaluate, Deploy, or Monitor node."
            ))

    # ML-specific: trainer present but no evaluation
    has_trainer = any("train" in n.definitionId for n in nodes)
    has_evaluate = any("evaluate" in n.definitionId or "mlflow" in n.definitionId for n in nodes)
    if has_trainer and not has_evaluate:
        issues.append(ValidationIssue(
            severity="warning",
            message="A trainer node is present but there is no Evaluation node.",
            fix="Add an Evaluate Classification or Evaluate Regression node after the trainer."
        ))

    # LLM-specific: vectorstore present but no LLM
    has_vectorstore = any("vectorstore" in n.definitionId for n in nodes)
    has_llm = any(".model." in n.definitionId or "chain" in n.definitionId for n in nodes)
    if has_vectorstore and not has_llm:
        issues.append(ValidationIssue(
            severity="warning",
            message="A Vector Store node is present but no LLM model or chain is connected.",
            fix="Add an LLM Model node (OpenAI, Claude, Ollama) and a RAG Chain node."
        ))

    # Fine-tuning: lora/qlora config but no trainer
    has_lora = any("lora_config" in n.definitionId for n in nodes)
    has_finetune_trainer = any("sft_trainer" in n.definitionId for n in nodes)
    if has_lora and not has_finetune_trainer:
        issues.append(ValidationIssue(
            severity="warning",
            message="LoRA/QLoRA Config node present but no SFT Trainer connected.",
            fix="Add an SFT Trainer node and connect the config and dataset to it."
        ))

    # Compute score
    penalty = sum({"error": 20, "warning": 10, "info": 3}[i.severity] for i in issues)
    score = max(0, 100 - penalty)
    return issues, score


# ── Suggestion logic ───────────────────────────────────────────────────────────

def _suggest(dag: PipelineDAG) -> list[NodeSuggestion]:
    if not dag.nodes:
        starters = (
            [{"definition_id": "ml.ingest.csv", "label": "CSV Ingest", "category": "ingest", "reason": "Load a CSV dataset to start your ML pipeline."},
             {"definition_id": "ml.mlflow.set_experiment", "label": "MLflow Set Experiment", "category": "experiment", "reason": "Set up experiment tracking before training."}]
            if dag.pipeline == "ml" else
            [{"definition_id": "llm.ingest.pdf", "label": "PDF Ingest", "category": "ingest", "reason": "Load PDF documents to build a RAG pipeline."},
             {"definition_id": "llm.finetune.dataset_prep", "label": "Dataset Prep", "category": "finetune", "reason": "Prepare a dataset for LoRA/QLoRA fine-tuning."}]
        )
        return [NodeSuggestion(**s) for s in starters]

    # Find the "frontier" — nodes with no outgoing edges
    out_deg = {}
    for e in dag.edges:
        out_deg[e.source] = out_deg.get(e.source, 0) + 1

    frontier = [n for n in dag.nodes if out_deg.get(n.id, 0) == 0]
    flow_map = _ML_FLOW if dag.pipeline == "ml" else _LLM_FLOW

    seen_suggestions: set[str] = {n.definitionId for n in dag.nodes}
    result: list[NodeSuggestion] = []

    for node in frontier:
        def_id = node.definitionId
        # Match by category keyword in definition ID
        for category_key, suggestions in flow_map.items():
            if category_key in def_id:
                for s in suggestions:
                    if s["definition_id"] not in seen_suggestions:
                        result.append(NodeSuggestion(**s))
                        seen_suggestions.add(s["definition_id"])
                break

    # Deduplicate, limit to 5
    return result[:5]


# ── Optional Claude analysis ───────────────────────────────────────────────────

async def _claude_analysis(dag: PipelineDAG, issues: list[ValidationIssue]) -> str | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        node_summary = "\n".join(
            f"  - {n.definitionId} (id: {n.id})" for n in dag.nodes
        )
        edge_summary = "\n".join(
            f"  - {e.source} → {e.target}" for e in dag.edges
        )
        issue_summary = "\n".join(
            f"  [{i.severity.upper()}] {i.message}" for i in issues
        ) or "  No issues found."

        prompt = f"""You are an MLOps/LLMOps expert reviewing a visual pipeline diagram in an AI IDE tool.

Pipeline type: {dag.pipeline.upper()}
Pipeline name: {dag.name}

Nodes:
{node_summary}

Connections:
{edge_summary}

Validation issues already detected:
{issue_summary}

In 2-3 short paragraphs:
1. Summarize what this pipeline does and whether the overall design is sound.
2. Identify any architectural improvements or best practices the user should consider.
3. Suggest the single most impactful next step to make this pipeline production-ready.

Be concise and practical. Avoid restating the validation issues already listed."""

        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception as exc:
        return f"AI analysis unavailable: {exc}"


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AgentAnalysisResponse)
async def analyze_pipeline(request: AgentAnalysisRequest) -> AgentAnalysisResponse:
    issues, score = _validate(request.dag)
    suggestions = _suggest(request.dag)
    ai_analysis: str | None = None
    if request.use_ai:
        ai_analysis = await _claude_analysis(request.dag, issues)
    return AgentAnalysisResponse(
        issues=issues,
        suggestions=suggestions,
        ai_analysis=ai_analysis,
        score=score,
    )
