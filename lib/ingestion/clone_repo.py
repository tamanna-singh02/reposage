"""
Clone or update a GitHub repository into the local ./repos/ directory.

Returns the absolute Path to the repo root so downstream steps stay
decoupled from how the repo was acquired.
"""

import subprocess
from pathlib import Path


REPOS_DIR = Path(__file__).parents[2] / "repos"


def clone_repo(github_url: str) -> Path:
    """
    Clone `github_url` into REPOS_DIR/<repo-name>.
    If the directory already exists, runs `git pull` to fetch the latest.

    Raises subprocess.CalledProcessError if git fails.
    """
    repo_name = _repo_name(github_url)
    repo_path = REPOS_DIR / repo_name
    REPOS_DIR.mkdir(parents=True, exist_ok=True)

    if repo_path.exists():
        print(f"[clone_repo] '{repo_name}' already cloned — pulling latest …")
        result = subprocess.run(
            ["git", "-C", str(repo_path), "pull"],
            text=True,
            capture_output=True,
        )
        if result.returncode != 0:
            # Non-fatal: stale clone still usable; surface the warning.
            print(f"[clone_repo] WARNING: git pull failed — using existing clone.\n{result.stderr.strip()}")
    else:
        print(f"[clone_repo] Cloning {github_url} …")
        subprocess.run(
            ["git", "clone", "--depth=1", github_url, str(repo_path)],
            check=True,
        )

    print(f"[clone_repo] Ready at {repo_path}")
    return repo_path


# ── helpers ───────────────────────────────────────────────────────────────────

def _repo_name(url: str) -> str:
    """Extract the repository name from a GitHub URL."""
    name = url.rstrip("/").split("/")[-1]
    if name.endswith(".git"):
        name = name[:-4]
    return name
