from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ShopPrinter
from app.schemas import ShopPublicInfoResponse

router = APIRouter(prefix="/api/shops/public", tags=["Public Shop Discovery"])

@router.get("/{public_id}", response_model=ShopPublicInfoResponse)
def get_shop_public_info(public_id: str, db: Session = Depends(get_db)):
    clean_id = public_id.strip().upper()
    
    # Search by shop_public_id or internal ID
    shop = db.query(User).filter(
        (User.shop_public_id == clean_id) | (User.id == public_id),
        User.role == "shop"
    ).first()

    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print shop with identifier '{public_id}' not found"
        )

    # Check hardware capabilities
    printers = db.query(ShopPrinter).filter(ShopPrinter.shop_user_id == shop.id).all()
    
    is_color = any(p.printer_color_capable for p in printers)
    # Online if any printer is online or if shop has printers registered
    is_online = any(p.printer_status == "online" for p in printers) or (len(printers) > 0)
    
    # Default fallback if virtual mode
    if len(printers) == 0:
        is_online = True
        is_color = True

    return ShopPublicInfoResponse(
        id=shop.id,
        shopName=shop.name,
        shopPublicId=shop.shop_public_id or f"SX-SHOP-{shop.id[:4].upper()}",
        shopQrPayload=shop.shop_qr_payload or f"https://securexerox-fhqr.vercel.app/customer/upload?shop={shop.shop_public_id}",
        isOnline=is_online,
        isColorCapable=is_color,
        printerCount=len(printers),
        supportedPaperSizes=["A4", "A3", "Letter", "Legal"],
    )

@router.get("", response_model=List[ShopPublicInfoResponse])
def list_public_shops(db: Session = Depends(get_db)):
    shops = db.query(User).filter(User.role == "shop").all()
    results = []
    for shop in shops:
        printers = db.query(ShopPrinter).filter(ShopPrinter.shop_user_id == shop.id).all()
        is_color = any(p.printer_color_capable for p in printers)
        is_online = any(p.printer_status == "online" for p in printers) or (len(printers) > 0)
        if len(printers) == 0:
            is_online = True
            is_color = True

        results.append(
            ShopPublicInfoResponse(
                id=shop.id,
                shopName=shop.name,
                shopPublicId=shop.shop_public_id or f"SX-SHOP-{shop.id[:4].upper()}",
                shopQrPayload=shop.shop_qr_payload or f"https://securexerox-fhqr.vercel.app/customer/upload?shop={shop.shop_public_id}",
                isOnline=is_online,
                isColorCapable=is_color,
                printerCount=len(printers),
                supportedPaperSizes=["A4", "A3", "Letter", "Legal"],
            )
        )
    return results
