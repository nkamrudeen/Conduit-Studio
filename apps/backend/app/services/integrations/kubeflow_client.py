"""Kubeflow Pipelines integration client — imports kfp lazily inside each function."""

from __future__ import annotations


def _get_kfp_client(host: str):
    try:
        import kfp  # noqa: PLC0415
        return kfp.Client(host=host)
    except ImportError as exc:
        raise ImportError(
            "kfp is not installed. Install it with: pip install kfp"
        ) from exc


def list_pipelines(host: str) -> list[dict]:
    """Return all pipelines as a list of dicts with id, name, created_at."""
    client = _get_kfp_client(host)
    response = client.list_pipelines()
    pipelines = response.pipelines or []
    return [
        {
            "id": p.pipeline_id,
            "name": p.display_name,
            "created_at": str(p.created_at) if p.created_at else None,
        }
        for p in pipelines
    ]


def list_runs(host: str, experiment_id: str = "") -> list[dict]:
    """Return runs, optionally filtered by experiment_id."""
    client = _get_kfp_client(host)
    kwargs: dict = {}
    if experiment_id:
        kwargs["experiment_id"] = experiment_id
    response = client.list_runs(**kwargs)
    runs = response.runs or []
    return [
        {
            "run_id": r.run_id,
            "name": r.display_name,
            "status": r.state,
        }
        for r in runs
    ]


def submit_run(
    host: str,
    pipeline_id: str,
    run_name: str,
    params: dict,
) -> dict:
    """Submit a pipeline run and return basic run info."""
    client = _get_kfp_client(host)
    run = client.run_pipeline(
        experiment_id=None,
        job_name=run_name,
        pipeline_id=pipeline_id,
        params=params,
    )
    return {
        "run_id": run.run_id,
        "name": run.display_name,
        "status": run.state,
    }


def get_run_status(host: str, run_id: str) -> dict:
    """Return the current status of a pipeline run."""
    client = _get_kfp_client(host)
    run = client.get_run(run_id=run_id)
    return {
        "run_id": run.run_id,
        "name": run.display_name,
        "status": run.state,
        "created_at": str(run.created_at) if run.created_at else None,
        "finished_at": str(run.finished_at) if run.finished_at else None,
    }
