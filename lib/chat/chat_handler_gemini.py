"""
Stateful chat handler using Google Gemini.

Drop-in replacement for chat_handler.py — same ChatSession interface,
backed by gemini-1.5-flash instead of Claude.
"""

import os
from dataclasses import dataclass, field

from google import genai
from google.genai import types
from dotenv import load_dotenv

from lib.retrieval.query_vector_db import query_collection
from lib.retrieval.build_context import build_context
from lib.chat.prompt_builder import SYSTEM_PROMPT, build_user_message

load_dotenv()

_MODEL = "gemini-2.5-flash"

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY is not set.")
        _client = genai.Client(api_key=api_key)
    return _client


def _to_gemini_history(history: list[dict]) -> list[types.Content]:
    """Convert [{role, content}] to Gemini Content objects."""
    role_map = {"user": "user", "assistant": "model"}
    return [
        types.Content(role=role_map[m["role"]], parts=[types.Part(text=m["content"])])
        for m in history
    ]


@dataclass
class ChatSession:
    collection_name: str
    history: list[dict] = field(default_factory=list)  # [{role, content}, …]

    def _build_contents(self, question: str) -> tuple[list[types.Content], list[dict]]:
        """Retrieve context and return (contents_for_gemini, references)."""
        chunks = query_collection(question, self.collection_name, top_k=8)
        context, references = build_context(chunks)
        grounded_message = build_user_message(question, context)
        contents = _to_gemini_history(self.history) + [
            types.Content(role="user", parts=[types.Part(text=grounded_message)])
        ]
        return contents, references

    def ask(self, question: str, top_k: int = 8) -> tuple[str, list[dict]]:
        """Blocking call — returns (answer, references)."""
        contents, references = self._build_contents(question)
        response = _get_client().models.generate_content(
            model=_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
        )
        answer = response.text
        self.history.append({"role": "user", "content": question, "refs": []})
        self.history.append({"role": "assistant", "content": answer, "refs": references})
        return answer, references

    def ask_stream(self, question: str):
        """
        Generator that yields (token, references) tuples.
        `references` is non-empty only on the final chunk (token == None).
        """
        contents, references = self._build_contents(question)
        full_answer = []
        for chunk in _get_client().models.generate_content_stream(
            model=_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
        ):
            token = chunk.text or ""
            full_answer.append(token)
            yield token, []

        answer = "".join(full_answer)
        self.history.append({"role": "user", "content": question, "refs": []})
        self.history.append({"role": "assistant", "content": answer, "refs": references})
        yield None, references  # sentinel with final refs

    def reset(self) -> None:
        """Clear conversation history (start fresh without re-indexing)."""
        self.history.clear()
