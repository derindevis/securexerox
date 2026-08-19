from datetime import datetime, timedelta
from typing import List, Optional
import socket
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PrintJob, PrintSession, ShopPrinter
from app.schemas import PrintJobResponse, PrintSessionResponse, ViolationRequest
from app.dependencies import get_current_user, require_role
from app.storage import delete_job_file, read_decrypted_file
from app.config import settings
from app.rate_limiter import check_verify_rate_limit, get_client_ip
from app.logger import log_audit_event

router = APIRouter(prefix="/api/print", tags=["Shop Operations"])

def get_shop_session(db: Session, job: PrintJob, shop_user_id: str) -> PrintSession:
    session = db.query(PrintSession).filter(
        PrintSession.job_id == job.id,
        PrintSession.shop_user_id == shop_user_id,
        PrintSession.ended_at.is_(None),
    ).order_by(PrintSession.started_at.desc()).first()
    if not session or session.is_locked:
        raise HTTPException(status_code=403, detail="An active session owned by this shop is required")
    if session.started_at + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES) <= datetime.utcnow():
        session.ended_at = datetime.utcnow()
        job.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=410, detail="The secure print session has expired")
from app.schemas import PrintJobResponse, PrintDocumentResponse, PrintSessionResponse, ViolationRequest

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

def stream_to_hardware_printer(printer: Optional[ShopPrinter], file_bytes: bytes, job: PrintJob) -> bool:
    """
    Connects directly to the physical printer via RAW TCP socket (port 9100) or IPP (port 631)
    and transmits decrypted print job bytes.
    """
    endpoint = printer.printer_endpoint.strip() if printer else "virtual:9100"
    protocol = printer.printer_protocol.lower() if printer else "socket"

    cleaned = endpoint.split("://")[-1].split("/")[0]
    if ":" in cleaned:
        host, port_str = cleaned.split(":")
        port = int(port_str)
    else:
        host = cleaned
        port = 631 if protocol == "ipp" else 9100

    # If it's a virtual/demo/loopback target or local test, simulate hardware spooling
    if host.lower() in {"virtual", "demo", "mock", "localhost", "127.0.0.1", "test"}:
        return True

    # Real hardware socket connection
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5.0)
        sock.connect((host, port))
        sock.sendall(file_bytes)
        sock.close()
        return True
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hardware printer unreachable at {endpoint}: {str(e)}"
        )

import re
import uuid

def validate_uuid_format(val: str) -> None:
    try:
        uuid.UUID(val)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resource identifier format")

