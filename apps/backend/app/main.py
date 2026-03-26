from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import pipeline, codegen, connectors

app = FastAPI(
    title="AI-IDE Backend",
    description="Execution engine, code generator, and data connectors for AI-IDE",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
app.include_router(codegen.router, prefix="/codegen", tags=["codegen"])
app.include_router(connectors.router, prefix="/connectors", tags=["connectors"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
