from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

_DB_PATH = Path(__file__).parents[2] / "reposage.db"
_ENGINE = create_engine(f"sqlite:///{_DB_PATH}", connect_args={"check_same_thread": False})
_Session = sessionmaker(bind=_ENGINE, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from lib.auth.models import User  # noqa: F401 — registers model with Base
    Base.metadata.create_all(bind=_ENGINE)


def get_db():
    db = _Session()
    try:
        yield db
    finally:
        db.close()
