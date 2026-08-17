import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

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
    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("PrintJob", back_populates="customer")

class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    print_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    
    copies = Column(Integer, default=1)
    paper_size = Column(String, default="A4")
    color_mode = Column(String, default="Black & White")
    orientation = Column(String, default="Portrait")
    page_range = Column(String, default="All")
    
    status = Column(String, nullable=False, default="PRINT_ID_GENERATED")
    violations = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    destroyed_at = Column(DateTime, nullable=True)

    customer = relationship("User", back_populates="jobs")
    sessions = relationship("PrintSession", back_populates="job", cascade="all, delete-orphan")

class PrintSession(Base):
    __tablename__ = "print_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("print_jobs.id"), nullable=False)
    shop_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    violations = Column(Integer, default=0)
    is_locked = Column(Boolean, default=False)
    security_events = Column(JSON, default=list)

    job = relationship("PrintJob", back_populates="sessions")
