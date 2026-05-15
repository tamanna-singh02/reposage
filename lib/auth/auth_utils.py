import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

_ALGORITHM = "HS256"
_EXPIRY_DAYS = 7


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        secret = secrets.token_hex(32)
        env_path = Path(__file__).parents[2] / ".env"
        with open(env_path, "a") as f:
            f.write(f"\nJWT_SECRET={secret}\n")
        os.environ["JWT_SECRET"] = secret
    return secret


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=_EXPIRY_DAYS),
    }
    return jwt.encode(payload, _get_secret(), algorithm=_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, _get_secret(), algorithms=[_ALGORITHM])
    except JWTError:
        return None
