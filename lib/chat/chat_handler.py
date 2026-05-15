"""
Stateful chat handler: maintains conversation history and calls the Anthropic API.

Each ChatSession is scoped to a single indexed repository.  Conversation
history is kept in memory; callers that need persistence should serialise
`session.history` themselves.
"""

import os
from dataclasses import dataclass, field

import anthropic
from dotenv import load_dotenv

from lib.retrieval.query_vector_db import query_collection
from lib.retrieval.build_context import build_context
from lib.chat.prompt_builder import SYSTEM_PROMPT, build_user_message

load_dotenv()

_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 2048

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY is not set.")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


@dataclass
class ChatSession:
    collection_name: str
    history: list[dict] = field(default_factory=list)  # [{role, content}, …]

    def ask(self, question: str, top_k: int = 8) -> tuple[str, list[dict]]:
        """
        Retrieve relevant chunks, build a grounded prompt, call the LLM.

        Returns `(answer_text, references)` where `references` is a list of
        dicts with file/line info that the UI can render as source citations.
        """
        # Retrieve + build context
        chunks = query_collection(question, self.collection_name, top_k=top_k)
        context, references = build_context(chunks)

        # Inject context only for the current turn; history stores bare questions
        # so prior turns don't bloat the payload with stale 6k-token context blocks.
        grounded_message = build_user_message(question, context)
        messages = self.history + [{"role": "user", "content": grounded_message}]

        response = _get_client().messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        answer = response.content[0].text

        # Persist bare question + answer so follow-ups have conversational context
        # without re-sending stale context blocks.
        self.history.append({"role": "user", "content": question})
        self.history.append({"role": "assistant", "content": answer})

        return answer, references

    def reset(self) -> None:
        """Clear conversation history (start fresh without re-indexing)."""
        self.history.clear()
