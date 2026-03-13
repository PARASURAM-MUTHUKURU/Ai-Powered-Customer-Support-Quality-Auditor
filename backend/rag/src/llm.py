import os
import sys
from pathlib import Path
from google import genai
# Add backend to path to import backoff_util
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from backoff_util import exponential_backoff
from config.prompts import RAG_QA_PROMPT

class GeminiLLM:
    def __init__(self, model_name: str, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = model_name

    @exponential_backoff(max_retries=3)
    def generate(self, question: str, context: str) -> str:
        prompt = RAG_QA_PROMPT.format(context=context, question=question)
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt
        )
        return response.text.strip()