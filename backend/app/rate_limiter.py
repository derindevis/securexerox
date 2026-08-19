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

# IP Temporary Jail / Reputation Tracker for Abusive Actors
class IPJailManager:
    """
    Tracks repeat offenders and imposes progressive cooldown bans (e.g. 15 minutes)
    for clients that trigger multiple rate limit violations or probe attacks.
    """
    def __init__(self, violation_threshold: int = 5, ban_duration_seconds: int = 900):
        self.violation_threshold = violation_threshold
        self.ban_duration_seconds = ban_duration_seconds
        self._violations: Dict[str, List[float]] = defaultdict(list)
        self._jailed_until: Dict[str, float] = {}

    def is_jailed(self, client_ip: str) -> Tuple[bool, int]:
        now = time.time()
        until = self._jailed_until.get(client_ip, 0)
        if now < until:
            return True, int(until - now)
        return False, 0

    def record_violation(self, client_ip: str) -> None:
        now = time.time()
        cutoff = now - 600  # 10 minute tracking window
        v_list = [ts for ts in self._violations[client_ip] if ts > cutoff]
        v_list.append(now)
        self._violations[client_ip] = v_list

        if len(v_list) >= self.violation_threshold:
            self._jailed_until[client_ip] = now + self.ban_duration_seconds

ip_jail = IPJailManager(violation_threshold=5, ban_duration_seconds=900)

# Specialized Rate Limiter Instances
login_rate_limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=300)       # 5 attempts / 5 mins per account
login_ip_rate_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=300)     # 15 attempts / 5 mins per IP
register_rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=3600)   # 10 registrations / 1 hour per IP
reset_rate_limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=900)        # 5 resets / 15 mins
verify_token_rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=300) # 10 verify attempts / 5 mins
verify_rate_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=300)     # 20 PIN lookups / 5 mins
upload_rate_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=600)     # 20 uploads / 10 mins
ai_heavy_rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)     # 10 AI / generation reqs / 1 min
scrape_rate_limiter = SlidingWindowRateLimiter(max_requests=40, window_seconds=60)       # 40 public catalog queries / 1 min
global_api_rate_limiter = SlidingWindowRateLimiter(max_requests=120, window_seconds=60)  # 120 requests / 1 min per IP

# Malicious scanner / automated scraper User-Agent signatures
KNOWN_BOT_USER_AGENTS = re.compile(
    r"(sqlmap|nikto|gobuster|dirbuster|w3af|nmap|acunetix|nessus|masscan|zgrab|hydra|medusa|havij|arachni|scrapy|puppeteer|playwright|selenium|phantomjs)",
    re.IGNORECASE
)

def is_known_bot_user_agent(user_agent: str | None) -> bool:
    if not user_agent or not user_agent.strip():
        # Blank user agents on API requests are blocked
        return True
    return bool(KNOWN_BOT_USER_AGENTS.search(user_agent))

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def check_ip_jail_status(request: Request):
    client_ip = get_client_ip(request)
    jailed, remaining_ban = ip_jail.is_jailed(client_ip)
    if jailed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Your IP address has been temporarily blocked due to repeated suspicious or abusive activity. Please try again later.",
            headers={"Retry-After": str(remaining_ban)},
        )

def check_login_rate_limit(request: Request, identifier: str = ""):
    check_ip_jail_status(request)
    client_ip = get_client_ip(request)
    
    # 1. Check IP-level brute force
    allowed_ip, _, retry_after_ip = login_ip_rate_limiter.check(f"login_ip:{client_ip}")
    if not allowed_ip:
        ip_jail.record_violation(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts from this network. Please wait 5 minutes before trying again.",
            headers={
                "Retry-After": str(retry_after_ip),
                "X-RateLimit-Limit": str(login_ip_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

    # 2. Check Account-level brute force
    key = f"login:{client_ip}:{identifier.lower().strip()}"
    allowed, remaining, retry_after = login_rate_limiter.check(key)
    if not allowed:
        ip_jail.record_violation(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts for this account. Please wait 5 minutes before trying again.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(login_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_register_rate_limit(request: Request, identifier: str = ""):
    check_ip_jail_status(request)
    client_ip = get_client_ip(request)
    key = f"register:{client_ip}"
    allowed, remaining, retry_after = register_rate_limiter.check(key)
    if not allowed:
        ip_jail.record_violation(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account creation limit reached for this network. Please try again later.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(register_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_auth_rate_limit(request: Request, identifier: str = ""):
    check_register_rate_limit(request, identifier)

def check_reset_rate_limit(request: Request, identifier: str = ""):
    check_ip_jail_status(request)
    client_ip = get_client_ip(request)
    key = f"reset:{client_ip}:{identifier.lower().strip()}"
    allowed, remaining, retry_after = reset_rate_limiter.check(key)
    if not allowed:
        ip_jail.record_violation(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please wait 15 minutes.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(reset_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_verify_email_rate_limit(request: Request):
    check_ip_jail_status(request)
    client_ip = get_client_ip(request)
    key = f"verify_token:{client_ip}"
    allowed, remaining, retry_after = verify_token_rate_limiter.check(key)
    if not allowed:
        ip_jail.record_violation(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please wait 5 minutes.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(verify_token_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_upload_rate_limit(request: Request, user_id: str = ""):
    check_ip_jail_status(request)
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
    check_ip_jail_status(request)
    client_ip = get_client_ip(request)
    key = f"verify:{client_ip}"
    allowed, remaining, retry_after = verify_rate_limiter.check(key)
    if not allowed:
        ip_jail.record_violation(client_ip)
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
    check_ip_jail_status(request)
    client_ip = get_client_ip(request)
    key = f"ai:{client_ip}:{identifier}"
    allowed, remaining, retry_after = ai_heavy_rate_limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI generation and heavy computational limit reached. Please wait 1 minute.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(ai_heavy_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

def check_scrape_rate_limit(request: Request):
    check_ip_jail_status(request)
    client_ip = get_client_ip(request)
    key = f"scrape:{client_ip}"
    allowed, remaining, retry_after = scrape_rate_limiter.check(key)
    if not allowed:
        ip_jail.record_violation(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Public query rate limit reached. Automated scraping is prohibited.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(scrape_rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
            },
        )
