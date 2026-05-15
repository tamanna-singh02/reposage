#!/usr/bin/env python3
"""
Reposage — interactive chat REPL.

Usage:
    python query.py <github-url>
    python query.py https://github.com/tiangolo/fastapi

The repo must already be indexed (run ingest.py or scripts/ingest_cli.py first).
Type 'reset' to clear conversation history, 'quit' / 'exit' to leave.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from lib.embeddings.index_chunks import collection_name_for
from lib.chat.chat_handler import ChatSession


def main(github_url: str) -> None:
    collection = collection_name_for(github_url)
    session = ChatSession(collection_name=collection)

    print(f"\nReposage — chatting about: {github_url}")
    print(f"Collection : {collection}")
    print(f"Type 'reset' to clear history, 'quit' to exit.\n")

    while True:
        try:
            question = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not question:
            continue

        if question.lower() in {"quit", "exit", "q"}:
            print("Bye!")
            break

        if question.lower() == "reset":
            session.reset()
            print("[history cleared]\n")
            continue

        try:
            answer, references = session.ask(question)
        except ValueError as e:
            print(f"\nError: {e}\n")
            continue
        except Exception as e:
            print(f"\nUnexpected error: {e}\n")
            continue

        print(f"\nReposage:\n{answer}\n")

        if references:
            print("Sources:")
            for ref in references:
                print(f"  {ref['file']}:{ref['start_line']}-{ref['end_line']}  "
                      f"(score {ref['score']})")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        url = input("GitHub repo URL: ").strip()
    else:
        url = sys.argv[1]

    if not url:
        print("Error: no URL provided.", file=sys.stderr)
        sys.exit(1)

    main(url)
