import hashlib
from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import UnexpectedResponse

class QdrantVectorStore:
    def __init__(self, url: str, api_key: str, collection_name: str, vector_dim: int, reset: bool = False):
        print(f"DEBUG: Initializing QdrantClient with URL: {url}")
        self.client = QdrantClient(url=url, api_key=api_key, timeout=60, check_compatibility=False)
        self.collection_name = collection_name
        
        # If reset is True, we wipe the old collection to fix schema mismatches
        if reset:
            print(f"FORCING RESET: Deleting collection '{collection_name}'...")
            try:
                self.client.delete_collection(collection_name=collection_name)
            except Exception as e:
                print(f"Reset failed (likely collection doesn't exist): {e}") 
        
        try:
            print("DEBUG: Fetching collections from Qdrant...")
            collections = self.client.get_collections()
        except Exception as e:
            print(f"CRITICAL: Failed to get collections from Qdrant at {url}: {e}")
            raise
        exists = any(c.name == collection_name for c in collections.collections)
        
        if not exists:
            # Create with standard UNNAMED vector config
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=vector_dim, distance=models.Distance.COSINE)
            )
            print(f"Created fresh collection: {collection_name} (Dim: {vector_dim})")
            
            # Index source field for efficient skipping
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="source",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
        else:
            print(f"Using existing collection: {collection_name}")

    def upsert(self, embeddings: list[list[float]], contents: list[str], source: str):
        points = []
        for emb, content in zip(embeddings, contents):
            # Deterministic ID avoids duplicates on re-ingestion
            point_id = hashlib.md5(f"{source}_{content}".encode()).hexdigest()
            points.append(
                models.PointStruct(
                    id=point_id, 
                    vector=emb, # Matches the unnamed VectorParams config
                    payload={"source": source, "content": content}
                )
            )
        
        try:
            self.client.upsert(collection_name=self.collection_name, points=points)
            print(f"Successfully upserted {len(points)} points from {source}")
        except UnexpectedResponse as e:
            print(f"UPSERT FAILED: {e}")
            print("TIP: Set 'reset=True' in RAGPipeline once to align your collection schema.")

    def search(self, query_vector: list[float], k: int = 5, source_filter: str = None) -> list[dict]:
        query_filter = None
        if source_filter:
            query_filter = models.Filter(
                must=[models.FieldCondition(key="source", match=models.MatchValue(value=source_filter))]
            )

        # 'query_points' is the modern and most robust method in newer qdrant-client versions
        response = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=k,
            query_filter=query_filter,
            with_payload=True
        )

        return [
            {
                "content": hit.payload.get("content", ""),
                "source": hit.payload.get("source", "unknown"),
                "score": hit.score
            }
            for hit in response.points
        ]

    def has_source(self, source_name: str) -> bool:
        """Check if any points exist for the given source name."""
        try:
            # results[0] is the list of points, results[1] is the next offset
            results = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[models.FieldCondition(key="source", match=models.MatchValue(value=source_name))]
                ),
                limit=1,
                with_payload=False,
                with_vectors=False
            )
            return len(results[0]) > 0
        except Exception as e:
            print(f"Error checking source existence: {e}")
            return False