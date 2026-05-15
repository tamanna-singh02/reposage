"""
Assemble retrieved chunks into a single context block for the LLM prompt.

Each chunk is fenced with its file path and line range so the model can
cite exact locations in its answer.  Chunks are ordered by score (highest
first) and the total is capped at `max_tokens` to stay within model limits.
"""

import tiktoken

from lib.retrieval.query_vector_db import RetrievedChunk

_ENC = tiktoken.get_encoding("cl100k_base")
DEFAULT_MAX_CONTEXT_TOKENS = 6_000


def build_context(
    chunks: list[RetrievedChunk],
    max_tokens: int = DEFAULT_MAX_CONTEXT_TOKENS,
) -> tuple[str, list[dict]]:
    """
    Return `(context_string, references)`.

    `context_string` is the formatted block to paste into the prompt.
    `references` is a list of dicts with file/line info for the UI.

    Chunks that would push the total over `max_tokens` are silently dropped.
    """
    # Best chunks first
    ranked = sorted(chunks, key=lambda c: c.score, reverse=True)

    sections: list[str] = []
    references: list[dict] = []
    used_tokens = 0

    for chunk in ranked:
        header = f"### {chunk.file} (lines {chunk.start_line}–{chunk.end_line})"
        body = f"```{chunk.language}\n{chunk.content}\n```"
        block = f"{header}\n{body}"

        block_tokens = len(_ENC.encode(block))
        if used_tokens + block_tokens > max_tokens:
            break

        sections.append(block)
        used_tokens += block_tokens
        references.append({
            "file": chunk.file,
            "start_line": chunk.start_line,
            "end_line": chunk.end_line,
            "score": chunk.score,
            "repo_url": chunk.repo_url,
        })

    context = "\n\n".join(sections)
    return context, references
