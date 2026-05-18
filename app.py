#!/usr/bin/env python3
"""
Reposage — FastAPI web server.

Exposes ingestion and chat as a REST+SSE API and serves the frontend
from ./static/.

Run:
    ./venv/bin/uvicorn app:app --reload --port 8000
"""

import asyncio
import json
import sys
import threading
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.requests import Request

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from lib.ingestion.clone_repo import clone_repo
from lib.ingestion.walk_files import walk_files
from lib.ingestion.chunk_text import chunk_files
from lib.embeddings.index_chunks import index_chunks, collection_name_for, _get_chroma
from lib.chat.chat_handler_gemini import ChatSession
from lib.chat.conversation_store import ConversationStore
from lib.auth.database import init_db, get_db
from lib.auth.models import User
from lib.auth.schemas import UserCreate, UserLogin, Token, UserOut
from lib.auth.auth_utils import hash_password, verify_password, create_token, decode_token

# ── Metadata persistence ───────────────────────────────────────────────────────

_REPOS_META_PATH = PROJECT_ROOT / "repos_meta.json"


def _load_meta() -> dict:
    if _REPOS_META_PATH.exists():
        try:
            return json.loads(_REPOS_META_PATH.read_text())
        except Exception:
            return {}
    return {}


def _save_meta(meta: dict) -> None:
    _REPOS_META_PATH.write_text(json.dumps(meta, indent=2))


# ── In-memory chat sessions ────────────────────────────────────────────────────

_sessions: dict[str, ChatSession] = {}


def _get_session(collection: str) -> ChatSession:
    if collection not in _sessions:
        _sessions[collection] = ChatSession(collection_name=collection)
    return _sessions[collection]


def _increment_questions(collection: str) -> None:
    meta = _load_meta()
    if collection in meta:
        meta[collection]["questions"] = meta[collection].get("questions", 0) + 1
        _save_meta(meta)


# ── Language detection ─────────────────────────────────────────────────────────

_EXT_LANG = {
    ".py": "Python", ".pyi": "Python",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".java": "Java", ".go": "Go", ".rs": "Rust",
    ".rb": "Ruby", ".php": "PHP", ".cs": "C#",
    ".cpp": "C++", ".cc": "C++", ".c": "C", ".h": "C",
    ".swift": "Swift", ".kt": "Kotlin", ".scala": "Scala",
    ".sh": "Shell", ".bash": "Shell",
}


def _dominant_lang(files: list[Path]) -> str:
    counts: Counter = Counter()
    for f in files:
        lang = _EXT_LANG.get(f.suffix.lower())
        if lang:
            counts[lang] += 1
    return counts.most_common(1)[0][0] if counts else "Unknown"


# ── Request models ─────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    url: str


class ChatRequest(BaseModel):
    message: str


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Reposage")


@app.on_event("startup")
async def startup():
    init_db()


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and not path.startswith("/api/auth/") and not path.startswith("/api/share/"):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not token or not decode_token(token):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


# ── Routes ─────────────────────────────────────────────────────────────────────

# ── Auth ───────────────────────────────────────────────────────────────────────

from sqlalchemy.orm import Session
from fastapi import Depends


@app.post("/api/auth/register", response_model=UserOut, status_code=201)
async def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login", response_model=Token)
async def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    return Token(access_token=create_token(user.id, user.email))


