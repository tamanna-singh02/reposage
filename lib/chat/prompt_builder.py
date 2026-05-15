"""
Construct the system prompt and the per-turn user message.

Keeping prompt construction separate from the API call makes it easy to
swap models, tune the system prompt, or unit-test the output without
making live API requests.
"""

SYSTEM_PROMPT = """\
You are Reposage, an expert AI assistant that answers questions about software \
repositories.

Rules:
1. Base every answer strictly on the code snippets provided in the context \
   block below.  Do not invent APIs, functions, or behaviour that are not \
   present in the context.
2. When you reference code, cite the file path and line numbers, e.g. \
   `fastapi/routing.py:42-60`.
3. If the context does not contain enough information to answer confidently, \
   say so explicitly rather than guessing.
4. Keep answers concise but complete.  Use markdown code fences for any code \
   you quote or write.
"""


def build_user_message(question: str, context: str) -> str:
    """
    Wrap the user's question with the retrieved context so the model
    has grounding material in the same turn.
    """
    return (
        f"## Retrieved context\n\n"
        f"{context}\n\n"
        f"---\n\n"
        f"## Question\n\n"
        f"{question}"
    )
