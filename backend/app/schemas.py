import html
import re
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator, Field, AliasChoices, ConfigDict

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
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    email: str
    name: str
    role: str
    is_verified: bool = False
    shopPublicId: Optional[str] = Field(default=None, validation_alias=AliasChoices("shop_public_id", "shopPublicId"))
    shopQrPayload: Optional[str] = Field(default=None, validation_alias=AliasChoices("shop_qr_payload", "shopQrPayload"))
    created_at: datetime

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
        s = sanitize_text(v)
        if not s or len(s) > 255:
            raise ValueError("Invalid verification token format")
        return s

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
        s = sanitize_text(v)
        if not s or len(s) > 255:
            raise ValueError("Invalid reset token format")
        return s

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
        if len(s) > 50:
            raise ValueError("Page range must not exceed 50 characters")
        return s

class PrintJobCreate(BaseModel):
    fileName: str
    fileType: str
    fileSize: int
    copies: int = 1
    paperSize: str = "A4"
    colorMode: str = "Black & White"
    twoSided: str = "One-Sided"
    pageRange: str = "All"
    shopPublicId: Optional[str] = None

    @field_validator("fileName")
    @classmethod
    def validate_file_name(cls, v: str) -> str:
        s = sanitize_text(v)
        if not s or len(s) > 255:
            raise ValueError("Filename must be between 1 and 255 characters")
        return s

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

    @field_validator("twoSided")
    @classmethod
    def validate_two_sided(cls, v: str) -> str:
        if v not in {"One-Sided", "Two-Sided (Long Edge)", "Two-Sided (Short Edge)"}:
            raise ValueError("Unsupported two-sided option")
        return v

class PrintDocumentResponse(BaseModel):
    id: str
    printJobId: str
    fileName: str
    fileType: str
    fileSize: int
    copies: int
    paperSize: str
    colorMode: str
    twoSided: str
    pageRange: str
    printOrder: int

    class Config:
        from_attributes = True

class PrintJobResponse(BaseModel):
    id: str
    printId: str
    status: str
    createdAt: datetime
    expiresAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    destroyedAt: Optional[datetime] = None
    customerId: str
    shopId: Optional[str] = None
    documents: List[PrintDocumentResponse] = []

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
class PrintSessionResponse(BaseModel):
    id: str
    jobId: str
    shopUserId: str
    startedAt: datetime
    endedAt: Optional[datetime] = None

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
        p = v.lower().strip()
        if p not in {"socket", "ipp", "ipps", "lpd"}:
            raise ValueError("Protocol must be 'socket', 'ipp', 'ipps', or 'lpd'")
        return p

    @field_validator("printerEndpoint")
    @classmethod
    def validate_endpoint(cls, v: str) -> str:
        s = v.strip()
        if not s or len(s) > 255:
            raise ValueError("Printer endpoint must be between 1 and 255 characters")
        if re.search(r"[;&|`$<>\r\n]", s):
            raise ValueError("Printer endpoint contains prohibited characters")
        return s

class ShopPrinterUpdate(BaseModel):
    printerName: Optional[str] = None
    printerProtocol: Optional[str] = None
    printerEndpoint: Optional[str] = None
    printerColorCapable: Optional[bool] = None

    @field_validator("printerName")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            s = sanitize_text(v)
            if not s or len(s) > 100:
                raise ValueError("Printer name must be between 1 and 100 characters")
            return s
        return v

    @field_validator("printerProtocol")
    @classmethod
    def validate_protocol(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            p = v.lower().strip()
            if p not in {"socket", "ipp", "ipps", "lpd"}:
                raise ValueError("Protocol must be 'socket', 'ipp', 'ipps', or 'lpd'")
            return p
        return v

    @field_validator("printerEndpoint")
    @classmethod
    def validate_endpoint(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            s = v.strip()
            if not s or len(s) > 255:
                raise ValueError("Printer endpoint must be between 1 and 255 characters")
            if re.search(r"[;&|`$<>\r\n]", s):
                raise ValueError("Printer endpoint contains prohibited characters")
            return s
        return v

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
    latencyMs: int