@app.get("/api/auth/me", response_model=UserOut)
async def me(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user

class UpdateProfileRequest(BaseModel):
    name: str | None = None
    current_password: str | None = None
    new_password: str | None = None


@app.patch("/api/auth/me", response_model=UserOut)
async def update_me(body: UpdateProfileRequest, request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(404, "User not found")
    if body.name is not None:
        user.name = body.name.strip()
    if body.new_password:
        if not body.current_password or not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(400, "Current password is incorrect")
        user.hashed_password = hash_password(body.new_password)
    db.commit()
    db.refresh(user)
    return user


@app.delete("/api/auth/me", status_code=204)
async def delete_me(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user:
        db.delete(user)
        db.commit()


@app.get("/api/repos/{collection}/files")
async def repo_files(collection: str):
    meta = _load_meta()
    info = meta.get(collection)
    if not info or not info.get("url"):
        raise HTTPException(404, "Repo metadata not found")
    repo_name = info["url"].rstrip("/").split("/")[-1].replace(".git", "")
    repo_path = PROJECT_ROOT / "repos" / repo_name
    if not repo_path.exists():
        raise HTTPException(404, "Repo not cloned locally")
    files = walk_files(repo_path)
    return [str(f.relative_to(repo_path)) for f in files]


@app.post("/api/repos/{collection}/reingest")
async def reingest_repo(collection: str):
    meta = _load_meta()
    if collection not in meta:
        raise HTTPException(404, "Repo not found in metadata")
    url = meta[collection]["url"]
    if not url:
        raise HTTPException(400, "No URL stored for this repo — cannot re-index")

    def _do_reingest():
        repo_path = clone_repo(url)
        files = walk_files(repo_path)
        lang = _dominant_lang(files)
        chunks = chunk_files(files, repo_path, repo_url=url)
        indexed = index_chunks(chunks, collection)
        meta2 = _load_meta()
        meta2[collection].update({
            "files": len(files), "chunks": len(chunks),
            "indexed_at": datetime.now(timezone.utc).isoformat(),
            "lang": lang,
        })
        _save_meta(meta2)
        return {"indexed": indexed, "total": len(chunks), "files": len(files)}

    result = await asyncio.to_thread(_do_reingest)
    return {"ok": True, **result}


class NotesRequest(BaseModel):
    notes: str


@app.patch("/api/repos/{collection}/notes")
async def update_repo_notes(collection: str, body: NotesRequest):
    meta = _load_meta()
    if collection not in meta:
        raise HTTPException(404, "Repo not found in metadata")
    meta[collection]["notes"] = body.notes
    _save_meta(meta)
    return {"ok": True}


@app.delete("/api/repos/{collection}")
async def delete_repo(collection: str):
    db = _get_chroma()
    try:
        db.delete_collection(collection)
    except Exception:
        raise HTTPException(404, "Collection not found")

    meta = _load_meta()
    meta.pop(collection, None)
    _save_meta(meta)

    if collection in _sessions:
        del _sessions[collection]

    return {"ok": True}


@app.get("/api/repos")
async def list_repos():
    meta = _load_meta()
    db = _get_chroma()
    try:
        collections = db.list_collections()
        existing = {c.name for c in collections}
    except Exception:
        existing = set()

    result = []
    seen = set()

    # Repos with full metadata
    for cname, info in meta.items():
        if cname not in existing:
            continue
        seen.add(cname)
        try:
            chunks = db.get_collection(cname).count()
        except Exception:
            chunks = info.get("chunks", 0)
        result.append({
            "id": cname,
            "name": info.get("name", cname),
            "owner": info.get("owner", ""),
            "url": info.get("url", ""),
            "files": info.get("files", 0),
            "chunks": chunks,
            "indexed_at": info.get("indexed_at", ""),
            "lang": info.get("lang", "Unknown"),
            "notes": info.get("notes", ""),
            "questions": info.get("questions", 0),
        })

    # Collections in ChromaDB that have no metadata entry (e.g. indexed via CLI)
    for cname in existing - seen:
        try:
            chunks = db.get_collection(cname).count()
        except Exception:
            chunks = 0
        result.append({
            "id": cname,
            "name": cname,
            "owner": "",
            "url": "",
            "files": 0,
            "chunks": chunks,
            "indexed_at": "",
            "lang": "Unknown",
        })

    result.sort(key=lambda r: r["indexed_at"], reverse=True)
    return result


async def _ingest_sse(url: str):
    """Async generator that yields SSE events for the full ingest pipeline."""
    loop = asyncio.get_running_loop()
    q: asyncio.Queue = asyncio.Queue()

    def emit(data):
        loop.call_soon_threadsafe(q.put_nowait, data)

    def worker():
        try:
            emit({"stage": "cloning", "progress": 5, "message": "Cloning repository…"})
            repo_path = clone_repo(url)

            emit({"stage": "walking", "progress": 22, "message": "Scanning files…"})
            files = walk_files(repo_path)
            lang = _dominant_lang(files)

            emit({"stage": "chunking", "progress": 36,
                  "message": f"Chunking {len(files)} files…"})
            chunks = chunk_files(files, repo_path, repo_url=url)
            collection = collection_name_for(url)
            total = len(chunks)

            # Pulse progress during long embedding step
            done_evt = threading.Event()

            def pulse():
                p = 44
                while not done_evt.is_set():
                    time.sleep(3)
                    if done_evt.is_set():
                        break
                    p = min(p + 4, 90)
                    emit({"stage": "embedding", "progress": p,
                          "message": f"Embedding {total} chunks…"})

            emit({"stage": "embedding", "progress": 42,
                  "message": f"Embedding {total} chunks…"})
            pulser = threading.Thread(target=pulse, daemon=True)
            pulser.start()

            indexed = index_chunks(chunks, collection)
            done_evt.set()
            pulser.join(timeout=5)

            # Persist metadata
            meta = _load_meta()
            parts = url.rstrip("/").split("/")
            owner = parts[-2] if len(parts) >= 2 else ""
            name = parts[-1].replace(".git", "")
            meta[collection] = {
                "url": url, "name": name, "owner": owner,
                "files": len(files), "chunks": total,
                "indexed_at": datetime.now(timezone.utc).isoformat(),
                "lang": lang,
            }
            _save_meta(meta)

            emit({
                "stage": "done", "progress": 100,
                "message": f"Indexed {indexed or total} chunks",
                "collection": collection,
                "name": name, "owner": owner,
                "files": len(files), "chunks": total, "lang": lang,
            })
        except Exception as exc:
            emit({"stage": "error", "progress": 0, "message": str(exc)})
        finally:
            emit(None)  # sentinel

    threading.Thread(target=worker, daemon=True).start()

    while True:
        try:
            event = await asyncio.wait_for(q.get(), timeout=600)
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'stage': 'error', 'message': 'Timeout'})}\n\n"
            break
        if event is None:
            break
        yield f"data: {json.dumps(event)}\n\n"
        if event.get("stage") in ("done", "error"):
            break