@router.post("/verify/{print_id}", response_model=PrintJobResponse)
def verify_print_id(
    print_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    check_verify_rate_limit(request)
    cleaned_id = print_id.strip().upper()
    if not re.match(r"^SX-[A-Z0-9]{6}$", cleaned_id):
        raise HTTPException(status_code=400, detail="Invalid Print ID format (must be SX-XXXXXX)")
    job = db.query(PrintJob).filter(PrintJob.print_id == cleaned_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Print ID not found")

    if job.status == "EXPIRED" or (job.expires_at and datetime.utcnow() > job.expires_at):
        job.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="This Print ID has expired")

    if job.status == "DESTROYED":
        raise HTTPException(status_code=400, detail="This Print ID has already been used and destroyed")

    if job.status in ["COMPLETED", "ACCESS_REVOKED"]:
        raise HTTPException(status_code=400, detail="This document has already been printed")

    if job.status == "SESSION_LOCKED":
        raise HTTPException(status_code=400, detail="This session was locked due to security violations")

    return to_job_response(job)

@router.post("/session/start/{job_id}", response_model=PrintSessionResponse)
def start_session(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    validate_uuid_format(job_id)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.expires_at and datetime.utcnow() >= job.expires_at:
        job.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="This Print ID has expired")
    if job.status not in ["PRINT_ID_GENERATED", "WAITING"]:
        raise HTTPException(status_code=409, detail="This Print ID is not available for a new session")

    job.status = "SECURE_SESSION"
    
    session = PrintSession(
        job_id=job.id,
        shop_user_id=current_user.id,
        started_at=datetime.utcnow(),
        violations=0,
        is_locked=False,
        security_events=[],
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return PrintSessionResponse(
        id=session.id,
        jobId=session.job_id,
        shopUserId=session.shop_user_id,
        startedAt=session.started_at,
        endedAt=session.ended_at,
        violations=session.violations,
        isLocked=session.is_locked,
        securityEvents=session.security_events or [],
    )

from app.logger import log_audit_event
from app.rate_limiter import get_client_ip

@router.post("/session/violation/{job_id}")
def record_violation(
    job_id: str,
    violation: ViolationRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    validate_uuid_format(job_id)
    client_ip = get_client_ip(request)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Enforce session ownership BEFORE mutating job state
    session = get_shop_session(db, job, current_user.id)

    job.violations += 1
    session.violations += 1
    events = list(session.security_events or [])
    events.append({
        "type": violation.type,
        "timestamp": datetime.utcnow().isoformat(),
        "violationNumber": session.violations,
    })
    session.security_events = events

    log_audit_event(
        "SECURITY_VIOLATION",
        f"Security violation recorded during print session (type: {violation.type}, count: {session.violations})",
        ip_address=client_ip,
        user_id=current_user.id,
        detail=f"job_id={job.id}"
    )

    if session.violations >= 3:
        session.is_locked = True
        job.status = "SESSION_LOCKED"
        log_audit_event(
            "SESSION_LOCKOUT",
            f"Print session locked out due to threshold violations (job_id: {job.id})",
            ip_address=client_ip,
            user_id=current_user.id,
            status_code=403,
            detail=f"job_id={job.id}"
        )

    db.commit()
    return {"violations": job.violations, "isLocked": job.status == "SESSION_LOCKED"}

@router.post("/execute/{job_id}", response_model=PrintJobResponse)
def execute_print(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    validate_uuid_format(job_id)
    client_ip = get_client_ip(request)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    session = get_shop_session(db, job, current_user.id)
    if job.status not in ["SECURE_SESSION", "WAITING"]:
        raise HTTPException(status_code=409, detail="Document is not in an active secure session")

    # 1. Match registered printer for shop
    printers = db.query(ShopPrinter).filter(ShopPrinter.shop_user_id == current_user.id).all()
    
    # 2. Spool all documents in batch
    docs = job.documents or []
    for doc in docs:
        selected_printer = None
        if doc.color_mode.lower() == "color":
            selected_printer = next((p for p in printers if p.printer_color_capable), None)
        if not selected_printer and printers:
            selected_printer = printers[0]

        try:
            file_bytes = read_decrypted_file(doc.file_path)
            stream_to_hardware_printer(selected_printer, file_bytes, job)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to spool document '{doc.file_name}': {str(e)}")

    # 3. Immediate Cryptographic Memory Shredding of all files in job
    delete_job_file(job)

    # 4. Mark as DESTROYED & Completed
    job.status = "DESTROYED"
    job.completed_at = datetime.utcnow()
    job.destroyed_at = datetime.utcnow()
    
    session = db.query(PrintSession).filter(
        PrintSession.job_id == job.id,
        PrintSession.shop_user_id == current_user.id,
        PrintSession.ended_at.is_(None),
    ).order_by(PrintSession.started_at.desc()).first()
    if session:
        session.ended_at = datetime.utcnow()

    log_audit_event(
        "HARDWARE_PRINT_EXECUTED",
        f"Print job {job.id} ({len(docs)} documents) streamed to hardware printers and memory shredded",
        ip_address=client_ip,
        user_id=current_user.id,
        status_code=200,
        detail=f"job_id={job.id}, doc_count={len(docs)}"
    )

    db.commit()
    db.refresh(job)
    return to_job_response(job)

@router.post("/destroy/{job_id}", response_model=PrintJobResponse)
def destroy_document(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    validate_uuid_format(job_id)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    session = db.query(PrintSession).filter(
        PrintSession.job_id == job.id,
        PrintSession.shop_user_id == current_user.id,
        PrintSession.ended_at.is_(None),
    ).order_by(PrintSession.started_at.desc()).first()
    if session:
        session.ended_at = datetime.utcnow()

    delete_job_file(job)
    job.status = "DESTROYED"
    job.destroyed_at = datetime.utcnow()

    db.commit()
    return to_job_response(job)

@router.get("/queue", response_model=List[PrintJobResponse])
def get_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    jobs = db.query(PrintJob).filter(
        PrintJob.status.in_(["PRINT_ID_GENERATED", "WAITING", "SECURE_SESSION", "PRINTING"])
    ).order_by(PrintJob.created_at.asc()).all()

    return [to_job_response(job) for job in jobs]

@router.get("/history", response_model=List[PrintJobResponse])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    jobs = db.query(PrintJob).filter(
        PrintJob.status.in_(["COMPLETED", "ACCESS_REVOKED", "DESTROYED", "EXPIRED", "FAILED", "SESSION_LOCKED"])
    ).order_by(PrintJob.created_at.desc()).all()

    return [to_job_response(job) for job in jobs]

@router.get("/stream/{job_id}")
def stream_document(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_uuid_format(job_id)
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # IDOR Check: Either document customer owner OR shop operator with active session
    if current_user.role == "customer":
        if job.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Job not found")
    elif current_user.role == "shop":
        if job.status not in ["SECURE_SESSION", "PRINTING", "COMPLETED"]:
            raise HTTPException(status_code=403, detail="Document access restricted to active secure print sessions")
        get_shop_session(db, job, current_user.id)
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    if not job.file_path:
        raise HTTPException(status_code=404, detail="Document file has already been purged")

    try:
        file_bytes = read_decrypted_file(job.file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt document stream")

    media_type = "application/pdf" if job.file_type == "pdf" else f"image/{job.file_type}"
    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f"inline; filename={job.file_name}",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        }
    )
