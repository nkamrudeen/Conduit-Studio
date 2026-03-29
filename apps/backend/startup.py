"""
Conduit Studio backend entry point.

Runs uvicorn programmatically so PyInstaller can bundle the entire server
into a self-contained executable with no external Python dependency.

Usage (normal):  python startup.py [port]
Usage (bundled): conduit-backend[.exe] [port]
"""
from __future__ import annotations

import multiprocessing
import sys


def main() -> None:
    # Required for Windows frozen-multiprocessing support
    multiprocessing.freeze_support()

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        # Disable reload in bundled mode — file watching is meaningless
        reload=False,
    )


if __name__ == "__main__":
    main()
