"""
Recursively walk a repository and return every file worth indexing.

Design decisions:
- Block-list by directory name (applied at every path segment) so nested
  build artifacts like src/dist/ are also skipped.
- Block-list by file extension for binaries/assets that can't be chunked
  as text.
- Allow-list by extension for source/doc files we *want* to index.
"""

from pathlib import Path


# Directories we never descend into
SKIP_DIRS: frozenset[str] = frozenset({
    ".git", ".svn", ".hg",
    "node_modules", ".pnpm", ".yarn", ".npm",
    "__pycache__", ".venv", "venv", ".env",
    "dist", "build", "out", ".next", ".nuxt", ".turbo",
    "coverage", ".nyc_output",
    "vendor", "third_party",
    "target",          # Rust / Maven
    ".idea", ".vscode",
    "migrations",      # DB migration blobs (usually auto-generated)
    "fixtures",        # large test fixtures
    ".cache", ".parcel-cache",
    "eggs", "egg-info",
})

# File extensions we want to index
SUPPORTED_EXTENSIONS: frozenset[str] = frozenset({
    # Web / JS
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte",
    # Python
    ".py", ".pyi",
    # JVM
    ".java", ".kt", ".kts", ".scala", ".groovy",
    # Systems
    ".go", ".rs", ".c", ".h", ".cpp", ".cc", ".cxx", ".hpp",
    ".cs", ".fs",
    # Scripting
    ".rb", ".php", ".sh", ".bash", ".zsh", ".fish", ".ps1",
    # Swift / ObjC
    ".swift", ".m", ".mm",
    # Data / config
    ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env.example",
    ".xml", ".graphql", ".gql", ".proto",
    # Docs
    ".md", ".mdx", ".rst", ".txt",
    # SQL
    ".sql",
    # Dockerfile-like
    ".dockerfile",
})

# Specific filenames (no extension) that are always worth indexing
SUPPORTED_FILENAMES: frozenset[str] = frozenset({
    "Dockerfile", "Makefile", "Rakefile", "Gemfile", "Procfile",
    "Cargo.toml", "pyproject.toml", "package.json", "go.mod",
    ".env.example", "docker-compose.yml", "docker-compose.yaml",
})

# Extensions that are always binary / not useful as text
BINARY_EXTENSIONS: frozenset[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".mp4", ".mp3", ".wav", ".mov",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
    ".exe", ".dll", ".so", ".dylib", ".a", ".lib",
    ".pyc", ".pyo", ".class", ".jar", ".war",
    ".wasm", ".bin", ".dat",
    ".ttf", ".woff", ".woff2", ".eot",
    ".lock",   # package-lock / yarn.lock — too noisy, not useful
    ".sum",    # go.sum
    ".map",    # source maps
    ".min.js", ".min.css",
})


def walk_files(repo_path: Path) -> list[Path]:
    """
    Return all text files worth indexing under `repo_path`.

    Skips SKIP_DIRS and BINARY_EXTENSIONS; keeps SUPPORTED_EXTENSIONS
    and SUPPORTED_FILENAMES.
    """
    result: list[Path] = []

    for path in repo_path.rglob("*"):
        if not path.is_file():
            continue

        # Skip if any parent directory segment is blocked
        relative_parts = path.relative_to(repo_path).parts
        if any(part in SKIP_DIRS for part in relative_parts):
            continue

        # Also skip dotfiles that aren't explicitly supported
        name = path.name
        if name.startswith(".") and name not in SUPPORTED_FILENAMES:
            continue

        suffix = path.suffix.lower()

        # Explicit binary blocklist wins over everything
        if suffix in BINARY_EXTENSIONS:
            continue

        if name in SUPPORTED_FILENAMES or suffix in SUPPORTED_EXTENSIONS:
            result.append(path)

    return sorted(result)
