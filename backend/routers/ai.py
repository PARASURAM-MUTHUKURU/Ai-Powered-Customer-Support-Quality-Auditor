import os
import json
import base64
from fastapi import APIRouter, Depends
from auth_utils import get_current_user
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv
from pathlib import Path
import sys

# Add backend dir to path for imports
BACKEND_PATH = Path(__file__).parent.parent
sys.path.append(str(BACKEND_PATH))
from backoff_util import async_exponential_backoff
from config.prompts import AUDIT_PROMPT_TEMPLATE, TRANSCRIBE_DIARIZATION_PROMPT
from database import increment_api_usage, get_api_usage_stats

# Environment variables already loaded in main.py
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

router = APIRouter(prefix="/api/ai", tags=["AI"], dependencies=[Depends(get_current_user)])

class AuditAIRequest(BaseModel):
    transcript: str
    type: str

@router.post("/audit")
@async_exponential_backoff(max_retries=3)
async def ai_audit_transcript(request: AuditAIRequest):
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    prompt = AUDIT_PROMPT_TEMPLATE.format(
        transcript_type=request.type,
        transcript=request.transcript
    )
    
    # Increment Gemini usage (specific model)
    increment_api_usage(model_name)
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "OBJECT",
                    "properties": {
                        "empathy_score": {"type": "INTEGER"},
                        "resolution_score": {"type": "INTEGER"},
                        "compliance_score": {"type": "INTEGER"},
                        "overall_score": {"type": "INTEGER"},
                        "violations": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "type": {"type": "STRING"},
                                    "description": {"type": "STRING"},
                                    "severity": {"type": "STRING"},
                                    "transcript_line_index": {"type": "INTEGER"}
                                },
                                "required": ["type", "description", "severity", "transcript_line_index"]
                            }
                        },
                        "suggestions": {"type": "STRING"}
                    },
                    "required": ["empathy_score", "resolution_score", "compliance_score", "overall_score", "violations", "suggestions"]
                }
            }
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini Audit Error: {e}")
        return {"error": str(e)}

class TranscribeRequest(BaseModel):
    base64_data: str
    mime_type: str

@router.post("/transcribe")
@async_exponential_backoff(max_retries=3)
async def ai_transcribe_audio(request: TranscribeRequest):
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    import tempfile
    
    try:
        data = base64.b64decode(request.base64_data)
        
        # Determine extension based on mime_type
        ext = ".wav"
        if "mpeg" in request.mime_type or "mp3" in request.mime_type:
            ext = ".mp3"
        elif "mp4" in request.mime_type or "m4a" in request.mime_type:
            ext = ".m4a"
        elif "ogg" in request.mime_type:
            ext = ".ogg"
            
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_audio:
            temp_audio.write(data)
            temp_path = temp_audio.name
            
        try:
            # Upload file via File API to support larger files
            uploaded_file = client.files.upload(file=temp_path, config={'mime_type': request.mime_type})
            
            # Increment Gemini usage (specific model)
            increment_api_usage(model_name)
            
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    uploaded_file,
                    TRANSCRIBE_DIARIZATION_PROMPT
                ]
            )
            
            # Clean up the uploaded file from Gemini
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as cleanup_error:
                print(f"Failed to delete file from Gemini: {cleanup_error}")
                
            return {"transcript": response.text}
        except Exception as api_error:
            print(f"Gemini API Error: {api_error}")
            return {"error": f"API Error: {str(api_error)}"}
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        print(f"Gemini Transcribe Error: {e}")
        return {"error": str(e)}

@router.get("/usage")
async def get_gemini_usage():
    """Returns Gemini API usage and limits for all tracked models."""
    stats = get_api_usage_stats()
    
    # Define standard limits
    limits = {
        "gemini-2.5-flash": 20,
        "gemini-2.5-flash-lite": 20,
        "models/gemini-embedding-001": 1000,
        "gemini_embed": 1000 # Legacy fallback
    }
    
    usage_data = {}
    for s in stats:
        service_name = s["service"]
        usage_data[service_name] = s["request_count"]
        # Ensure we have a limit for any new gemini model found, default to 20
        if service_name.startswith("gemini-") and service_name not in limits:
            limits[service_name] = 20

    return {
        "usage": usage_data,
        "limits": limits
    }
