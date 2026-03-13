print("Importing config...")
from src.config import (
    EMBEDDING_MODEL, EMBEDDING_DIM, LLM_MODEL,
    CHUNK_SIZE, CHUNK_OVERLAP,
    QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME,
    GOOGLE_API_KEY
)
print("Importing document_loader...")
from src.document_loader import load_document
print("Importing chunker...")
from src.chunker import get_recursive_chunker
print("Importing embedder...")
from src.embedder import GeminiEmbedder
print("Importing vector_store...")
from src.vector_store import QdrantVectorStore
print("Importing llm...")
from src.llm import GeminiLLM
print("Imports in pipeline.py finished.")

class RAGPipeline:
    def __init__(self):
        # Gemini embedding-001 defaults to 3072 dimensions
        self.embedder = GeminiEmbedder(EMBEDDING_MODEL, GOOGLE_API_KEY, EMBEDDING_DIM)
        self.chunker = get_recursive_chunker(CHUNK_SIZE, CHUNK_OVERLAP)
        
        # CHANGE reset=True once to wipe the old 'rag_collection'
        self.vector_store = QdrantVectorStore(
            QDRANT_URL, 
            QDRANT_API_KEY, 
            COLLECTION_NAME, 
            EMBEDDING_DIM, 
            reset=False 
        )
        self.llm = GeminiLLM(LLM_MODEL, GOOGLE_API_KEY)

    def ingest_file(self, file_path: str):
        text, source = load_document(file_path)
        if not text:
            return

        # NEW: Skip if already in Qdrant
        if self.vector_store.has_source(source):
            print(f"Skipping {source} (already ingested)")
            return

        docs = self.chunker.create_documents([text], metadatas=[{"source": source}])
        contents = [d.page_content for d in docs]

        print(f"Chunked {len(contents)} pieces from {source}")

        embeddings = self.embedder.embed_documents(contents)
        if not embeddings:
            return

        self.vector_store.upsert(embeddings, contents, source)

    def ingest_data_folder(self):
        from pathlib import Path
        folder = Path("data")
        if not folder.exists() or not folder.is_dir():
            print("Folder 'data/' not found")
            return

        print(f"Scanning {folder.resolve()}")
        count = 0
        for file in folder.iterdir():
            if file.is_file() and file.suffix.lower() in [".pdf", ".docx", ".doc", ".txt"]:
                self.ingest_file(str(file))
                count += 1
        print(f"Finished ingesting {count} files")

    def query(self, question: str, k: int = 5, source_filter: str = None) -> tuple[str, list[dict]]:
        query_vector = self.embedder.embed_query(question)
        retrieved = self.vector_store.search(query_vector, k, source_filter)

        if not retrieved:
            return "No relevant content found.", []

        # Group by source to avoid repetition
        grouped = {}
        for r in retrieved:
            src = r['source']
            if src not in grouped:
                grouped[src] = []
            grouped[src].append(r)

        context_parts = []
        display_sources = []

        for src, chunks in grouped.items():
            context_parts.append(
                f"Source: {src}\n" + "\n".join(c['content'] for c in chunks)
            )
            display_sources.append({
                "source": src,
                "chunks_count": len(chunks),
                "top_score": max(c['score'] for c in chunks)
            })

        context = "\n\n---\n\n".join(context_parts)

        answer = self.llm.generate(question, context)

        return answer, display_sources