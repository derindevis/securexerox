import socket
import time
import urllib.parse
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ShopPrinter
from app.schemas import (
    ShopPrinterCreate,
    ShopPrinterUpdate,
    ShopPrinterResponse,
    PrinterTestResponse,
)
from app.dependencies import require_role
from app.logger import log_audit_event
from app.rate_limiter import get_client_ip

router = APIRouter(prefix="/api/printers", tags=["Shop Hardware Printers"])

def to_printer_response(p: ShopPrinter) -> ShopPrinterResponse:
    return ShopPrinterResponse(
        id=p.id,
        shopUserId=p.shop_user_id,
        printerName=p.printer_name,
        printerProtocol=p.printer_protocol,
        printerEndpoint=p.printer_endpoint,
        printerColorCapable=p.printer_color_capable,
        printerStatus=p.printer_status,
        printerLastTestedAt=p.printer_last_tested_at,
        createdAt=p.created_at,
    )

def ping_printer_endpoint(endpoint: str, protocol: str) -> tuple[bool, str, int]:
    """
    Attempts a lightweight TCP handshake on the specified printer endpoint (e.g. 192.168.1.150:9100 or 192.168.1.150:631).
    Returns (success, message, latency_ms).
    """
    cleaned = endpoint.strip()
    # Strip scheme if user included it
    if "://" in cleaned:
        cleaned = cleaned.split("://")[-1]
    # Remove path component if present
    host_port = cleaned.split("/")[0]

    if ":" in host_port:
        parts = host_port.split(":")
        host = parts[0]
        try:
            port = int(parts[1])
        except ValueError:
            port = 631 if protocol == "ipp" else 9100
    else:
        host = host_port
        port = 631 if protocol == "ipp" else 9100

    # Handle virtual/demo/loopback addresses for testing and demonstrations
    if host.lower() in {"virtual", "demo", "mock", "localhost", "127.0.0.1", "test"}:
        return True, f"Virtual hardware loopback ready on {host}:{port} ({protocol.upper()})", 8

    start_time = time.time()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2.5)  # Fast 2.5s probe timeout
        result = sock.connect_ex((host, port))
        latency = int((time.time() - start_time) * 1000)
        sock.close()

        if result == 0:
            return True, f"Hardware device online and reachable on {host}:{port}", latency
        else:
            return False, f"Connection refused by {host}:{port} (Device offline or busy)", latency
    except socket.gaierror:
        return False, f"Could not resolve host name '{host}'", 0
    except socket.timeout:
        return False, f"Connection timed out reaching {host}:{port}", 2500
    except Exception as e:
        return False, f"Network error: {str(e)}", 0

@router.get("", response_model=List[ShopPrinterResponse])
def get_printers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    printers = db.query(ShopPrinter).filter(ShopPrinter.shop_user_id == current_user.id).order_by(ShopPrinter.created_at.asc()).all()
    return [to_printer_response(p) for p in printers]

@router.post("", response_model=ShopPrinterResponse)
def create_printer(
    data: ShopPrinterCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    client_ip = get_client_ip(request)
    printer = ShopPrinter(
        shop_user_id=current_user.id,
        printer_name=data.printerName.strip(),
        printer_protocol=data.printerProtocol.lower().strip(),
        printer_endpoint=data.printerEndpoint.strip(),
        printer_color_capable=data.printerColorCapable,
        printer_status="untested",
    )
    db.add(printer)
    db.commit()
    db.refresh(printer)

    log_audit_event("PRINTER_REGISTERED", f"Printer registered: {printer.printer_name} ({printer.printer_endpoint})", ip_address=client_ip, user_id=current_user.id, status_code=200)
    return to_printer_response(printer)

@router.put("/{printer_id}", response_model=ShopPrinterResponse)
def update_printer(
    printer_id: str,
    data: ShopPrinterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    printer = db.query(ShopPrinter).filter(
        ShopPrinter.id == printer_id,
        ShopPrinter.shop_user_id == current_user.id,
    ).first()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    if data.printerName is not None:
        printer.printer_name = data.printerName.strip()
    if data.printerProtocol is not None:
        printer.printer_protocol = data.printerProtocol.lower().strip()
    if data.printerEndpoint is not None:
        printer.printer_endpoint = data.printerEndpoint.strip()
        printer.printer_status = "untested"
    if data.printerColorCapable is not None:
        printer.printer_color_capable = data.printerColorCapable

    db.commit()
    db.refresh(printer)
    return to_printer_response(printer)

@router.delete("/{printer_id}")
def delete_printer(
    printer_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    client_ip = get_client_ip(request)
    printer = db.query(ShopPrinter).filter(
        ShopPrinter.id == printer_id,
        ShopPrinter.shop_user_id == current_user.id,
    ).first()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    db.delete(printer)
    db.commit()
    log_audit_event("PRINTER_REMOVED", f"Printer removed: {printer.printer_name}", ip_address=client_ip, user_id=current_user.id, status_code=200)
    return {"message": "Printer removed successfully"}

@router.post("/{printer_id}/test", response_model=PrinterTestResponse)
def test_printer(
    printer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("shop")),
):
    printer = db.query(ShopPrinter).filter(
        ShopPrinter.id == printer_id,
        ShopPrinter.shop_user_id == current_user.id,
    ).first()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    success, message, latency = ping_printer_endpoint(printer.printer_endpoint, printer.printer_protocol)
    printer.printer_status = "online" if success else "offline"
    printer.printer_last_tested_at = datetime.utcnow()
    db.commit()

    return PrinterTestResponse(
        success=success,
        printerStatus=printer.printer_status,
        message=message,
        latencyMs=latency,
    )
