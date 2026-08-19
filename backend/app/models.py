import uuid
import secrets
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def generate_shop_public_id() -> str:
    return f"SX-SHOP-{secrets.token_hex(2).upper()}"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="customer")  # "customer" or "shop"
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String, index=True, nullable=True)
    verification_token_expires_at = Column(DateTime, nullable=True)
    reset_token = Column(String, index=True, nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    
    # Permanent Shop Identifier & Standee QR (For shop operators)
    shop_public_id = Column(String, unique=True, index=True, nullable=True)
    shop_qr_payload = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def shopPublicId(self):
        return self.shop_public_id

    @property
    def shopQrPayload(self):
        return self.shop_qr_payload

    jobs = relationship("PrintJob", foreign_keys="[PrintJob.user_id]", back_populates="customer")
    printers = relationship("ShopPrinter", back_populates="shop_user", cascade="all, delete-orphan")

class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    print_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    shop_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    
    status = Column(String, nullable=False, default="PRINT_ID_GENERATED")

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    destroyed_at = Column(DateTime, nullable=True)

    customer = relationship("User", foreign_keys=[user_id], back_populates="jobs")
    shop = relationship("User", foreign_keys=[shop_id])
    documents = relationship("PrintDocument", back_populates="job", cascade="all, delete-orphan")
    sessions = relationship("PrintSession", back_populates="job", cascade="all, delete-orphan")

class PrintDocument(Base):
    __tablename__ = "print_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    print_job_id = Column(String, ForeignKey("print_jobs.id"), nullable=False)
    
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    
    copies = Column(Integer, default=1)
    paper_size = Column(String, default="A4")
    color_mode = Column(String, default="Black & White")
    orientation = Column(String, default="Portrait")
    page_range = Column(String, default="All")
    print_order = Column(Integer, default=0)

    job = relationship("PrintJob", back_populates="documents")

class PrintSession(Base):
    __tablename__ = "print_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("print_jobs.id"), nullable=False)
    shop_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    job = relationship("PrintJob", back_populates="sessions")

class ShopPrinter(Base):
    __tablename__ = "shop_printers"

    id = Column(String, primary_key=True, default=generate_uuid)
    shop_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    printer_name = Column(String, nullable=False)
    printer_protocol = Column(String, nullable=False, default="socket")  # "socket" (port 9100) or "ipp" (port 631)
    printer_endpoint = Column(String, nullable=False)  # e.g., "192.168.1.150:9100" or "192.168.1.150:631/ipp/print"
    printer_color_capable = Column(Boolean, default=False, nullable=False)
    printer_status = Column(String, default="untested", nullable=False)  # "untested", "online", "offline"
    printer_last_tested_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    shop_user = relationship("User", back_populates="printers")
