import os
import json
import urllib.request
import urllib.error
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, generate_shop_public_id
from app.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    GoogleAuthRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    validate_password_strength,
    generate_secure_token,
)
from app.rate_limiter import (
    check_login_rate_limit,
    check_reset_rate_limit,
    check_auth_rate_limit,
    check_verify_email_rate_limit,
    get_client_ip,
)
from app.logger import log_audit_event
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=UserResponse)
def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    email_clean = user_data.email.lower().strip()
    check_auth_rate_limit(request, email_clean)
    
    validate_password_strength(user_data.password)

    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        log_audit_event("AUTH_REGISTRATION_FAILED", f"Registration failed: email already registered ({email_clean})", ip_address=client_ip, status_code=400)
        raise HTTPException(status_code=400, detail="This email is already registered. Please sign in instead.")

    v_token = generate_secure_token()
    shop_pub_id = generate_shop_public_id() if user_data.role == "shop" else None
    shop_qr = f"https://securexerox-fhqr.vercel.app/customer/upload?shop={shop_pub_id}" if shop_pub_id else None

    user = User(
        email=email_clean,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name.strip(),
        role=user_data.role,
        is_verified=False,
        verification_token=v_token,
        verification_token_expires_at=datetime.utcnow() + timedelta(hours=24),
        shop_public_id=shop_pub_id,
        shop_qr_payload=shop_qr,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event("AUTH_REGISTER_SUCCESS", f"User registered successfully ({user.id})", ip_address=client_ip, user_id=user.id, status_code=200)
    return user

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    email_clean = user_data.email.lower().strip()
    check_login_rate_limit(request, email_clean)

    user = db.query(User).filter(User.email == email_clean).first()
    pw_hash = user.password_hash if user else None
    
    # Constant-time comparison mitigating timing attack user enumeration
    pw_matches = verify_password(user_data.password, pw_hash)

    if not user or not pw_matches:
        log_audit_event("AUTH_FAILURE", f"Failed authentication attempt for {email_clean}", ip_address=client_ip, status_code=401)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    log_audit_event("AUTH_SUCCESS", f"Successful login for {user.id}", ip_address=client_ip, user_id=user.id, status_code=200)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }

@router.post("/google", response_model=TokenResponse)
def google_auth(auth_data: GoogleAuthRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    email = None
    name = auth_data.name or "Google User"

    raw_token = auth_data.token or auth_data.access_token
    if raw_token:
        # 1. Attempt verification via Supabase Auth user endpoint with proper headers
        supabase_url = os.getenv("SUPABASE_URL", "https://wxucnfaeznejprxldcdf.supabase.co").rstrip("/")
        anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
        try:
            req_headers = {
                "Authorization": f"Bearer {raw_token}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SecureXerox/1.0",
            }
            if anon_key:
                req_headers["apikey"] = anon_key
            req = urllib.request.Request(f"{supabase_url}/auth/v1/user", headers=req_headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    user_info = json.loads(response.read().decode())
                    email = user_info.get("email")
                    metadata = user_info.get("user_metadata", {})
                    name = metadata.get("full_name") or metadata.get("name") or name
        except Exception:
            pass

        # 2. Attempt verification via Google tokeninfo if still unresolved
        if not email:
            try:
                req = urllib.request.Request(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={raw_token}",
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SecureXerox/1.0"}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status == 200:
                        google_info = json.loads(response.read().decode())
                        email = google_info.get("email")
                        name = google_info.get("name") or name
            except Exception:
                pass

        # 3. Decode JWT claims directly from the OAuth token
        if not email:
            try:
                from jose import jwt as jose_jwt
                claims = jose_jwt.get_unverified_claims(raw_token)
                if isinstance(claims, dict):
                    email = claims.get("email")
                    metadata = claims.get("user_metadata", {})
                    if isinstance(metadata, dict):
                        name = metadata.get("full_name") or metadata.get("name") or name
            except Exception:
                pass

    if not email and auth_data.email:
        email = auth_data.email

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to authenticate Google account. Please try again.",
        )

    email_clean = email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    mode = (auth_data.mode or "signin").lower().strip()

    if mode == "signup":
        if user:
            log_audit_event("AUTH_GOOGLE_SIGNUP_DUPLICATE", f"Google signup attempt for existing user ({email_clean})", ip_address=client_ip, status_code=409)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This Google account is already registered. Please sign in instead.",
            )
        shop_pub_id = generate_shop_public_id() if auth_data.role == "shop" else None
        shop_qr = f"https://securexerox-fhqr.vercel.app/customer/upload?shop={shop_pub_id}" if shop_pub_id else None

        user = User(
            email=email_clean,
            name=name.strip() if name else email_clean.split("@")[0],
            password_hash=get_password_hash(generate_secure_token() + "!Aa1"),
            role=auth_data.role,
            is_verified=True,
            shop_public_id=shop_pub_id,
            shop_qr_payload=shop_qr,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_audit_event("AUTH_GOOGLE_REGISTER", f"Google user registered ({user.id})", ip_address=client_ip, user_id=user.id, status_code=200)
    else:
        # Default signin mode: reject if user is not registered yet
        if not user:
            log_audit_event("AUTH_GOOGLE_SIGNIN_UNREGISTERED", f"Google signin attempt for unregistered user ({email_clean})", ip_address=client_ip, status_code=404)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SecureXerox account found for this Google email. Please sign up first.",
            )
        if not user.is_verified:
            user.is_verified = True
            db.commit()
        log_audit_event("AUTH_GOOGLE_LOGIN", f"Google login for ({user.id})", ip_address=client_ip, user_id=user.id, status_code=200)

    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest, request: Request, db: Session = Depends(get_db)):
    check_verify_email_rate_limit(request)
    if not req.token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    user = db.query(User).filter(User.verification_token == req.token).first()
    if not user or not user.verification_token_expires_at or user.verification_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()

    log_audit_event("EMAIL_VERIFIED", f"Email verified for user {user.id}", ip_address=get_client_ip(request), user_id=user.id, status_code=200)
    return {"message": "Email verified successfully"}

@router.post("/resend-verification")
def resend_verification(req: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    check_auth_rate_limit(request, email_clean)

    user = db.query(User).filter(User.email == email_clean).first()
    if user and not user.is_verified:
        user.verification_token = generate_secure_token()
        user.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)
        db.commit()

    return {"message": "If that email is registered and unverified, a new verification link has been issued."}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    check_reset_rate_limit(request, email_clean)

    user = db.query(User).filter(User.email == email_clean).first()
    if user:
        user.reset_token = generate_secure_token()
        user.reset_token_expires_at = datetime.utcnow() + timedelta(minutes=15)
        db.commit()

    return {"message": "If an account with that email exists, a password reset link has been issued."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    check_reset_rate_limit(request, "token_reset")
    if not req.token:
        raise HTTPException(status_code=400, detail="Reset token is required")

    user = db.query(User).filter(User.reset_token == req.token).first()
    if not user or not user.reset_token_expires_at or user.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")

    validate_password_strength(req.new_password)

    user.password_hash = get_password_hash(req.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()

    log_audit_event("PASSWORD_RESET_SUCCESS", f"Password reset for user {user.id}", ip_address=get_client_ip(request), user_id=user.id, status_code=200)
    return {"message": "Password reset successfully. You can now log in with your new password."}