import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import decode_access_token
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_optional_current_user_or_guest(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> User:
    if token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            user = db.query(User).filter(User.id == payload.get("sub")).first()
            if user:
                return user
    
    # Auto-provision or retrieve an anonymous guest customer record
    guest_email = f"guest_{secrets.token_hex(6)}@guest.securexerox.internal"
    guest_user = User(
        email=guest_email,
        password_hash="GUEST_SESSION",
        name="Walk-in Guest",
        role="customer",
        is_verified=True,
    )
    db.add(guest_user)
    db.commit()
    db.refresh(guest_user)
    return guest_user

def require_role(role: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'",
            )
        return current_user
    return role_checker
