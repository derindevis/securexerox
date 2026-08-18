import html
import re
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator

def sanitize_text(v: str) -> str:
    if not isinstance(v, str):
        return v
    # Remove null bytes and path traversal sequences
    cleaned = v.replace("\x00", "").strip()
    # HTML escape for XSS protection
    return html.escape(cleaned, quote=True)

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "customer"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        s = sanitize_text(v)
        if not s or len(s) > 100:
            raise ValueError("Name must be between 1 and 100 characters")
        return s

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in {"customer", "shop"}:
            raise ValueError("Invalid role specified")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_verified: bool = False
    shopPublicId: Optional[str] = None
    shopQrPayload: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class GoogleAuthRequest(BaseModel):
    token: Optional[str] = None
    access_token: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: str = "customer"
    mode: Optional[str] = "signin"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in {"customer", "shop"}:
            raise ValueError("Invalid role specified")
        return v

class VerifyEmailRequest(BaseModel):
    token: str

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        return sanitize_text(v)

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        return sanitize_text(v)

# Print Job Schemas
class PrintSettings(BaseModel):
    copies: int = 1
    paperSize: str = "A4"
    colorMode: str = "Black & White"
    orientation: str = "Portrait"
    pageRange: str = "All"

    @field_validator("copies")
    @classmethod
    def validate_copies(cls, v: int) -> int:
        if v < 1 or v > 100:
            raise ValueError("Copies must be between 1 and 100")
        return v

    @field_validator("paperSize")
    @classmethod
    def validate_paper_size(cls, v: str) -> str:
        if v not in {"A4", "A3", "Letter", "Legal"}:
            raise ValueError("Unsupported paper size")
        return v

    @field_validator("colorMode")
    @classmethod
    def validate_color_mode(cls, v: str) -> str:
        if v not in {"Color", "Black & White"}:
            raise ValueError("Unsupported color mode")
        return v

    @field_validator("orientation")
    @classmethod
    def validate_orientation(cls, v: str) -> str:
        if v not in {"Portrait", "Landscape"}:
            raise ValueError("Unsupported orientation")
        return v

    @field_validator("pageRange")
    @classmethod
    def validate_page_range(cls, v: str) -> str:
        s = sanitize_text(v)
        if len(s) > 50 or not re.match(r"^[A-Za-z0-9\-\, ]+$", s):
            raise ValueError("Invalid page range format")
        return s

class PrintJobCreate(PrintSettings):
    fileName: str
    fileType: str
    fileSize: int
    shopPublicId: Optional[str] = None

    @field_validator("fileName")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        s = sanitize_text(v)
        if not s or len(s) > 255:
            raise ValueError("File name must be between 1 and 255 characters")
        return s

    @field_validator("fileType")
    @classmethod
    def validate_filetype(cls, v: str) -> str:
        if v.lower() not in {"pdf", "jpg", "jpeg", "png"}:
            raise ValueError("Unsupported file type")
        return v.lower()

class PrintJobResponse(BaseModel):
    id: str
    printId: str
    fileName: str
    fileType: str
    fileSize: int
    copies: int
    paperSize: str
    colorMode: str
    orientation: str
    pageRange: str
    status: str
    violations: int
    createdAt: datetime
    expiresAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    destroyedAt: Optional[datetime] = None
    customerId: str
    shopId: Optional[str] = None

    class Config:
        from_attributes = True

# Public Shop Discovery & Capability Schemas
class ShopPublicInfoResponse(BaseModel):
    id: str
    shopName: str
    shopPublicId: str
    shopQrPayload: Optional[str] = None
    isOnline: bool = False
    isColorCapable: bool = False
    printerCount: int = 0
    supportedPaperSizes: List[str] = ["A4", "A3", "Letter", "Legal"]

# Session Schemas
class ViolationRequest(BaseModel):
    type: str

    @field_validator("type")
    @classmethod
    def validate_violation_type(cls, v: str) -> str:
        allowed = {"SCREENSHOT_ATTEMPT", "WINDOW_BLUR", "DEVTOOLS_OPEN", "PRINTER_MANIPULATION"}
        if v not in allowed:
            raise ValueError("Invalid security violation type")
        return v

class PrintSessionResponse(BaseModel):
    id: str
    jobId: str
    shopUserId: str
    startedAt: datetime
    endedAt: Optional[datetime] = None
    violations: int
    isLocked: bool
    securityEvents: List[Any] = []

    class Config:
        from_attributes = True

# Hardware Printer Registry Schemas
class ShopPrinterCreate(BaseModel):
    printerName: str
    printerProtocol: str = "socket"  # "socket" or "ipp"
    printerEndpoint: str  # e.g., "192.168.1.150:9100" or "192.168.1.150:631/ipp/print"
    printerColorCapable: bool = False

    @field_validator("printerName")
    @classmethod
    def validate_name(cls, v: str) -> str:
        s = sanitize_text(v)
        if not s or len(s) > 100:
            raise ValueError("Printer name must be between 1 and 100 characters")
        return s

    @field_validator("printerProtocol")
    @classmethod
    def validate_protocol(cls, v: str) -> str:
        if v.lower() not in {"socket", "ipp"}:
            raise ValueError("Protocol must be 'socket' or 'ipp'")
        return v.lower()

    @field_validator("printerEndpoint")
    @classmethod
    def validate_endpoint(cls, v: str) -> str:
        s = sanitize_text(v)
        if not s or len(s) > 255:
            raise ValueError("Printer endpoint must be valid")
        return s

class ShopPrinterUpdate(BaseModel):
    printerName: Optional[str] = None
    printerProtocol: Optional[str] = None
    printerEndpoint: Optional[str] = None
    printerColorCapable: Optional[bool] = None

class ShopPrinterResponse(BaseModel):
    id: str
    shopUserId: str
    printerName: str
    printerProtocol: str
    printerEndpoint: str
    printerColorCapable: bool
    printerStatus: str
    printerLastTestedAt: Optional[datetime] = None
    createdAt: datetime

    class Config:
        from_attributes = True

class PrinterTestResponse(BaseModel):
    success: bool
    printerStatus: str
    message: str
    latencyMs: Optional[int] = None
