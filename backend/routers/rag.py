from fastapi import APIRouter, UploadFile, File, Depends
from auth_utils import get_current_user
from pydantic import BaseModel
import shutil
from pathlib import Path
import sys

# Add RAG directory to sys.path for imports
BACKEND_PATH = Path(__file__).parent.parent
RAG_PATH = BACKEND_PATH / "rag"
sys.path.append(str(RAG_PATH))
from src.pipeline import RAGPipeline

router = APIRouter(prefix="/api/rag", tags=["RAG"], dependencies=[Depends(get_current_user)])
rag_pipeline = RAGPipeline()

class RAGQueryRequest(BaseModel):
    question: str

@router.post("/query")
async def rag_query(request: RAGQueryRequest):
    try:
        answer, sources = rag_pipeline.query(request.question)
        return {"answer": answer, "sources": sources}
    except Exception as e:
        print(f"RAG Query Error: {e}")
        return {
            "answer": "An internal error occurred while processing your request. Please try again later.",
            "sources": [],
            "error": str(e)
        }

@router.post("/ingest")
async def rag_ingest(file: UploadFile = File(...)):
    # Create temp directory if not exists
    temp_dir = BACKEND_PATH / "temp_ingest"
    temp_dir.mkdir(exist_ok=True)
    
    file_path = temp_dir / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        rag_pipeline.ingest_file(str(file_path))
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        # Clean up temp file
        if file_path.exists():
            file_path.unlink()
