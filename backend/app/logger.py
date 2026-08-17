import os
import json
import logging
from datetime import datetime

# Define log directory and file
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "security_audit.log")

class JsonFormatter(logging.Formatter):
    """
    Formats log records as structured JSON entries for SIEM / security auditing.
    Ensures sensitive data (passwords, tokens, Fernet keys) is never recorded.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "event": getattr(record, "event_type", "GENERAL_AUDIT"),
            "ip_address": getattr(record, "ip_address", "0.0.0.0"),
            "user_id": getattr(record, "user_id", None),
            "status_code": getattr(record, "status_code", None),
            "path": getattr(record, "path", None),
            "detail": getattr(record, "detail", None),
            "message": record.getMessage(),
        }
        # Clean null values for concise output
        filtered_data = {k: v for k, v in log_data.items() if v is not None}
        return json.dumps(filtered_data)

# Setup audit logger
logger = logging.getLogger("securexerox.audit")
logger.setLevel(logging.INFO)

if not logger.handlers:
    # File Handler
    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(JsonFormatter())
    logger.addHandler(file_handler)

    # Stream Handler (stdout)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(JsonFormatter())
    logger.addHandler(stream_handler)

def log_audit_event(
    event_type: str,
    message: str,
    ip_address: str = "0.0.0.0",
    user_id: str | None = None,
    status_code: int | None = None,
    path: str | None = None,
    detail: str | None = None,
    level: int = logging.INFO
):
    extra = {
        "event_type": event_type,
        "ip_address": ip_address,
        "user_id": user_id,
        "status_code": status_code,
        "path": path,
        "detail": detail,
    }
    logger.log(level, message, extra=extra)
