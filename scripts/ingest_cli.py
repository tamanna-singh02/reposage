#!/usr/bin/env python3
"""
Ingestion CLI — Part 1 smoke test.

Runs the full ingestion pipeline (clone → walk → chunk) and prints a
summary to the console.  Does NOT embed or store anything yet.

Usage:
    python scripts/ingest_cli.py <github-url>
    python scripts/ingest_cli.py https://github.com/tiangolo/fastapi
"""

import sys
import time
from collections import defaultdict
from pathlib import Path

# Make sure the project root is on the path regardless of where this is run from.
PROJECT_ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from lib.ingestion.clone_repo import clone_repo
from lib.ingestion.walk_files import walk_files
from lib.ingestion.chunk_text import chunk_files


def main(github_url: str) -> None:
    t0 = time.perf_counter()
    print(f"\n{'='*60}")
    print(f"  REPOSAGE — Ingestion Pipeline (Part 1)")
    print(f"  Repo: {github_url}")
    print(f"{'='*60}\n")

    # ── 1. Clone / pull ───────────────────────────────────────
    repo_path = clone_repo(github_url)

    # ── 2. Walk files ─────────────────────────────────────────
    print(f"\n[walk_files] Scanning …")
    files = walk_files(repo_path)
    print(f"[walk_files] {len(files)} indexable files found\n")

    # Group by extension for a quick language breakdown
    by_ext: dict[str, int] = defaultdict(int)
    for f in files:
        by_ext[f.suffix or "(none)"] += 1
    for ext, count in sorted(by_ext.items(), key=lambda x: -x[1])[:10]:
        print(f"  {ext:<12} {count:>4} files")
    if len(by_ext) > 10:
        print(f"  … and {len(by_ext) - 10} more extension types")

    # ── 3. Chunk ──────────────────────────────────────────────
    print(f"\n[chunk_text] Chunking {len(files)} files …")
    chunks = chunk_files(files, repo_path, repo_url=github_url)
    elapsed = time.perf_counter() - t0

    total_tokens = sum(c.token_count for c in chunks)
    avg_tokens = total_tokens / len(chunks) if chunks else 0

    print(f"[chunk_text] {len(chunks)} chunks created in {elapsed:.1f}s")
    print(f"\n{'─'*60}")
    print(f"  Total chunks  : {len(chunks)}")
    print(f"  Total tokens  : {total_tokens:,}")
    print(f"  Avg tokens/chunk: {avg_tokens:.0f}")
    print(f"{'─'*60}\n")

    # ── 4. Sample output ──────────────────────────────────────
    print("Sample chunks (first 3):\n")
    for chunk in chunks[:3]:
        print(f"  File      : {chunk.file}")
        print(f"  Lines     : {chunk.start_line}–{chunk.end_line}")
        print(f"  Tokens    : {chunk.token_count}")
        print(f"  ID        : {chunk.id}")
        preview = chunk.content[:120].replace("\n", "↵")
        print(f"  Preview   : {preview} …")
        print()

    print(f"Ready to embed. Next step: lib/embeddings/")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        url = input("GitHub repo URL: ").strip()
    else:
        url = sys.argv[1]

    if not url:
        print("Error: no URL provided.", file=sys.stderr)
        sys.exit(1)

    main(url)
