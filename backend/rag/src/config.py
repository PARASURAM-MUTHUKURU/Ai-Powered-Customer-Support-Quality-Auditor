from pathlib import Path
import os
from dotenv import load_dotenv

# Robustly load .env.local from the backend directory
backend_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=backend_dir / ".env.local", override=True)

BASE_DIR = Path(__file__).parent.parent

EMBEDDING_MODEL = "models/gemini-embedding-001"
LLM_MODEL       = "gemini-2.5-flash-lite"
EMBEDDING_DIM   = 768

CHUNK_SIZE      = 1000
CHUNK_OVERLAP   = 200

import socket

QDRANT_URL      = os.getenv("QDRANT_URL").strip() if os.getenv("QDRANT_URL") else None
QDRANT_API_KEY  = os.getenv("QDRANT_API_KEY").strip() if os.getenv("QDRANT_API_KEY") else None
COLLECTION_NAME = "rag_collection"

# If QDRANT_URL points to host "qdrant" or "auditai-qdrant" but it's not resolvable (running outside Docker network),
# fallback to localhost.
if QDRANT_URL:
    for docker_host in ["qdrant", "auditai-qdrant"]:
        if f"//{docker_host}:" in QDRANT_URL or f"//{docker_host}/" in QDRANT_URL:
            try:
                socket.gethostbyname(docker_host)
            except socket.gaierror:
                QDRANT_URL = QDRANT_URL.replace(f"//{docker_host}:", "//localhost:").replace(f"//{docker_host}/", "//localhost/")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY").strip() if os.getenv("GOOGLE_API_KEY") else None
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY missing")
if not QDRANT_API_KEY or not QDRANT_URL:
    raise ValueError("QDRANT_API_KEY / QDRANT_URL missing")