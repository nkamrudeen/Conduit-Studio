#!/bin/bash
# Start the FastAPI backend in dev mode (hot-reload)
# Prerequisites: uv installed (https://docs.astral.sh/uv/)
#
# First run: uv sync
# Then:      ./dev.sh

cd "$(dirname "$0")"
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
