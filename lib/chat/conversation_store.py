"""
Persist chat sessions to disk so users can reference past conversations.

Each collection gets its own JSON file at:
    conversations/<collection>.json

Sessions are appended on save and never mutated, so the file is
always a valid append-only log of conversations for that repo.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

_CONV_DIR = Path(__file__).parents[2] / "conversations"


class ConversationStore:
    def __init__(self, collection_name: str) -> None:
        self._path = _CONV_DIR / f"{collection_name}.json"
        _CONV_DIR.mkdir(parents=True, exist_ok=True)

    def _load(self) -> list[dict]:
        if not self._path.exists():
            return []
        try:
            return json.loads(self._path.read_text())
        except Exception:
            return []

    def _save(self, sessions: list[dict]) -> None:
        self._path.write_text(json.dumps(sessions, indent=2))

    def save_session(self, messages: list[dict]) -> str:
        """
        Persist a list of messages as a new saved session.

        `messages` should be [{role, content, refs}, …].
        Returns the new session id.
        """
        # Derive a label from the first user question
        first_q = next(
            (m["content"] for m in messages if m.get("role") == "user"), ""
        )
        label = first_q[:80] + ("…" if len(first_q) > 80 else "")

        session = {
            "id": uuid.uuid4().hex,
            "saved_at": datetime.now(timezone.utc).isoformat(),
            "label": label,
            "messages": messages,
        }

        sessions = self._load()
        sessions.append(session)
        self._save(sessions)
        return session["id"]

    def list_sessions(self) -> list[dict]:
        """Return session summaries sorted newest-first."""
        sessions = self._load()
        summaries = [
            {
                "id": s["id"],
                "saved_at": s["saved_at"],
                "label": s.get("label", ""),
                "message_count": len(s.get("messages", [])),
            }
            for s in sessions
        ]
        return sorted(summaries, key=lambda s: s["saved_at"], reverse=True)

    def get_session(self, session_id: str) -> dict | None:
        """Return full session dict, or None if not found."""
        for s in self._load():
            if s["id"] == session_id:
                return s
        return None
