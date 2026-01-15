"""Security utilities for password hashing and JWT tokens."""

import logging
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from app.config.jwt import jwt_config

logger = logging.getLogger(__name__)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    logger.debug(f"Verifying password (length: {len(plain_password)})")
    try:
        # Ensure password is encoded to bytes
        password_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        result = bcrypt.checkpw(password_bytes, hash_bytes)
        logger.debug(f"Password verification result: {result}")
        return result
    except Exception as e:
        logger.error(f"Error verifying password: {type(e).__name__}: {str(e)}", exc_info=True)
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly."""
    logger.debug(f"Hashing password (length: {len(password)})")
    try:
        # Encode password to bytes
        password_bytes = password.encode('utf-8')
        # Generate salt and hash
        salt = bcrypt.gensalt()
        hash_bytes = bcrypt.hashpw(password_bytes, salt)
        # Decode hash back to string
        hashed = hash_bytes.decode('utf-8')
        logger.debug(f"Password hashed successfully (hash length: {len(hashed)})")
        return hashed
    except Exception as e:
        logger.error(f"Error hashing password: {type(e).__name__}: {str(e)}", exc_info=True)
        raise


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    logger.debug(f"Creating access token with data: {data}")
    try:
        logger.debug(f"JWT Config - SECRET_KEY length: {len(jwt_config.SECRET_KEY)}, ALGORITHM: {jwt_config.ALGORITHM}")
        
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                days=jwt_config.ACCESS_TOKEN_EXPIRE_DAYS
            )
        to_encode.update({"exp": expire})
        logger.debug(f"Token expiration: {expire}")
        
        encoded_jwt = jwt.encode(
            to_encode, jwt_config.SECRET_KEY, algorithm=jwt_config.ALGORITHM
        )
        logger.debug(f"JWT token encoded successfully (length: {len(encoded_jwt)})")
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {type(e).__name__}: {str(e)}", exc_info=True)
        raise


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(
            token, jwt_config.SECRET_KEY, algorithms=[jwt_config.ALGORITHM]
        )
        return payload
    except JWTError:
        return None
