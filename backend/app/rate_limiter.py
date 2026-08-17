import time
import re
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import HTTPException, Request, status

class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter supporting rate limit header generation
    (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After).
    """
    def __init__(self, max_requests: int = 5, window_seconds: int = 300):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, identifier: str) -> Tuple[bool, int, int]:
        """
        Returns (is_allowed, remaining_count, retry_after_seconds)
        """
        now = time.time()
        cutoff = now - self.window_seconds
        
        # Filter active timestamps within window
        timestamps = [ts for ts in self._requests[identifier] if ts > cutoff]
        self._requests[identifier] = timestamps

        if len(timestamps) >= self.max_requests:
            oldest = timestamps[0]
            retry_after = int(max(1, self.window_seconds - (now - oldest)))
            return False, 0, retry_after

        timestamps.append(now)
        remaining = self.max_requests - len(timestamps)
        return True, remaining, 0

# Rate limiter instances
login_rate_limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=300)       # 5 attempts / 5 mins
register_rate_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=3600)   # 20 registrations / 1 hour
reset_rate_limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=900)        # 5 resets / 15 mins
upload_rate_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=600)     # 20 uploads / 10 mins
verify_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=300)     # 30 verifications / 5 mins
ai_heavy_rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)     # 10 heavy requests / 1 min
global_api_rate_limiter = SlidingWindowRateLimiter(max_requests=120, window_seconds=60)  # 120 requests / 1 min

# Malicious scanner / scraper User-Agent signatures
KNOWN_BOT_USER_AGENTS = re.compile(
    r"(sqlmap|nikto|gobuster|dirbuster|w3af|nmap|acunetix|nessus|masscan|zgrab|hydra|medusa|havij|arachni)",
    re.IGNORECASE
)

def is_known_bot_user_agent(user_agent: str | None) -> bool:
    if not user_agent or not user_agent.strip():
        # Blank user agents on non-browser endpoints are suspicious
        return True
    return bool(KNOWN_BOT_USER_AGENTS.search(user_agent))

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def check_login_rate_limit(request: Request, identifier: str = ""):
    client_ip = get_client_ip(request)
    key = f"login:{client_ip}:{identifier.lower().strip()}"
    allowed, remaining, retry_after = login_rate_limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 5 minutes before trying again.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(login_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_register_rate_limit(request: Request, identifier: str = ""):
    client_ip = get_client_ip(request)
    key = f"register:{client_ip}"
    allowed, remaining, retry_after = register_rate_limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many accounts created from this IP. Please try again later.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(register_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_reset_rate_limit(request: Request, identifier: str = ""):
    client_ip = get_client_ip(request)
    key = f"reset:{client_ip}:{identifier.lower().strip()}"
    allowed, remaining, retry_after = reset_rate_limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset attempts. Please wait 15 minutes before trying again.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(reset_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_auth_rate_limit(request: Request, identifier: str = ""):
    check_register_rate_limit(request, identifier)

def check_upload_rate_limit(request: Request, user_id: str = ""):
    client_ip = get_client_ip(request)
    key = f"upload:{client_ip}:{user_id}"
    allowed, remaining, retry_after = upload_rate_limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Upload limit reached. Please wait 10 minutes before uploading more documents.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(upload_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_verify_rate_limit(request: Request):
    client_ip = get_client_ip(request)
    key = f"verify:{client_ip}"
    allowed, remaining, retry_after = verify_rate_limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many Print ID verifications. Please wait a few minutes.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(verify_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_ai_rate_limit(request: Request, identifier: str = ""):
    client_ip = get_client_ip(request)
    key = f"ai:{client_ip}:{identifier}"
    allowed, remaining, retry_after = ai_heavy_rate_limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI generation request limit reached. Please wait 1 minute.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(ai_heavy_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )
