"""
Embed chunks with Voyage AI and persist them in ChromaDB.

Design decisions
----------------
- Idempotent: existing chunk IDs are fetched first; only new chunks are
  embedded and upserted, so re-indexing a repo after a pull is cheap.
- Collection name is derived from the repo name; illegal characters are
  replaced so ChromaDB accepts the name.
- Each document's metadata stores everything needed to reconstruct a
  file reference (path, line range, language) for display in answers.
"""

from __future__ import annotations

import os
from pathlib import Path

import chromadb
from dotenv import load_dotenv

from lib.ingestion.chunk_text import Chunk
from lib.embeddings.generate_embedding import embed_texts

load_dotenv()

_CHROMA_PATH = Path(__file__).parents[2] / "chroma_db"
_EMBED_BATCH = 128  # keep in sync with Voyage limit

_chroma: chromadb.PersistentClient | None = None


def _get_chroma() -> chromadb.PersistentClient:
    global _chroma
    if _chroma is None:
        _chroma = chromadb.PersistentClient(path=str(_CHROMA_PATH))
    return _chroma


def collection_name_for(repo_url: str) -> str:
    """Derive a ChromaDB-safe collection name from a repo URL."""
    name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    # ChromaDB only allows [a-zA-Z0-9_-] and length 3-512
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
    return safe[:50] or "repo"


def index_chunks(chunks: list[Chunk], collection_name: str) -> int:
    """
    Embed and store `chunks` in the named ChromaDB collection.

    Returns the number of newly indexed chunks (0 if all were already present).
    """
    if not chunks:
        return 0

    db = _get_chroma()
    collection = db.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # Pull only IDs to avoid fetching large document blobs
    existing_ids: set[str] = set(collection.get(include=[])["ids"])
    new_chunks = [c for c in chunks if c.id not in existing_ids]

    if not new_chunks:
        print(f"[index_chunks] All {len(chunks)} chunks already indexed — skipping.")
        return 0

    print(f"[index_chunks] Embedding {len(new_chunks)} new chunks …")

    for i in range(0, len(new_chunks), _EMBED_BATCH):
        batch = new_chunks[i : i + _EMBED_BATCH]
        texts = [c.content for c in batch]

        embeddings = embed_texts(texts, input_type="document")

        collection.upsert(
            ids=[c.id for c in batch],
            embeddings=embeddings,
            documents=[c.content for c in batch],
            metadatas=[
                {
                    "file": c.file,
                    "start_line": c.start_line,
                    "end_line": c.end_line,
                    "language": c.language,
                    "repo_url": c.repo_url,
                    "token_count": c.token_count,
                }
                for c in batch
            ],
        )

        batch_num = i // _EMBED_BATCH + 1
        total_batches = (len(new_chunks) - 1) // _EMBED_BATCH + 1
        print(f"  stored batch {batch_num}/{total_batches} "
              f"({min(i + _EMBED_BATCH, len(new_chunks))}/{len(new_chunks)} chunks)")

    return len(new_chunks)
