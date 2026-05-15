"""
Split source files into overlapping token-bounded chunks.

Each chunk carries enough metadata to reconstruct where it came from so the
retrieval layer can surface exact file + line references in answers.

Chunking strategy
-----------------
- Use tiktoken (cl100k_base) for accurate token counts.
- Target: 500 tokens per chunk, 100-token overlap between adjacent chunks.
- Work line-by-line: accumulate lines until budget is reached, then emit.
  Overlap is achieved by rewinding the line cursor by `overlap` tokens.
- Skip chunks that are pure whitespace or suspiciously short (<20 tokens)
  after stripping — they add noise without signal.
"""

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import tiktoken

# Encoding shared by GPT-4, GPT-3.5-turbo, text-embedding-ada-002,
# and voyage-code-2 (close enough for budgeting purposes).
_ENC = tiktoken.get_encoding("cl100k_base")

CHUNK_TARGET_TOKENS = 500
CHUNK_OVERLAP_TOKENS = 100
MIN_CHUNK_TOKENS = 20


@dataclass
class Chunk:
    id: str           # stable MD5 of (file + start_line + content)
    content: str
    file: str         # relative path from repo root
    start_line: int   # 1-indexed, inclusive
    end_line: int     # 1-indexed, inclusive
    language: str     # file extension without the dot, e.g. "py"
    repo_url: str = ""
    token_count: int = 0


def chunk_file(file_path: Path, repo_root: Path, repo_url: str = "") -> list[Chunk]:
    """Return a list of Chunks for a single file."""
    try:
        text = file_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []

    lines = text.splitlines()
    if not lines:
        return []

    rel_path = str(file_path.relative_to(repo_root))
    language = file_path.suffix.lstrip(".").lower()

    # Tokenise every line once upfront so we don't re-tokenise during overlap rewind.
    line_tokens: list[int] = [len(_ENC.encode(line + "\n")) for line in lines]

    chunks: list[Chunk] = []
    cursor = 0  # index into `lines`

    while cursor < len(lines):
        budget = CHUNK_TARGET_TOKENS
        start = cursor
        end = cursor  # exclusive upper bound

        # Accumulate lines until we hit the token budget or run out of lines.
        accumulated = 0
        while end < len(lines) and accumulated + line_tokens[end] <= budget:
            accumulated += line_tokens[end]
            end += 1

        # If a single line exceeds the budget, take it anyway to avoid
        # an infinite loop on very long lines.
        if end == start and end < len(lines):
            end = start + 1
            accumulated = line_tokens[start]

        content = "\n".join(lines[start:end])
        tokens = accumulated  # already counted

        if tokens >= MIN_CHUNK_TOKENS and content.strip():
            chunk_id = hashlib.md5(
                f"{rel_path}:{start}:{content}".encode()
            ).hexdigest()

            chunks.append(Chunk(
                id=chunk_id,
                content=content,
                file=rel_path,
                start_line=start + 1,
                end_line=end,       # end is exclusive, so this == last line number
                language=language,
                repo_url=repo_url,
                token_count=tokens,
            ))

        # Advance cursor, rewinding by overlap so adjacent chunks share context.
        if end >= len(lines):
            break

        # Walk back from `end` until we've shed `CHUNK_OVERLAP_TOKENS` tokens.
        overlap_budget = CHUNK_OVERLAP_TOKENS
        rewind = end
        while rewind > start + 1 and overlap_budget > 0:
            rewind -= 1
            overlap_budget -= line_tokens[rewind]

        cursor = max(rewind, start + 1)  # always advance by at least one line

    return chunks


def chunk_files(
    files: list[Path],
    repo_root: Path,
    repo_url: str = "",
) -> list[Chunk]:
    """Chunk every file and return a flat list of all Chunks."""
    all_chunks: list[Chunk] = []
    for f in files:
        all_chunks.extend(chunk_file(f, repo_root, repo_url))
    return all_chunks
