"""
ConduitCraft AI backend entry point.

Runs uvicorn programmatically so PyInstaller can bundle the entire server
into a self-contained executable with no external Python dependency.

Usage (normal):  python startup.py [port]
Usage (bundled): conduit-backend[.exe] [port]
"""
from __future__ import annotations

import logging
import multiprocessing
import sys
import traceback
from pathlib import Path


def _setup_log_file() -> Path:
    """Return a writable log path next to the executable (or cwd in dev)."""
    if getattr(sys, "frozen", False):
        log_dir = Path(sys.executable).parent
    else:
        log_dir = Path(__file__).parent
    log_path = log_dir / "conduit-backend.log"
    return log_path


def main() -> None:
    # Required for Windows frozen-multiprocessing support
    multiprocessing.freeze_support()

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    log_path = _setup_log_file()

    # Write startup banner immediately — visible even if uvicorn import fails
    try:
        with log_path.open("w", encoding="utf-8") as fh:
            fh.write(f"ConduitCraft AI backend starting on port {port}\n")
            fh.write(f"Python: {sys.version}\n")
            fh.write(f"Executable: {sys.executable}\n")
            fh.write(f"frozen: {getattr(sys, 'frozen', False)}\n")
    except Exception:
        pass  # If we can't write logs, don't crash — just continue

    # Route all Python logging to the same file
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_path, mode="a", encoding="utf-8"),
        ],
        force=True,
    )

    logger = logging.getLogger("conduit.startup")
    logger.info("Log file: %s", log_path)

    try:
        import uvicorn  # noqa: PLC0415
    except ImportError:
        msg = "uvicorn not found — the bundle may be incomplete. Run pyinstaller conduit-backend.spec"
        logger.error(msg)
        sys.exit(1)

    try:
        logger.info("Importing app.main …")
        import app.main  # noqa: PLC0415, F401  — force-import to catch errors early
        logger.info("app.main imported OK")
    except Exception:
        logger.error("Failed to import app.main:\n%s", traceback.format_exc())
        sys.exit(1)

    logger.info("Starting uvicorn on 127.0.0.1:%d", port)
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=False,
        loop="asyncio",
    )


if __name__ == "__main__":
    main()
