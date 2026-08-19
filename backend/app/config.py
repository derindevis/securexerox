import os
import secrets
from pydantic_settings import BaseSettings

DEFAULT_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "securexerox.db")).replace("\\", "/")
class Settings(BaseSettings):
    APP_ENV: str = os.getenv("APP_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(48))
    ENCRYPTION_KEY: str | None = os.getenv("ENCRYPTION_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "https://securexerox-fhqr.vercel.app,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://securexerox.onrender.com"
    )
    TRUSTED_HOSTS: str = os.getenv(
        "TRUSTED_HOSTS",
        "securexerox.onrender.com,*.onrender.com,securexerox-fhqr.vercel.app,*.vercel.app,localhost,127.0.0.1,testserver"
    )
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://securexerox-fhqr.vercel.app")
    PRINT_ID_EXPIRY_MINUTES: int = int(os.getenv("PRINT_ID_EXPIRY_MINUTES", "10"))
    SESSION_TIMEOUT_MINUTES: int = int(os.getenv("SESSION_TIMEOUT_MINUTES", "5"))

    def model_post_init(self, __context):
        if self.APP_ENV.lower() == "production":
            if not os.getenv("SECRET_KEY") or not self.ENCRYPTION_KEY:
                raise RuntimeError("SECRET_KEY and ENCRYPTION_KEY must be set in production")
            if self.DATABASE_URL.startswith("sqlite"):
                raise RuntimeError("Production requires a managed PostgreSQL DATABASE_URL")
            if "sslmode=require" not in self.DATABASE_URL.lower() and "sslmode=verify" not in self.DATABASE_URL.lower():
                raise RuntimeError("Production DATABASE_URL must enforce SSL (sslmode=require)")
            if self.FRONTEND_URL.startswith("http://"):
                raise RuntimeError("FRONTEND_URL must use HTTPS in production")
            if any(origin.startswith("http://") for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()):
                raise RuntimeError("ALLOWED_ORIGINS must use HTTPS in production")

    class Config:
        env_file = ".env"

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs"), exist_ok=True)