"""Kubeflow Pipelines integration client — imports kfp lazily inside each function."""

from __future__ import annotations

# Seconds to wait for any KFP API call before giving up.
_KFP_TIMEOUT = 15


def _get_kfp_client(host: str, token: str = ""):
    try:
        import kfp  # noqa: PLC0415
    except ImportError as exc:
        raise ImportError(
            "kfp is not installed. Install it with: pip install kfp"
        ) from exc
    try:
        kwargs: dict = {"host": host}
        if token:
            # Strip whitespace and any non-latin-1 characters that sneak in
            # via copy-paste (e.g. ellipsis U+2026 from terminal truncation).
            # Real authservice_session / bearer tokens are ASCII-only so this
            # is safe and avoids UnicodeEncodeError in http.client.putheader.
            clean_token = "".join(c for c in token.strip() if ord(c) < 256)

            # Full KFP installs with oauth2-proxy/Istio use a session cookie;
            # bare KFP installs accept a Bearer token.  Try cookie auth first —
            # it's the more common case when the healthz page returns HTML.
            if _is_oauth_protected(host):
                kwargs["cookies"] = f"authservice_session={clean_token}"
            else:
                kwargs["existing_token"] = clean_token
        return kfp.Client(**kwargs)
    except Exception as exc:
        _raise_connectivity_error(host, exc)


def _is_oauth_protected(host: str) -> bool:
    """Return True if the KFP host redirects unauthenticated requests to an OAuth page."""
    import urllib.request  # noqa: PLC0415
    try:
        url = host.rstrip("/") + "/healthz"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=3) as resp:
            content_type = resp.headers.get("Content-Type", "")
            body = resp.read(256).decode("utf-8", errors="ignore")
            return "text/html" in content_type or body.strip().startswith("<")
    except Exception:
        # Can't determine — assume not OAuth protected
        return False


def _raise_connectivity_error(host: str, cause: Exception) -> None:
    msg = str(cause)
    if "504" in msg or "Gateway Timeout" in msg:
        hint = (
            f"Kubeflow Pipelines API at {host} returned 504 Gateway Timeout. "
            "The ml-pipeline backend service is not responding. "
            "Check that all KFP pods are Running: kubectl get pods -n kubeflow"
        )
    elif "401" in msg or "Unauthorized" in msg or "Sign In" in msg or "text/html" in msg:
        hint = (
            f"Kubeflow Pipelines at {host} requires authentication. "
            "If your KFP is behind an OAuth2 proxy (Dex/Istio), paste the "
            "'authservice_session' cookie value from your browser into the Token field. "
            "To get it: open KFP UI in browser → DevTools → Application → Cookies → "
            "copy the 'authservice_session' value. "
            "Alternatively: kubectl -n kubeflow create token default"
        )
    elif "Connection refused" in msg or "Failed to establish" in msg:
        hint = (
            f"Cannot reach Kubeflow Pipelines at {host}. "
            "Ensure the cluster is running and port-forwarded: "
            "kubectl port-forward svc/ml-pipeline-ui -n kubeflow 8080:80"
        )
    else:
        hint = f"Kubeflow Pipelines error ({host}): {msg}"
    raise ConnectionError(hint) from cause


def list_pipelines(host: str, token: str = "") -> list[dict]:
    """Return all pipelines as a list of dicts with id, name, created_at."""
    _check_reachable(host)
    client = _get_kfp_client(host, token)
    try:
        response = client.list_pipelines()
    except Exception as exc:
        _raise_connectivity_error(host, exc)
    pipelines = response.pipelines or []
    return [
        {
            "id": p.pipeline_id,
            "name": p.display_name,
            "created_at": str(p.created_at) if p.created_at else None,
        }
        for p in pipelines
    ]


def list_runs(host: str, experiment_id: str = "", token: str = "") -> list[dict]:
    """Return runs, optionally filtered by experiment_id."""
    _check_reachable(host)
    client = _get_kfp_client(host, token)
    kwargs: dict = {}
    if experiment_id:
        kwargs["experiment_id"] = experiment_id
    try:
        response = client.list_runs(**kwargs)
    except Exception as exc:
        _raise_connectivity_error(host, exc)
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
    token: str = "",
) -> dict:
    """Submit a pipeline run and return basic run info."""
    _check_reachable(host)
    client = _get_kfp_client(host, token)
    try:
        run = client.run_pipeline(
            experiment_id=None,
            job_name=run_name,
            pipeline_id=pipeline_id,
            params=params,
        )
    except Exception as exc:
        _raise_connectivity_error(host, exc)
    return {
        "run_id": run.run_id,
        "name": run.display_name,
        "status": run.state,
    }


def get_run_status(host: str, run_id: str, token: str = "") -> dict:
    """Return the current status of a pipeline run."""
    _check_reachable(host)
    client = _get_kfp_client(host, token)
    try:
        run = client.get_run(run_id=run_id)
    except Exception as exc:
        _raise_connectivity_error(host, exc)
    return {
        "run_id": run.run_id,
        "name": run.display_name,
        "status": run.state,
        "created_at": str(run.created_at) if run.created_at else None,
        "finished_at": str(run.finished_at) if run.finished_at else None,
    }


def _check_reachable(host: str) -> None:
    """TCP + HTTP check before making any KFP API call.

    Also detects OAuth2-proxy in front of KFP (healthz returns HTML) so we can
    give an actionable hint instead of "Failed getting healthz endpoint after 5 attempts".
    """
    import socket  # noqa: PLC0415
    try:
        bare = host.split("://", 1)[-1].split("/")[0]
        parts = bare.rsplit(":", 1)
        hostname = parts[0]
        port = int(parts[1]) if len(parts) > 1 else 80
        with socket.create_connection((hostname, port), timeout=3):
            pass
    except OSError as exc:
        _raise_connectivity_error(host, exc)
