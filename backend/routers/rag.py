from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from auth_utils import get_current_user
from pydantic import BaseModel
import shutil
import logging
from pathlib import Path
import sys

logger = logging.getLogger("rag_router")

# Add RAG directory to sys.path for imports
BACKEND_PATH = Path(__file__).parent.parent
RAG_PATH = BACKEND_PATH / "rag"
sys.path.append(str(RAG_PATH))

router = APIRouter(prefix="/api/rag", tags=["RAG"], dependencies=[Depends(get_current_user)])

# Lazy initialization — avoids crashing the server if Qdrant is unreachable at startup
_rag_pipeline = None
_rag_init_error = None

def get_rag_pipeline():
    global _rag_pipeline, _rag_init_error
    if _rag_pipeline is not None:
        return _rag_pipeline
    try:
        from src.pipeline import RAGPipeline
        _rag_pipeline = RAGPipeline()
        _rag_init_error = None
        logger.info("RAGPipeline initialized successfully.")
        return _rag_pipeline
    except Exception as e:
        _rag_init_error = str(e)
        logger.error(f"RAGPipeline failed to initialize: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"RAG service is currently unavailable (Qdrant connection failed): {e}"
        )

class RAGQueryRequest(BaseModel):
    question: str

@router.post("/query")
async def rag_query(request: RAGQueryRequest):
    pipeline = get_rag_pipeline()
    try:
        answer, sources = pipeline.query(request.question)
        return {"answer": answer, "sources": sources}
    except Exception as e:
        logger.error(f"RAG Query Error: {e}")
        return {
            "answer": "An internal error occurred while processing your request. Please try again later.",
            "sources": [],
            "error": str(e)
        }

@router.post("/ingest")
async def rag_ingest(file: UploadFile = File(...)):
    pipeline = get_rag_pipeline()
    # Create temp directory if not exists
    temp_dir = BACKEND_PATH / "temp_ingest"
    temp_dir.mkdir(exist_ok=True)

    file_path = temp_dir / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        pipeline.ingest_file(str(file_path))
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if file_path.exists():
            file_path.unlink()

@router.get("/status")
async def rag_status():
    """Check if the RAG pipeline / Qdrant is available."""
    if _rag_pipeline is not None:
        return {"status": "available"}
    return {
        "status": "unavailable",
        "reason": _rag_init_error or "Not yet initialized"
    }
