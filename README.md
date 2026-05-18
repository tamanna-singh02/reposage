# Reposage

A self-hosted tool for indexing GitHub repositories and chatting with their codebases using RAG (Retrieval-Augmented Generation). Clone any repo, embed it into a vector database, then ask questions and get answers grounded in the actual source code.

---

## How it works

1. **Ingest** — paste a GitHub URL; Reposage clones the repo, walks all source files, chunks them with overlap, and embeds every chunk using Voyage AI's `voyage-code-2` model (optimised for code retrieval)
2. **Index** — embeddings are stored in ChromaDB (local vector database)
3. **Chat** — questions are embedded, the most relevant chunks are retrieved, and Google Gemini 2.5 Flash generates a grounded answer with source citations (file + line range)

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy |
| Frontend | React 18 · TypeScript · Vite |
| Vector DB | ChromaDB (local) |
| Embeddings | Voyage AI (`voyage-code-2`) |
| LLM | Google Gemini 2.5 Flash |
| Auth | JWT (python-jose) + bcrypt |
| Chunking | tiktoken · tree-sitter · langchain text splitters |

---

## Features

- **Repo ingestion** with real-time SSE progress (clone → chunk → embed → store)
- **Streaming chat** with token-by-token responses via SSE
- **Source citations** — every answer shows which files and line ranges were used, with relevance scores
- **Multi-repo chat** — ask a question across several indexed repos at once
- **File tree browser** — browse indexed files and click to ask about them
- **Conversation history** — save, search, and reload past sessions
- **Share links** — share a saved conversation via a public URL
- **Account system** — register, login, update profile and password
- **Themes** — GitHub, Linear, Notion (each with light/dark variants), switchable at runtime

---

## Prerequisites

- Python 3.12+
- Node.js 18+
- A [Voyage AI](https://www.voyageai.com/) API key
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/reposage.git
cd reposage
```

### 2. Python environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Environment variables

Create a `.env` file in the project root:

```env
VOYAGE_API_KEY=your_voyage_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_random_secret_here
```

Generate a strong `JWT_SECRET` with:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Frontend dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

---

## Running in development

One command from the project root starts both the FastAPI backend and the Vite dev server:

```bash
npm run dev
```

| Process | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |

Vite proxies all `/api/*` requests to FastAPI automatically, so open `http://localhost:5173`.

---

## Building for production

```bash
cd frontend && npm run build
```

This compiles the frontend into `static/`. FastAPI then serves it directly — no separate Node process needed in production.

Start the server:

```bash
./venv/bin/python -m uvicorn app:app --port 8000
```

---

## Project structure

```
reposage/
├── app.py                  # FastAPI app — all API routes
├── package.json            # root dev scripts (npm run dev)
├── scripts/
│   └── start-api.sh        # venv-aware uvicorn launcher
├── frontend/               # Vite + React + TypeScript source
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   ├── auth/       # Login, Signup, AuthApp
│       │   ├── chat/       # MessageBubble, CopyButton, TypingIndicator
│       │   ├── layout/     # Sidebar
│       │   ├── panels/     # SourcesSidebar, FileTreePanel, HistoryPanel, SessionModal
│       │   ├── repos/      # ReposView, RepoCard, IngestView
│       │   ├── settings/   # SettingsView
│       │   ├── share/      # ShareView
│       │   └── tweaks/     # TweaksPanel (runtime theme switcher)
│       ├── hooks/
│       ├── lib/            # api.ts, markdown.tsx, utils.ts
│       ├── theme/          # all 6 theme definitions
│       └── types/          # shared TypeScript interfaces
└── lib/                    # Python backend modules
    ├── auth/               # JWT auth, SQLAlchemy models
    ├── chat/               # Gemini chat handler, prompt builder, conversation store
    ├── embeddings/         # Voyage AI embeddings, ChromaDB indexing
    ├── ingestion/          # git clone, file walker, text chunker
    └── retrieval/          # vector DB query, context builder
```

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user |
| `PATCH` | `/api/auth/me` | Update name / password |
| `DELETE` | `/api/auth/me` | Delete account |
| `GET` | `/api/repos` | List indexed repos |
| `POST` | `/api/repos/ingest` | Ingest a repo (SSE stream) |
| `DELETE` | `/api/repos/{id}` | Delete a repo |
| `POST` | `/api/repos/{id}/reingest` | Re-index a repo |
| `PATCH` | `/api/repos/{id}/notes` | Update repo notes |
| `GET` | `/api/repos/{id}/files` | List repo files |
| `POST` | `/api/chat/{id}` | Chat (single response) |
| `POST` | `/api/chat/{id}/stream` | Chat (SSE stream) |
| `POST` | `/api/chat/multi` | Chat across multiple repos |
| `DELETE` | `/api/chat/{id}/history` | Clear chat session |
| `POST` | `/api/chat/{id}/history` | Save conversation |
| `GET` | `/api/chat/{id}/history` | List saved sessions |
| `GET` | `/api/share/{session_id}` | Get shared session (public) |

All `/api/*` routes except auth and share require `Authorization: Bearer <token>`.
