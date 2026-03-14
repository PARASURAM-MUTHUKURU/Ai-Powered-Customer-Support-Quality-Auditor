import sys
from pathlib import Path
from google import genai

# Add backend to path to import backoff_util
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from backoff_util import exponential_backoff
from database import increment_api_usage

class GeminiEmbedder:
    def __init__(self, model_name: str, api_key: str, dimension: int):
        self.client = genai.Client(api_key=api_key)
        self.model = model_name
        self.dimension = dimension

    @exponential_backoff(max_retries=3)
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
            
        all_embeddings = []
        batch_size = 16 # Safe batch size for Gemini embedding API
        
        try:
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                # Increment Gemini usage (Embedding)
                increment_api_usage("gemini_embed")
                
                result = self.client.models.embed_content(
                    model=self.model,
                    contents=batch,
                    config={
                        "task_type": "retrieval_document",
                        "output_dimensionality": self.dimension
                    }
                )
                all_embeddings.extend([e.values for e in result.embeddings])
            return all_embeddings
        except Exception as e:
            print(f"Embedding failed: {e}")
            return []

    @exponential_backoff(max_retries=3)
    def embed_query(self, query: str) -> list[float]:
        try:
            # Increment Gemini usage (Embedding)
            increment_api_usage("gemini_embed")
            
            result = self.client.models.embed_content(
                model=self.model,
                contents=query,
                config={
                    "task_type": "retrieval_query",
                    "output_dimensionality": self.dimension
                }
            )
            if not result.embeddings:
                return []
            return result.embeddings[0].values
        except Exception as e:
            print(f"Embedding query failed: {e}")
            return []