@app.post("/api/repos/ingest")
async def ingest_repo(body: IngestRequest):
    if not body.url.strip():
        raise HTTPException(400, "URL is required")
    return StreamingResponse(
        _ingest_sse(body.url.strip()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class MultiChatRequest(BaseModel):
    message: str
    collections: list[str]


@app.post("/api/chat/multi")
async def chat_multi(body: MultiChatRequest):
    if not body.message.strip():
        raise HTTPException(400, "Message required")
    if not body.collections:
        raise HTTPException(400, "At least one collection required")

    from lib.retrieval.query_vector_db import query_collection, DEFAULT_TOP_K
    from lib.retrieval.build_context import build_context
    from lib.chat.prompt_builder import SYSTEM_PROMPT, build_user_message
    from lib.chat.chat_handler_gemini import _get_client, _to_gemini_history
    from google.genai import types

    def _run():
        all_chunks = []
        for cname in body.collections:
            try:
                all_chunks.extend(query_collection(body.message.strip(), cname, top_k=DEFAULT_TOP_K))
            except ValueError:
                pass
        if not all_chunks:
            raise ValueError("No indexed chunks found across selected repos")
        context, references = build_context(all_chunks)
        grounded = build_user_message(body.message.strip(), context)
        response = _get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Content(role="user", parts=[types.Part(text=grounded)])],
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
        )
        return response.text, references

    try:
        answer, refs = await asyncio.to_thread(_run)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception as exc:
        raise HTTPException(500, str(exc))

    return {
        "answer": answer,
        "refs": [{"file": r["file"], "start": r["start_line"], "end": r["end_line"], "score": r["score"]} for r in refs],
    }


@app.post("/api/chat/{collection}")
async def chat(collection: str, body: ChatRequest):
    if not body.message.strip():
        raise HTTPException(400, "Message required")
    session = _get_session(collection)
    try:
        answer, refs = await asyncio.to_thread(session.ask, body.message.strip())
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception as exc:
        raise HTTPException(500, str(exc))
    _increment_questions(collection)
    return {
        "answer": answer,
        "refs": [
            {
                "file": r["file"],
                "start": r["start_line"],
                "end": r["end_line"],
                "score": r["score"],
            }
            for r in refs
        ],
    }


@app.post("/api/chat/{collection}/stream")
async def chat_stream(collection: str, body: ChatRequest):
    if not body.message.strip():
        raise HTTPException(400, "Message required")
    session = _get_session(collection)

    async def _sse():
        q: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def worker():
            try:
                for token, refs in session.ask_stream(body.message.strip()):
                    if token is None:
                        loop.call_soon_threadsafe(q.put_nowait, {"type": "refs", "refs": [
                            {"file": r["file"], "start": r["start_line"], "end": r["end_line"], "score": r["score"]}
                            for r in refs
                        ]})
                        _increment_questions(collection)
                    else:
                        loop.call_soon_threadsafe(q.put_nowait, {"type": "token", "text": token})
            except Exception as exc:
                loop.call_soon_threadsafe(q.put_nowait, {"type": "error", "message": str(exc)})
            finally:
                loop.call_soon_threadsafe(q.put_nowait, None)

        threading.Thread(target=worker, daemon=True).start()
        while True:
            event = await asyncio.wait_for(q.get(), timeout=120)
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        _sse(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.delete("/api/chat/{collection}/history")
async def clear_history(collection: str):
    if collection in _sessions:
        _sessions[collection].reset()
    return {"ok": True}


class SaveRequest(BaseModel):
    messages: list[dict]


@app.post("/api/chat/{collection}/history")
async def save_history(collection: str, body: SaveRequest):
    if not body.messages:
        raise HTTPException(400, "No messages to save")
    store = ConversationStore(collection)
    session_id = await asyncio.to_thread(store.save_session, body.messages)
    return {"ok": True, "session_id": session_id}


@app.get("/api/chat/{collection}/history")
async def list_history(collection: str):
    store = ConversationStore(collection)
    return await asyncio.to_thread(store.list_sessions)


@app.get("/api/chat/{collection}/history/{session_id}")
async def get_history_session(collection: str, session_id: str):
    store = ConversationStore(collection)
    session = await asyncio.to_thread(store.get_session, session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return session


@app.get("/api/share/{session_id}")
async def get_shared_session(session_id: str):
    """Public endpoint — no auth required. Searches all collections for the session."""
    conv_dir = PROJECT_ROOT / "conversations"
    if not conv_dir.exists():
        raise HTTPException(404, "Session not found")
    import json as _json
    for f in conv_dir.glob("*.json"):
        try:
            sessions = _json.loads(f.read_text())
            for s in sessions:
                if s.get("id") == session_id:
                    return s
        except Exception:
            continue
    raise HTTPException(404, "Session not found")


# Serve frontend — must be last so API routes take priority
_STATIC_DIR = PROJECT_ROOT / "static"
app.mount("/", StaticFiles(directory=str(_STATIC_DIR), html=True), name="static")
