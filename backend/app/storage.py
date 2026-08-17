import base64
import hashlib
import logging
import os
import uuid
from datetime import datetime
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session
from app.config import settings
from app.models import PrintJob

logger = logging.getLogger(__name__)

def get_fernet_cipher() -> Fernet:
    if settings.ENCRYPTION_KEY:
        return Fernet(settings.ENCRYPTION_KEY.encode("utf-8"))
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest())
    return Fernet(key)

def save_uploaded_file(content: bytes, filename: str) -> tuple[str, str]:
    unique_filename = f"{uuid.uuid4().hex}.enc"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    encrypted_content = get_fernet_cipher().encrypt(content)
    with open(file_path, "xb") as buffer:
        buffer.write(encrypted_content)
    return unique_filename, file_path

def read_decrypted_file(file_path: str) -> bytes:
    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError("Encrypted file not found")
    with open(file_path, "rb") as buffer:
        return get_fernet_cipher().decrypt(buffer.read())

def delete_job_file(job: PrintJob) -> bool:
    if not job.file_path or not os.path.exists(job.file_path):
        return False
    try:
        file_size = os.path.getsize(job.file_path)
        with open(job.file_path, "r+b") as file_handle:
            file_handle.write(b"\x00" * file_size)
            file_handle.flush()
            os.fsync(file_handle.fileno())
        os.remove(job.file_path)
        job.file_path = None
        return True
    except OSError:
        logger.error("Unable to remove encrypted document for job %s", job.id)
        return False

def cleanup_expired_jobs(db: Session):
    now = datetime.utcnow()
    expired_jobs = db.query(PrintJob).filter(
        PrintJob.expires_at <= now,
        PrintJob.status != "DESTROYED",
    ).all()
    for job in expired_jobs:
        job.status = "EXPIRED"
        delete_job_file(job)
    db.commit()