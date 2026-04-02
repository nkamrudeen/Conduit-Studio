# conduit-backend.spec
# PyInstaller spec for the ConduitCraft AI backend server.
#
# Build (from apps/backend/):
#   pyinstaller conduit-backend.spec
#
# Output: dist/conduit-backend/  (onedir — fast startup, all deps alongside exe)

block_cipher = None

# ── Data files ────────────────────────────────────────────────────────────────
# Jinja2 templates must travel with the bundle; they are not Python modules so
# PyInstaller won't pick them up automatically.
datas = [
    ('app/templates/ml',  'app/templates/ml'),
    ('app/templates/llm', 'app/templates/llm'),
]

# ── Hidden imports ────────────────────────────────────────────────────────────
# Uvicorn loads its event-loop/protocol implementations via importlib strings,
# so static analysis misses them.
hidden_imports = [
    # uvicorn
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.protocols.websockets.websockets_impl',
    'uvicorn.lifespan',
    'uvicorn.lifespan.off',
    'uvicorn.lifespan.on',
    # HTTP
    'h11',
    'h11._writers',
    'h11._readers',
    'h11._events',
    # ASGI / FastAPI / Starlette
    'starlette.routing',
    'starlette.middleware',
    'starlette.middleware.cors',
    'starlette.responses',
    'starlette.requests',
    'starlette.websockets',
    'starlette.background',
    # Pydantic v2
    'pydantic',
    'pydantic.deprecated',
    'pydantic_core',
    # anyio / sniffio
    'anyio',
    'anyio._backends._asyncio',
    'sniffio',
    # websockets
    'websockets',
    'websockets.legacy',
    'websockets.legacy.server',
    # httpx
    'httpx',
    'httpcore',
    # Jinja2 / MarkupSafe
    'jinja2',
    'markupsafe',
    # python-multipart (FastAPI file uploads)
    'multipart',
    # ── App routers ───────────────────────────────────────────────────────────
    'app.main',
    'app.routers.pipeline',
    'app.routers.codegen',
    'app.routers.connectors',
    'app.routers.mlflow',
    'app.routers.kubeflow',
    'app.routers.huggingface',
    'app.routers.agent',
    'app.routers.files',
    'app.routers.project',
    'app.routers.integrations',
    # ── App models ────────────────────────────────────────────────────────────
    'app.models.pipeline',
    'app.models.codegen',
    'app.models.project',
    # ── Code generation services ──────────────────────────────────────────────
    'app.services.codegen.engine',
    'app.services.codegen.python_gen',
    'app.services.codegen.notebook_gen',
    'app.services.codegen.kubeflow_gen',
    'app.services.codegen.docker_gen',
    'app.services.codegen.package_gen',
    # ── Executor ─────────────────────────────────────────────────────────────
    'app.services.executor',
    # ── Connectors ───────────────────────────────────────────────────────────
    'app.services.connectors.base',
    'app.services.connectors.local',
    'app.services.connectors.s3',
    'app.services.connectors.azure',
    'app.services.connectors.gcs',
    'app.services.connectors.database',
    # ── MLOps integrations ────────────────────────────────────────────────────
    'app.services.integrations.mlflow_client',
    'app.services.integrations.kubeflow_client',
    'app.services.integrations.huggingface_client',
]

# ── Excluded modules ──────────────────────────────────────────────────────────
# Heavy ML / data-science packages are NOT needed inside the server bundle.
# They are only imported inside generated pipeline scripts, which run as
# separate subprocesses using the user's system Python (see executor.py).
excludes = [
    'torch', 'torchvision', 'torchaudio',
    'tensorflow', 'keras',
    'sklearn', 'scikit_learn',
    'xgboost', 'lightgbm', 'catboost',
    'mlflow',
    'langchain', 'langchain_core', 'langchain_openai',
    'langchain_anthropic', 'langchain_community', 'langchain_ollama',
    'chromadb', 'faiss', 'pinecone',
    'transformers', 'datasets', 'accelerate', 'peft', 'trl',
    'sentence_transformers',
    'matplotlib', 'seaborn', 'scipy', 'numba',
    'PIL', 'Pillow', 'cv2',
    'IPython', 'ipykernel', 'notebook', 'jupyterlab',
    'boto3', 'botocore',
    'azure',
    'google.cloud',
    'sqlalchemy', 'psycopg2',
    'pandas', 'numpy', 'pyarrow',
    'test', 'unittest', 'pytest',
]

a = Analysis(
    ['startup.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,   # onedir mode — keeps binaries in COLLECT for fast startup
    name='conduit-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,            # keep console so Electron can capture stdout/stderr
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='conduit-backend',
)
