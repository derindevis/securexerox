import os
import json
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
import re
import uuid
import html

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PrintJob, PrintDocument, ShopPrinter
from app.schemas import PrintJobResponse, PrintDocumentResponse
from app.dependencies import get_current_user, require_role
from app.config import settings
from app.storage import save_uploaded_file, delete_job_file
from app.rate_limiter import check_upload_rate_limit

router = APIRouter(prefix="/api/jobs", tags=["Print Jobs"])

def generate_print_id() -> str:
    chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    code = ''.join(secrets.choice(chars) for _ in range(6))
    return f"SX-{code}"

def validate_uuid_format(val: str) -> None:
    try:
        uuid.UUID(val)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resource identifier format")

def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename).replace("\x00", "").strip()
    cleaned = re.sub(r'[^A-Za-z0-9_\-\. ]', '_', base)
    return html.escape(cleaned[:255])

def to_job_response(job: PrintJob) -> PrintJobResponse:
    docs = []
    if hasattr(job, "documents") and job.documents:
        for d in sorted(job.documents, key=lambda x: x.print_order):
            docs.append(PrintDocumentResponse(
                id=d.id,
                printJobId=d.print_job_id,
                fileName=d.file_name,
                fileType=d.file_type,
                fileSize=d.file_size,
                copies=d.copies,
                paperSize=d.paper_size,
                colorMode=d.color_mode,
                orientation=d.orientation,
                pageRange=d.page_range,
                printOrder=d.print_order,
            ))
    return PrintJobResponse(
        id=job.id,
        printId=job.print_id,
        status=job.status,
        createdAt=job.created_at,
        expiresAt=job.expires_at,
        completedAt=job.completed_at,
        destroyedAt=job.destroyed_at,
        customerId=job.user_id,
        shopId=job.shop_id,
        documents=docs,
    )

@router.post("", response_model=PrintJobResponse)
async def create_job(
    request: Request,
    files: List[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    documentsConfig: Optional[str] = Form(None),
    fileName: Optional[str] = Form(None),
    fileType: Optional[str] = Form(None),
    fileSize: Optional[int] = Form(None),
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
    
    # Collect all uploaded files (multi-file or single file fallback)
    upload_files = []
    if files:
        upload_files = [f for f in files if f and f.filename]
    elif file and file.filename:
        upload_files = [file]

    if not upload_files:
        raise HTTPException(status_code=422, detail="At least one document file is required")

    # Parse per-document configs
    parsed_configs = []
    if documentsConfig:
        try:
            parsed_configs = json.loads(documentsConfig)
        except Exception:
            parsed_configs = []

    # Validate destination shop (MANDATORY)
    if not shopPublicId or not shopPublicId.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A verified destination print shop is required. Please scan the shop QR or select a shop counter."
        )

    clean_shop_id = shopPublicId.strip().upper()
    target_shop = db.query(User).filter(
        (User.shop_public_id == clean_shop_id) | (User.id == shopPublicId),
        User.role == "shop"
    ).first()

    if not target_shop:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Print shop '{shopPublicId}' is not registered or active."
        )

    target_shop_id = target_shop.id

    # Generate unique 6-character Print ID
    print_id = generate_print_id()
    while db.query(PrintJob).filter(PrintJob.print_id == print_id).first():
        print_id = generate_print_id()

    expires_at = datetime.utcnow() + timedelta(minutes=settings.PRINT_ID_EXPIRY_MINUTES)

    # 1. Create parent PrintJob
    job = PrintJob(
        print_id=print_id,
        user_id=current_user.id,
        shop_id=target_shop_id,
        status="PRINT_ID_GENERATED",
        expires_at=expires_at,
    )
    db.add(job)
    db.flush()

    # 2. Process and encrypt each document in the batch
    signatures = {
        "application/pdf": b"%PDF-",
        "image/jpeg": b"\xff\xd8\xff",
        "image/png": b"\x89PNG\r\n\x1a\n"
    }

    for idx, uploaded in enumerate(upload_files):
        # Extract per-document config or fallback to global params
        doc_cfg = parsed_configs[idx] if idx < len(parsed_configs) else {}
        doc_copies = int(doc_cfg.get("copies", copies))
        doc_paper = str(doc_cfg.get("paperSize", paperSize))
        doc_color = str(doc_cfg.get("colorMode", colorMode))
        doc_orientation = str(doc_cfg.get("orientation", orientation))
        doc_pagerange = str(doc_cfg.get("pageRange", pageRange))

        # Validate bounds
        if doc_copies < 1 or doc_copies > 100:
            raise HTTPException(status_code=422, detail="Copies must be between 1 and 100")
        if doc_paper not in {"A4", "A3", "Letter", "Legal"}:
            raise HTTPException(status_code=422, detail="Unsupported paper size")
        if doc_color not in {"Color", "Black & White"}:
            raise HTTPException(status_code=422, detail="Unsupported color mode")
        if doc_orientation not in {"Portrait", "Landscape"}:
            raise HTTPException(status_code=422, detail="Unsupported orientation")

        # Read & encrypt file content
        content = await uploaded.read(settings.MAX_FILE_SIZE + 1)
        if not content or len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"Document '{uploaded.filename}' exceeds 10 MB limit")

        # Determine file type
        ctype = uploaded.content_type or "application/pdf"
        normalized_type = "pdf"
        if "jpeg" in ctype or "jpg" in ctype or uploaded.filename.lower().endswith(('.jpg', '.jpeg')):
            normalized_type = "jpg"
        elif "png" in ctype or uploaded.filename.lower().endswith('.png'):
            normalized_type = "png"
        elif uploaded.filename.lower().endswith(('.doc', '.docx')):
            normalized_type = "docx"

        _, file_path = save_uploaded_file(content, uploaded.filename)

        print_doc = PrintDocument(
            print_job_id=job.id,
            file_name=sanitize_filename(uploaded.filename),
            file_path=file_path,
            file_type=normalized_type,
            file_size=len(content),
            copies=doc_copies,
            paper_size=doc_paper,
            color_mode=doc_color,
            orientation=doc_orientation,
            page_range=html.escape(doc_pagerange[:50]),
            print_order=idx,
        )
        db.add(print_doc)

    db.commit()
    db.refresh(job)

    return to_job_response(job)

@router.get("", response_model=List[PrintJobResponse])
def get_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "customer":
        jobs = db.query(PrintJob).filter(PrintJob.user_id == current_user.id).order_by(PrintJob.created_at.desc()).all()
    else:
        jobs = db.query(PrintJob).order_by(PrintJob.created_at.desc()).all()

    return [to_job_response(job) for job in jobs]

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

    return to_job_response(job)

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

    # Zero-byte shredding & deletion of all attached documents
    delete_job_file(job)
    job.status = "DESTROYED"
    job.destroyed_at = datetime.utcnow()
    db.commit()

    return to_job_response(job)
