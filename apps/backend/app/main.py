from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import pipeline, codegen, connectors, mlflow, kubeflow, huggingface, agent, files

app = FastAPI(
    title="Conduit Studio Backend",
    description="Execution engine, code generator, and data connectors for Conduit Studio",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
app.include_router(codegen.router, prefix="/codegen", tags=["codegen"])
app.include_router(connectors.router, prefix="/connectors", tags=["connectors"])
app.include_router(mlflow.router, prefix="/mlflow", tags=["mlflow"])
app.include_router(kubeflow.router, prefix="/kubeflow", tags=["kubeflow"])
app.include_router(huggingface.router, prefix="/huggingface", tags=["huggingface"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(files.router, prefix="/files", tags=["files"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
