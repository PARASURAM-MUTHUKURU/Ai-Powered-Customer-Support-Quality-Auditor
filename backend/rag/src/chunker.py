import re

class SimpleChunker:
    def __init__(self, chunk_size=1000, chunk_overlap=200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def create_documents(self, texts, metadatas=None):
        docs = []
        for i, text in enumerate(texts):
            meta = metadatas[i] if metadatas else {}
            # Simple splitting by sentences/newlines
            words = text.split(' ')
            current_chunk = []
            current_len = 0
            
            for word in words:
                if current_len + len(word) > self.chunk_size:
                    content = ' '.join(current_chunk)
                    docs.append(Document(page_content=content, metadata=meta))
                    # Keep overlap
                    overlap_words = current_chunk[-max(1, int(len(current_chunk)*0.2)):]
                    current_chunk = overlap_words + [word]
                    current_len = sum(len(w) for w in current_chunk)
                else:
                    current_chunk.append(word)
                    current_len += len(word) + 1
            
            if current_chunk:
                docs.append(Document(page_content=' '.join(current_chunk), metadata=meta))
        return docs

class Document:
    def __init__(self, page_content, metadata):
        self.page_content = page_content
        self.metadata = metadata

def get_recursive_chunker(chunk_size: int = 1000, chunk_overlap: int = 200):
    return SimpleChunker(chunk_size, chunk_overlap)