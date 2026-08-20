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
    current_user: User = Depends(get_current_user),
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

    # Optional destination shop resolution (Counter Standee or Universal)
    target_shop = None
    target_shop_id = None
    is_color_capable = True

    if shopPublicId and shopPublicId.strip():
        clean_shop_id = shopPublicId.strip().upper()
        target_shop = db.query(User).filter(
            (User.shop_public_id == clean_shop_id) | (User.id == shopPublicId),
            User.role == "shop"
        ).first()

        if not target_shop and clean_shop_id.startswith("SX-SHOP-"):
            prefix_sub = clean_shop_id.replace("SX-SHOP-", "").lower()
            if prefix_sub:
                target_shop = db.query(User).filter(
                    User.id.startswith(prefix_sub),
                    User.role == "shop"
                ).first()

        if not target_shop:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Print shop '{shopPublicId}' is not registered or active."
            )

        target_shop_id = target_shop.id

        # Check shop hardware color capability
        shop_printers = db.query(ShopPrinter).filter(ShopPrinter.shop_user_id == target_shop.id).all()
        if shop_printers:
            is_color_capable = any(p.printer_color_capable for p in shop_printers)

    # Generate unique 6-character Print ID
    print_id = generate_print_id()
    while db.query(PrintJob).filter(PrintJob.print_id == print_id).first():
        print_id = generate_print_id()

    expires_at = datetime.utcnow() + timedelta(minutes=settings.PRINT_ID_EXPIRY_MINUTES)

    # Extract primary document metadata for legacy backward-compatible columns
    first_upload = upload_files[0]
    first_name = sanitize_filename(first_upload.filename or "document.pdf")
    first_cfg = parsed_configs[0] if parsed_configs else {}
    _, first_ext = os.path.splitext(first_name.lower())
    first_type = "pdf" if "pdf" in first_ext else ("png" if "png" in first_ext else "jpg")

    # 1. Create parent PrintJob
    job = PrintJob(
        print_id=print_id,
        user_id=current_user.id,
        shop_id=target_shop_id,
        status="PRINT_ID_GENERATED",
        expires_at=expires_at,
        file_name=first_name,
        file_type=first_type,
        file_size=0,
        copies=int(first_cfg.get("copies", copies)),
        paper_size=str(first_cfg.get("paperSize", paperSize)),
        color_mode=str(first_cfg.get("colorMode", colorMode)),
        orientation=str(first_cfg.get("orientation", orientation)),
        page_range=str(first_cfg.get("pageRange", pageRange)),
    )
    db.add(job)
    db.flush()

    # 2. Process, strictly validate magic bytes, and encrypt each document
    ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc"}

    for idx, uploaded in enumerate(upload_files):
        # 1. Filename & Extension Sanitization
        raw_name = uploaded.filename or f"document_{idx+1}.pdf"
        if "\x00" in raw_name or ".." in raw_name:
            raise HTTPException(status_code=400, detail="Invalid filename format")
        
        _, ext = os.path.splitext(raw_name.lower())
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file format '{ext}'. Only PDF, JPEG, PNG, and Word documents are permitted."
            )

        # 2. Extract per-document config or fallback to global params
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
        if doc_color == "Color" and not is_color_capable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target shop '{target_shop.name}' does not support color printing."
            )
        if doc_orientation not in {"Portrait", "Landscape"}:
            raise HTTPException(status_code=422, detail="Unsupported orientation")

        # 3. Read content & enforce size bounds
        content = await uploaded.read(settings.MAX_FILE_SIZE + 1)
        if not content:
            raise HTTPException(status_code=422, detail=f"Document '{raw_name}' is empty")
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"Document '{raw_name}' exceeds 10 MB limit")

        # 4. Strict Magic Byte Header Signature Verification
        normalized_type = "pdf"
        if ext in {".jpg", ".jpeg"}:
            if not content.startswith(b"\xff\xd8\xff"):
                raise HTTPException(status_code=422, detail=f"File '{raw_name}' does not match valid JPEG image signature")
            normalized_type = "jpg"
        elif ext == ".png":
            if not content.startswith(b"\x89PNG\r\n\x1a\n"):
                raise HTTPException(status_code=422, detail=f"File '{raw_name}' does not match valid PNG image signature")
            normalized_type = "png"
        elif ext == ".pdf":
            if not content.startswith(b"%PDF-"):
                raise HTTPException(status_code=422, detail=f"File '{raw_name}' does not match valid PDF document signature")
            normalized_type = "pdf"
        elif ext in {".docx", ".doc"}:
            if not (content.startswith(b"PK\x03\x04") or content.startswith(b"\xd0\xcf\x11\xe0")):
                raise HTTPException(status_code=422, detail=f"File '{raw_name}' does not match valid Word document signature")
            normalized_type = "docx"

        # 5. Encrypted File Storage
        _, file_path = save_uploaded_file(content, raw_name)

        if idx == 0:
            job.file_path = file_path
            job.file_size = len(content)
            job.file_type = normalized_type

        print_doc = PrintDocument(
            print_job_id=job.id,
            file_name=sanitize_filename(raw_name),
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
    elif current_user.role == "shop":
        jobs = db.query(PrintJob).filter(PrintJob.shop_id == current_user.id).order_by(PrintJob.created_at.desc()).all()
    else:
        jobs = []

    return [to_job_response(job) for job in jobs]

@router.get("/{job_id}", response_model=PrintJobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_uuid_format(job_id)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Strict IDOR check: Customer must own job, Shop must be the assigned target (or universal unassigned)
    if current_user.role == "customer" and job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    elif current_user.role == "shop" and job.shop_id and job.shop_id != current_user.id:
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

    # Strict IDOR check: Customer must own job, Shop must be the assigned target
    if current_user.role == "customer" and job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    elif current_user.role == "shop" and job.shop_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == "DESTROYED":
        raise HTTPException(status_code=400, detail="Document has already been destroyed")

    # Zero-byte shredding & deletion of all attached documents
    delete_job_file(job)
    job.status = "DESTROYED"
    job.destroyed_at = datetime.utcnow()
    db.commit()

    return to_job_response(job)
