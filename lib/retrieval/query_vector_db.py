"""
Query ChromaDB for the top-k chunks most similar to a user question.

Returns structured results so the caller can either format them for an LLM
or display them raw for debugging.
"""

from dataclasses import dataclass
from pathlib import Path

import chromadb

from lib.embeddings.generate_embedding import embed_query
from lib.embeddings.index_chunks import _get_chroma  # reuse singleton client

DEFAULT_TOP_K = 8


@dataclass
class RetrievedChunk:
    content: str
    file: str
    start_line: int
    end_line: int
    language: str
    repo_url: str
    score: float   # cosine similarity, higher = more relevant


def query_collection(
    question: str,
    collection_name: str,
    top_k: int = DEFAULT_TOP_K,
) -> list[RetrievedChunk]:
    """
    Embed `question` and return the `top_k` most relevant chunks
    from `collection_name`.

    Raises ValueError if the collection does not exist (repo not yet indexed).
    """
    db = _get_chroma()

    try:
        collection = db.get_collection(name=collection_name)
    except Exception:
        raise ValueError(
            f"Collection '{collection_name}' not found. "
            "Run the ingestion pipeline first."
        )

    count = collection.count()
    if count == 0:
        raise ValueError(
            f"Collection '{collection_name}' exists but has no indexed chunks. "
            "Re-run the ingestion pipeline."
        )

    question_vector = embed_query(question)

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=min(top_k, count),
        include=["documents", "metadatas", "distances"],
    )

    chunks: list[RetrievedChunk] = []
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    # ChromaDB returns L2 or cosine *distance* (lower = closer).
    # With hnsw:space=cosine the distance is 1 - similarity.
    distances = results["distances"][0]

    for doc, meta, dist in zip(docs, metas, distances):
        chunks.append(RetrievedChunk(
            content=doc,
            file=meta.get("file", ""),
            start_line=int(meta.get("start_line", 0)),
            end_line=int(meta.get("end_line", 0)),
            language=meta.get("language", ""),
            repo_url=meta.get("repo_url", ""),
            score=round(1.0 - dist, 4),  # convert distance → similarity
        ))

    return chunks
