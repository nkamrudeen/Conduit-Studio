"""MLflow integration client — imports mlflow lazily inside each function."""

from __future__ import annotations


def _get_mlflow():
    try:
        import mlflow  # noqa: PLC0415
        return mlflow
    except ImportError as exc:
        raise ImportError(
            "mlflow is not installed. Install it with: pip install mlflow"
        ) from exc


def list_experiments(tracking_uri: str) -> list[dict]:
    """Return all experiments as a list of dicts with id, name, lifecycle_stage."""
    mlflow = _get_mlflow()
    mlflow.set_tracking_uri(tracking_uri)
    client = mlflow.tracking.MlflowClient()
    experiments = client.search_experiments()
    return [
        {
            "id": exp.experiment_id,
            "name": exp.name,
            "lifecycle_stage": exp.lifecycle_stage,
        }
        for exp in experiments
    ]


def list_runs(
    tracking_uri: str,
    experiment_id: str,
    max_results: int = 50,
) -> list[dict]:
    """Return runs for an experiment as a list of dicts."""
    mlflow = _get_mlflow()
    mlflow.set_tracking_uri(tracking_uri)
    client = mlflow.tracking.MlflowClient()
    runs = client.search_runs(
        experiment_ids=[experiment_id],
        max_results=max_results,
    )
    return [
        {
            "run_id": run.info.run_id,
            "status": run.info.status,
            "start_time": run.info.start_time,
            "metrics": dict(run.data.metrics),
            "params": dict(run.data.params),
        }
        for run in runs
    ]


def list_registered_models(tracking_uri: str) -> list[dict]:
    """Return all registered models with their latest versions."""
    mlflow = _get_mlflow()
    mlflow.set_tracking_uri(tracking_uri)
    client = mlflow.tracking.MlflowClient()
    models = client.search_registered_models()
    return [
        {
            "name": model.name,
            "latest_versions": [
                {
                    "version": v.version,
                    "stage": v.current_stage,
                    "status": v.status,
                    "run_id": v.run_id,
                }
                for v in model.latest_versions
            ],
        }
        for model in models
    ]


def log_run(
    tracking_uri: str,
    experiment_name: str,
    run_name: str,
    params: dict,
    metrics: dict,
    tags: dict,
) -> str:
    """Create an MLflow run, log params/metrics/tags, and return the run_id."""
    mlflow = _get_mlflow()
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)
    with mlflow.start_run(run_name=run_name, tags=tags) as run:
        if params:
            mlflow.log_params(params)
        if metrics:
            mlflow.log_metrics(metrics)
        return run.info.run_id


def get_model_uri(
    tracking_uri: str,
    model_name: str,
    stage: str = "Production",
) -> str:
    """Return the MLflow model URI for the given model name and stage."""
    mlflow = _get_mlflow()
    mlflow.set_tracking_uri(tracking_uri)
    return f"models:/{model_name}/{stage}"
