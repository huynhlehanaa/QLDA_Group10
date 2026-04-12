import os
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password (bcrypt) ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """PB008: tối thiểu 8 ký tự, chữ hoa + số + ký tự đặc biệt"""
    if len(password) < 8:
        return False, "Mật khẩu phải có ít nhất 8 ký tự"
    if not any(c.isupper() for c in password):
        return False, "Mật khẩu phải có ít nhất 1 chữ hoa"
    if not any(c.isdigit() for c in password):
        return False, "Mật khẩu phải có ít nhất 1 chữ số"
    if not any(c in string.punctuation for c in password):
        return False, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"
    return True, "OK"


def generate_temp_password(length: int = 12) -> str:
    """Tự sinh mật khẩu tạm đủ mạnh cho PB022, PB032"""
    chars = string.ascii_letters + string.digits + "!@#$%"
    while True:
        pwd = "".join(secrets.choice(chars) for _ in range(length))
        ok, _ = validate_password_strength(pwd)
        if ok:
            return pwd


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access", "jti": uuid4().hex})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh", "jti": uuid4().hex})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def create_reset_token(user_id: str) -> str:
    """PB007: link reset hết hạn sau 5 phút, dùng 1 lần"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    data = {"sub": str(user_id), "exp": expire, "type": "reset"}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ── OTP ───────────────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """PB011: OTP 6 số"""
    return "".join(secrets.choice(string.digits) for _ in range(6))


# ── AES-256 encryption (PB015) ────────────────────────────────────────────────

def _get_aes_key() -> bytes:
    key = settings.AES_KEY.encode()
    return key[:32].ljust(32, b"0")


def encrypt_sensitive(plaintext: str) -> str:
    """Mã hóa dữ liệu KPI nhạy cảm bằng AES-256-CBC"""
    key = _get_aes_key()
    iv = os.urandom(16)
    padded = plaintext.encode()
    pad_len = 16 - len(padded) % 16
    padded += bytes([pad_len] * pad_len)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encrypted = cipher.encryptor().update(padded)
    return (iv + encrypted).hex()


def decrypt_sensitive(ciphertext_hex: str) -> str:
    """Giải mã dữ liệu KPI nhạy cảm"""
    key = _get_aes_key()
    data = bytes.fromhex(ciphertext_hex)
    iv, ct = data[:16], data[16:]
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    padded = cipher.decryptor().update(ct)
    pad_len = padded[-1]
    return padded[:-pad_len].decode()
