"""
Thin wrapper around the Voyage AI embeddings API.

Voyage's `voyage-code-2` model is optimised for code retrieval and produces
1 536-dimensional vectors.  We use `input_type="document"` when indexing
chunks and `input_type="query"` when embedding a user question so Voyage can
apply asymmetric retrieval optimisation internally.

Batching
--------
The API accepts at most 128 texts per request, so we split larger lists
automatically.  Each batch is a separate HTTP call; failures raise immediately
so the caller can decide whether to retry.
"""

from __future__ import annotations

import os
from typing import Literal

import voyageai
from dotenv import load_dotenv

load_dotenv()

_VOYAGE_MODEL = "voyage-code-2"
_MAX_BATCH = 128  # Voyage hard limit per request

_client: voyageai.Client | None = None


def _get_client() -> voyageai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("VOYAGE_API_KEY")
        if not api_key:
            raise EnvironmentError("VOYAGE_API_KEY is not set in the environment.")
        _client = voyageai.Client(api_key=api_key)
    return _client


def embed_texts(
    texts: list[str],
    input_type: Literal["document", "query"] = "document",
) -> list[list[float]]:
    """
    Return one embedding vector per text.

    `input_type="document"` for indexing chunks.
    `input_type="query"`    for user questions at query time.
    """
    if not texts:
        return []

    client = _get_client()
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), _MAX_BATCH):
        batch = texts[i : i + _MAX_BATCH]
        result = client.embed(batch, model=_VOYAGE_MODEL, input_type=input_type)
        all_embeddings.extend(result.embeddings)

    return all_embeddings


def embed_query(question: str) -> list[float]:
    """Convenience wrapper for single-query embedding at retrieval time."""
    return embed_texts([question], input_type="query")[0]
