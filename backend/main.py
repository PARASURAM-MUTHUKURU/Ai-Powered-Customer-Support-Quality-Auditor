import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()
load_dotenv(".env.local")

from routers import agents, audits, analytics, ai, rag, config, alerts, reports
# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("main")

# Check for required API keys early
GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not GEMINI_KEY:
    logger.error("CRITICAL: GEMINI_API_KEY or GOOGLE_API_KEY is missing from environment variables.")
else:
    logger.info("Validated Gemini/Google API key configuration.")

from database import close_db_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("Quality Auditor API: Engine starting up...")
    yield
    # Shutdown logic
    logger.info("Quality Auditor API: Shutting down...")
    close_db_pool()

app = FastAPI(lifespan=lifespan)

# Restrict CORS for Production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
logger.info(f"CORS Allowed Origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with explicit logging
try:
    app.include_router(agents.router)
    app.include_router(audits.router)
    app.include_router(analytics.router)
    app.include_router(ai.router)
    app.include_router(rag.router)
    app.include_router(config.router)
    app.include_router(alerts.router)
    app.include_router(reports.router)
    logger.info("Successfully loaded system routers (RAG disabled).")
except Exception as e:
    logger.error(f"FAILED to load one or more routers: {str(e)}")
    raise

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.1"}

@app.get("/")
def root():
    return {"message": "Quality Auditor API is running", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    # Use environment variables for port/host in production
    port = int(os.getenv("PORT", 3000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

