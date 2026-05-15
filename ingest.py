#!/usr/bin/env python3
"""
Reposage — ingestion entry point.

Clones (or updates) a repo, chunks all indexable files, embeds them with
Voyage AI, and stores the vectors in ChromaDB.  Re-running is safe: only
new/changed chunks are embedded.

Usage:
    python ingest.py <github-url>
    python ingest.py https://github.com/tiangolo/fastapi
"""

import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from lib.ingestion.clone_repo import clone_repo
from lib.ingestion.walk_files import walk_files
from lib.ingestion.chunk_text import chunk_files
from lib.embeddings.index_chunks import index_chunks, collection_name_for


def ingest(github_url: str) -> str:
    """
    Full pipeline: clone → walk → chunk → embed → store.
    Returns the ChromaDB collection name.
    """
    t0 = time.perf_counter()

    repo_path = clone_repo(github_url)
    collection = collection_name_for(github_url)

    print(f"\n[ingest] Scanning files …")
    files = walk_files(repo_path)
    print(f"[ingest] {len(files)} files found")

    print(f"[ingest] Chunking …")
    chunks = chunk_files(files, repo_path, repo_url=github_url)
    print(f"[ingest] {len(chunks)} chunks created")

    indexed = index_chunks(chunks, collection)

    elapsed = time.perf_counter() - t0
    print(f"\n[ingest] Done in {elapsed:.1f}s — collection: '{collection}'")
    print(f"[ingest] {indexed} new chunks indexed  "
          f"({len(chunks) - indexed} already existed)")

    return collection


if __name__ == "__main__":
    if len(sys.argv) < 2:
        url = input("GitHub repo URL: ").strip()
    else:
        url = sys.argv[1]

    if not url:
        print("Error: no URL provided.", file=sys.stderr)
        sys.exit(1)

    ingest(url)
