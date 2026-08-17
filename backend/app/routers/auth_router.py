import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
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
from app.rate_limiter import check_login_rate_limit, check_reset_rate_limit, check_auth_rate_limit, get_client_ip
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
    user = User(
        email=email_clean,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name.strip(),
        role=user_data.role,
        is_verified=False,
        verification_token=v_token,
        verification_token_expires_at=datetime.utcnow() + timedelta(hours=24),
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
    if not user:
        log_audit_event("AUTH_FAILURE", f"Login attempt for unregistered email {email_clean}", ip_address=client_ip, status_code=401)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This email is not registered yet. Please sign up first.",
        )

    if not verify_password(user_data.password, user.password_hash):
        log_audit_event("AUTH_FAILURE", f"Failed password attempt for {email_clean}", ip_address=client_ip, status_code=401)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    log_audit_event("AUTH_SUCCESS", f"Successful login for {user.id}", ip_address=client_ip, user_id=user.id, status_code=200)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    if not req.token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    user = db.query(User).filter(User.verification_token == req.token).first()
    if not user or not user.verification_token_expires_at or user.verification_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()

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

    return {"message": "Password reset successfully. You can now log in with your new password."}