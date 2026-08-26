"""
Authentication & JWT Token Service.
Provides secure token generation, validation, and FastAPI dependencies.
"""

import hmac
import hashlib
import base64
import json
import time
import os
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from user_db import user_db

# Secret key for signing tokens (configurable via ENV or fallback default)
JWT_SECRET = os.environ.get("MANISH_MARKET_JWT_SECRET", "manish-market-super-secure-jwt-secret-key-2026")
TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60  # 30 Days

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _base64url_decode(s: str) -> bytes:
    padding = '=' * (4 - (len(s) % 4)) if len(s) % 4 != 0 else ''
    return base64.urlsafe_b64decode((s + padding).encode('utf-8'))

def create_access_token(user_id: str, email: str, name: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": now,
        "exp": now + TOKEN_EXPIRY_SECONDS
    }

    header_b64 = _base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signature_base = f"{header_b64}.{payload_b64}".encode('utf-8')

    sig = hmac.new(JWT_SECRET.encode('utf-8'), signature_base, hashlib.sha256).digest()
    sig_b64 = _base64url_encode(sig)

    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        # Verify signature
        signature_base = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(JWT_SECRET.encode('utf-8'), signature_base, hashlib.sha256).digest()
        expected_sig_b64 = _base64url_encode(expected_sig)

        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None

        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        # Check expiration
        if payload.get("exp", 0) < int(time.time()):
            return None

        return payload
    except Exception:
        return None

def extract_token_from_header(authorization: Optional[str] = None) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    if len(parts) == 1:
        return parts[0]
    return None

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_db.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )
    return user

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    token = extract_token_from_header(authorization)
    if not token:
        return None
    payload = verify_access_token(token)
    if not payload or not payload.get("sub"):
        return None
    return user_db.get_user_by_id(payload["sub"])
