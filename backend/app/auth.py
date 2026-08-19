import bcrypt
import secrets
import re
import uuid
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.config import settings

# Pre-computed dummy hash to prevent timing attack enumeration on non-existent accounts
DUMMY_HASH = bcrypt.hashpw(b"secure_dummy_timing_mitigation_password", bcrypt.gensalt(12)).decode('utf-8')

def validate_password_strength(password: str) -> None:
    """
    Validates password strength according to OWASP / NIST standards:
    - Minimum 8 characters
    - Maximum 72 bytes (prevents bcrypt Denial of Service)
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one numeric digit
    """
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )
    if len(password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long (maximum 72 bytes)",
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter",
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter",
        )
    if not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number",
        )

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """
    Verifies plain password against bcrypt hash in constant time.
    If hashed_password is None, performs a dummy hash check to mitigate timing attacks.
    """
    target_hash = hashed_password or DUMMY_HASH
    try:
        pw_bytes = plain_password.encode('utf-8')
        if len(pw_bytes) > 72:
            return False
        return bcrypt.checkpw(pw_bytes, target_hash.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Generates a secure bcrypt hash with salt round factor 12.
    """
    pw_bytes = password.encode('utf-8')
    if len(pw_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long (maximum 72 bytes)",
        )
    salt = bcrypt.gensalt(12)
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def generate_secure_token() -> str:
    """
    Generates a high-entropy 256-bit cryptographically secure token (URL-safe).
    """
    return secrets.token_urlsafe(32)

import time

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT access token with strict claims: sub, role, iat, exp, jti.
    Uses time.time() Unix epoch seconds to prevent timezone offset skew.
    """
    to_encode = data.copy()
    now_ts = int(time.time())
    if expires_delta:
        expire_ts = now_ts + int(expires_delta.total_seconds())
    else:
        expire_ts = now_ts + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    
    to_encode.update({
        "iat": now_ts,
        "nbf": now_ts,
        "exp": expire_ts,
        "jti": str(uuid.uuid4()),
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT token ensuring signature and expiration validity.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": True}
        )
        return payload
    except JWTError:
        return None
