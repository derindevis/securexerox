import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import engine, Base, SessionLocal, ensure_schema_migrations
from app.config import settings
from app.routers import auth_router, jobs_router, print_router, printer_router, shop_public_router
from app.storage import cleanup_expired_jobs
from app.models import User, generate_shop_public_id
from app.logger import log_audit_event
from app.rate_limiter import get_client_ip, is_known_bot_user_agent, global_api_rate_limiter

# Create DB tables & migrate columns
Base.metadata.create_all(bind=engine)
ensure_schema_migrations()

def backfill_shop_public_ids():
    db = SessionLocal()
    try:
        shops = db.query(User).filter(User.role == "shop", User.shop_public_id.is_(None)).all()
        for shop in shops:
            pub_id = generate_shop_public_id()
            while db.query(User).filter(User.shop_public_id == pub_id).first():
                pub_id = generate_shop_public_id()
            shop.shop_public_id = pub_id
            shop.shop_qr_payload = f"https://securexerox-fhqr.vercel.app/customer/upload?shop={pub_id}"
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

# Run backfill
backfill_shop_public_ids()

scheduler = BackgroundScheduler()

def scheduled_cleanup():
    db = SessionLocal()
    try:
        cleanup_expired_jobs(db)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.add_job(scheduled_cleanup, 'interval', seconds=60)
    scheduler.start()
    yield
    # Shutdown
    scheduler.shutdown()

is_production = settings.APP_ENV.lower() == "production"

app = FastAPI(
    title="SecureXerox API",
    description="Zero-Trust Ephemeral Document Printing Platform",
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
    lifespan=lifespan,
)

# 1. Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[host.strip() for host in settings.TRUSTED_HOSTS.split(",") if host.strip()],
)

# 2. Session Middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=is_production,
)

# 3. CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pattern signatures for SQL Injection, Path Traversal, and Command Injection Probes
SUSPICIOUS_PATTERNS = re.compile(
    r"(\.\./|\.\.\\|%2e%2e|union\s+select|/etc/passwd|/proc/|;\s*cat\s+|;\s*rm\s+|;\s*id\b|<script\b|benchmark\(|sleep\(\d+\))",
    re.IGNORECASE
)

# 4. HTTPS Enforcement Middleware
@app.middleware("http")
async def enforce_https_middleware(request: Request, call_next):
    if is_production:
        proto = request.headers.get("X-Forwarded-Proto", "").lower()
        if proto == "http":
            url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(url), status_code=301)
    return await call_next(request)

import urllib.parse

# 5. Traffic Anomaly & Web Attack Detection Middleware
@app.middleware("http")
async def anomaly_detection_middleware(request: Request, call_next):
    client_ip = get_client_ip(request)
    raw_path = urllib.parse.unquote(request.url.path)
    query_str = urllib.parse.unquote(str(request.url.query))

    # Detect known scanner bot user-agents
    ua = request.headers.get("User-Agent", "")
    if is_known_bot_user_agent(ua):
        log_audit_event(
            event_type="BOT_SCANNER_BLOCKED",
            message=f"Blocked malicious scanner request (UA: {ua})",
            ip_address=client_ip,
            status_code=403,
            path=raw_path
        )
        return JSONResponse(
            status_code=403,
            content={"detail": "Automated security scanner or unauthorized bot activity detected"}
        )

    # Detect attack payload signatures in path or query
    if SUSPICIOUS_PATTERNS.search(raw_path) or SUSPICIOUS_PATTERNS.search(query_str):
        log_audit_event(
            event_type="SUSPICIOUS_PROBE_BLOCKED",
            message=f"Blocked suspicious attack payload probe in request URL: {raw_path}?{query_str}",
            ip_address=client_ip,
            status_code=400,
            path=raw_path
        )
        return JSONResponse(
            status_code=400,
            content={"detail": "Invalid or suspicious request parameters detected"}
        )

    return await call_next(request)

# 6. Global API Throttling Middleware
@app.middleware("http")
async def global_api_throttling_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = get_client_ip(request)
        key = f"global_api:{client_ip}"
        allowed, remaining, retry_after = global_api_rate_limiter.check(key)
        if not allowed:
            log_audit_event(
                event_type="RATE_LIMIT_EXCEEDED",
                message=f"Global API rate limit exceeded by {client_ip}",
                ip_address=client_ip,
                status_code=429,
                path=request.url.path
            )
            return JSONResponse(
                status_code=429,
                content={"detail": "API rate limit exceeded. Please slow down your requests."},
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(global_api_rate_limiter.max_requests),
                    "X-RateLimit-Remaining": "0"
                }
            )
    return await call_next(request)

# 7. Complete Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=*, microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; font-src 'self' data: https:;"
    if is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response

# 8. Structured Security & Error Audit Logging Middleware
@app.middleware("http")
async def audit_logging_middleware(request: Request, call_next):
    client_ip = get_client_ip(request)
    try:
        response = await call_next(request)
        if response.status_code >= 400:
            event_name = "RATE_LIMIT_EXCEEDED" if response.status_code == 429 else "API_ERROR"
            log_audit_event(
                event_type=event_name,
                message=f"HTTP {response.status_code} on {request.method} {request.url.path}",
                ip_address=client_ip,
                status_code=response.status_code,
                path=request.url.path,
            )
        return response
    except Exception as exc:
        log_audit_event(
            event_type="UNHANDLED_SERVER_ERROR",
            message=f"Unhandled Exception on {request.method} {request.url.path}: {str(exc)}",
            ip_address=client_ip,
            status_code=500,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. Please try again later."}
        )

# Include Routers
app.include_router(auth_router.router)
app.include_router(jobs_router.router)
app.include_router(print_router.router)
app.include_router(printer_router.router)
app.include_router(shop_public_router.router)

@app.get("/")
def root():
    return {"status": "online", "platform": "SecureXerox Zero-Trust Print Engine"}

@app.get("/healthz")
def healthz():
    return {"status": "ok"}
