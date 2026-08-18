import os
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PrintJob
from app.schemas import PrintJobResponse
from app.dependencies import get_current_user, require_role
from app.config import settings
from app.storage import save_uploaded_file, delete_job_file

router = APIRouter(prefix="/api/jobs", tags=["Print Jobs"])

def generate_print_id() -> str:
    chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    code = ''.join(secrets.choice(chars) for _ in range(6))
    return f"SX-{code}"
import re
import uuid
import html
from app.rate_limiter import check_upload_rate_limit

def validate_uuid_format(val: str) -> None:
    try:
        uuid.UUID(val)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resource identifier format")

def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename).replace("\x00", "").strip()
    cleaned = re.sub(r'[^A-Za-z0-9_\-\. ]', '_', base)
    return html.escape(cleaned[:255])

@router.post("", response_model=PrintJobResponse)
async def create_job(
    request: Request,
    file: Optional[UploadFile] = File(None),
    fileName: str = Form(...),
    fileType: str = Form(...),
    fileSize: int = Form(...),
    copies: int = Form(1),
    paperSize: str = Form("A4"),
    colorMode: str = Form("Black & White"),
    orientation: str = Form("Portrait"),
    pageRange: str = Form("All"),
    shopPublicId: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    check_upload_rate_limit(request, current_user.id)
    
    # Input bounds and Enum validation
    if copies < 1 or copies > 100:
        raise HTTPException(status_code=422, detail="Copies must be between 1 and 100")
    if paperSize not in {"A4", "A3", "Letter", "Legal"}:
        raise HTTPException(status_code=422, detail="Unsupported paper size")
    if colorMode not in {"Color", "Black & White"}:
        raise HTTPException(status_code=422, detail="Unsupported color mode")
    if orientation not in {"Portrait", "Landscape"}:
        raise HTTPException(status_code=422, detail="Unsupported orientation")

    target_shop_id = None
    if shopPublicId:
        clean_shop_id = shopPublicId.strip().upper()
        target_shop = db.query(User).filter(
            (User.shop_public_id == clean_shop_id) | (User.id == shopPublicId),
            User.role == "shop"
        ).first()
        if target_shop:
            target_shop_id = target_shop.id
            # Validate color capability if shop has printers
            from app.models import ShopPrinter
            printers = db.query(ShopPrinter).filter(ShopPrinter.shop_user_id == target_shop.id).all()
            if printers and colorMode == "Color" and not any(p.printer_color_capable for p in printers):
                raise HTTPException(
                    status_code=400,
                    detail=f"Print shop '{target_shop.name}' currently offers Black & White printing only."
                )
    
    safe_filename = sanitize_filename(fileName)
    safe_pagerange = html.escape(pageRange[:50])

    print_id = generate_print_id()
    while db.query(PrintJob).filter(PrintJob.print_id == print_id).first():
        print_id = generate_print_id()

    if not file:
        raise HTTPException(status_code=422, detail="A document file is required")
    if file.content_type not in {"application/pdf", "image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="Only PDF, JPG, and PNG documents are supported")
    content = await file.read(settings.MAX_FILE_SIZE + 1)
    if not content or len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Document must be between 1 byte and 10 MB")
    signatures = {"application/pdf": b"%PDF-", "image/jpeg": b"\xff\xd8\xff", "image/png": b"\x89PNG\r\n\x1a\n"}
    if not content.startswith(signatures[file.content_type]):
        raise HTTPException(status_code=415, detail="Document content does not match its declared type")
    normalized_type = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}[file.content_type]
    _, file_path = save_uploaded_file(content, file.filename)

    expires_at = datetime.utcnow() + timedelta(minutes=settings.PRINT_ID_EXPIRY_MINUTES)

    job = PrintJob(
        print_id=print_id,
        user_id=current_user.id,
        shop_id=target_shop_id,
        file_name=safe_filename,
        file_path=file_path,
        file_type=normalized_type,
        file_size=len(content),
        copies=copies,
        paper_size=paperSize,
        color_mode=colorMode,
        orientation=orientation,
        page_range=safe_pagerange,
        status="PRINT_ID_GENERATED",
        expires_at=expires_at,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Format response mapping
    return PrintJobResponse(
        id=job.id,
        printId=job.print_id,
        fileName=job.file_name,
        fileType=job.file_type,
        fileSize=job.file_size,
        copies=job.copies,
        paperSize=job.paper_size,
        colorMode=job.color_mode,
        orientation=job.orientation,
        pageRange=job.page_range,
        status=job.status,
        violations=job.violations,
        createdAt=job.created_at,
        expiresAt=job.expires_at,
        completedAt=job.completed_at,
        destroyedAt=job.destroyed_at,
        customerId=job.user_id,
        shopId=job.shop_id,
    )

@router.get("", response_model=List[PrintJobResponse])
def get_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "customer":
        jobs = db.query(PrintJob).filter(PrintJob.user_id == current_user.id).order_by(PrintJob.created_at.desc()).all()
    else:
        jobs = db.query(PrintJob).order_by(PrintJob.created_at.desc()).all()

    return [
        PrintJobResponse(
            id=job.id,
            printId=job.print_id,
            fileName=job.file_name,
            fileType=job.file_type,
            fileSize=job.file_size,
            copies=job.copies,
            paperSize=job.paper_size,
            colorMode=job.color_mode,
            orientation=job.orientation,
            pageRange=job.page_range,
            status=job.status,
            violations=job.violations,
            createdAt=job.created_at,
            expiresAt=job.expires_at,
            completedAt=job.completed_at,
            destroyedAt=job.destroyed_at,
            customerId=job.user_id,
        )
        for job in jobs
    ]

@router.get("/{job_id}", response_model=PrintJobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_uuid_format(job_id)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job or (current_user.role == "customer" and job.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Job not found")

    return PrintJobResponse(
        id=job.id,
        printId=job.print_id,
        fileName=job.file_name,
        fileType=job.file_type,
        fileSize=job.file_size,
        copies=job.copies,
        paperSize=job.paper_size,
        colorMode=job.color_mode,
        orientation=job.orientation,
        pageRange=job.page_range,
        status=job.status,
        violations=job.violations,
        createdAt=job.created_at,
        expiresAt=job.expires_at,
        completedAt=job.completed_at,
        destroyedAt=job.destroyed_at,
        customerId=job.user_id,
    )

@router.delete("/{job_id}", response_model=PrintJobResponse)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_uuid_format(job_id)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Enforce strict IDOR ownership check
    if current_user.role == "customer" and job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == "DESTROYED":
        raise HTTPException(status_code=400, detail="Document has already been destroyed")

    # Zero-byte shredding & deletion
    delete_job_file(job)
    job.status = "DESTROYED"
    job.destroyed_at = datetime.utcnow()
    db.commit()

    return PrintJobResponse(
        id=job.id,
        printId=job.print_id,
        fileName=job.file_name,
        fileType=job.file_type,
        fileSize=job.file_size,
        copies=job.copies,
        paperSize=job.paper_size,
        colorMode=job.color_mode,
        orientation=job.orientation,
        pageRange=job.page_range,
        status=job.status,
        violations=job.violations,
        createdAt=job.created_at,
        expiresAt=job.expires_at,
        completedAt=job.completed_at,
        destroyedAt=job.destroyed_at,
        customerId=job.user_id,
    )
