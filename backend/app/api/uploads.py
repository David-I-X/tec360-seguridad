"""
File upload endpoints for avatars and service photos.
Path: backend/app/api/uploads.py

Uses storage_service for file persistence (local Oracle VM volume or OCI Object Storage).
"""
import io
import logging
import os
import uuid
from PIL import Image, ImageOps
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.extras import ServiceImage
from app.models.user import User
from app.models.service import Service
from app.services.storage_service import storage, get_content_type

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (phone cameras can exceed 5MB)
DEFAULT_MAX_DIMENSION = 1920
DEFAULT_JPEG_QUALITY = 82


def optimize_image(
    content: bytes,
    ext: str,
    max_dimension: int = DEFAULT_MAX_DIMENSION,
    quality: int = DEFAULT_JPEG_QUALITY,
) -> bytes:
    """
    Optimizes an uploaded image and returns the processed bytes:
    1. Normalizes EXIF rotation (so mobile photos aren't flipped sideways)
    2. Resizes if dimension > max_dimension while maintaining aspect ratio
    3. Converts RGBA to RGB if saving as JPEG
    4. Compresses with optimal quality (reducing 8MB to ~250-400KB)
    """
    try:
        with Image.open(io.BytesIO(content)) as img:
            img = ImageOps.exif_transpose(img)
            
            if max(img.size) > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            if ext in (".jpg", ".jpeg"):
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(buf, "JPEG", quality=quality, optimize=True)
            elif ext == ".webp":
                img.save(buf, "WEBP", quality=quality, method=4)
            elif ext == ".png":
                img.save(buf, "PNG", optimize=True)
            else:
                return content
            return buf.getvalue()
    except Exception as e:
        logger.warning(f"PIL image optimization failed, using raw bytes: {e}")
        return content


def _validate_image(file: UploadFile):
    """Validate file extension and size."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: {ALLOWED_EXTENSIONS}")
    return ext


@router.post("/avatar", summary="Upload profile photo")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Upload or update user's profile photo."""
    ext = _validate_image(file)
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    filename = f"{current_user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    optimized = optimize_image(content, ext, max_dimension=800, quality=85)
    
    avatar_url = await storage.upload(
        content=optimized,
        path=f"avatars/{filename}",
        content_type=get_content_type(ext),
    )
    
    # Update user's avatar_url
    user = session.get(User, current_user["id"])
    if user:
        user.avatar_url = avatar_url
        session.add(user)
        session.commit()
    
    return {"avatar_url": avatar_url, "message": "Foto de perfil actualizada"}


@router.post("/service-photo", summary="Upload service evidence photo")
async def upload_service_photo(
    file: UploadFile = File(...),
    service_id: str = Form(...),
    image_type: str = Form(...),  # before, during, after
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Upload evidence photo for a service.
    Technicians must upload: before (start), during (mid), after (end).
    """
    ext = _validate_image(file)
    
    # Validate image_type
    valid_types = ["before", "during", "after", "issue", "adjustment"]
    if image_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"image_type must be one of: {valid_types}")
    
    # Verify service exists
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    filename = f"{service_id}_{image_type}_{uuid.uuid4().hex[:8]}{ext}"
    optimized = optimize_image(content, ext, max_dimension=1920, quality=82)
    
    image_url = await storage.upload(
        content=optimized,
        path=f"service-photos/{filename}",
        content_type=get_content_type(ext),
    )
    
    # Create ServiceImage record
    service_image = ServiceImage(
        service_id=service_id,
        image_url=image_url,
        image_type=image_type,
        uploaded_by=current_user["id"],
    )
    session.add(service_image)
    session.commit()
    session.refresh(service_image)
    
    return {
        "id": str(service_image.id),
        "image_url": image_url,
        "image_type": image_type,
        "message": f"Foto '{image_type}' subida exitosamente"
    }


@router.get("/{service_id}/photos", summary="Get service evidence photos")
async def get_service_photos(
    service_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get all evidence photos for a service."""
    statement = select(ServiceImage).where(ServiceImage.service_id == service_id)
    images = session.exec(statement).all()
    
    return {
        "photos": [
            {
                "id": str(img.id),
                "image_url": img.image_url,
                "image_type": img.image_type,
                "created_at": img.created_at.isoformat() if img.created_at else None,
            }
            for img in images
        ]
    }


@router.post("/vehicle-photo", summary="Upload vehicle photo from client")
async def upload_vehicle_photo(
    file: UploadFile = File(...),
    service_id: str = Form(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Upload vehicle photo for a service.
    Clients can upload this when requesting a service.
    """
    ext = _validate_image(file)
    
    # Verify service exists and belongs to client
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    if str(service.client_id) != str(current_user["id"]) and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    filename = f"{service_id}_vehicle_{uuid.uuid4().hex[:8]}{ext}"
    optimized = optimize_image(content, ext, max_dimension=1920, quality=82)
    
    image_url = await storage.upload(
        content=optimized,
        path=f"vehicle-photos/{filename}",
        content_type=get_content_type(ext),
    )
    
    # Update Service record
    service.vehicle_photo_url = image_url
    session.add(service)
    session.commit()
    
    return {
        "image_url": image_url,
        "message": "Foto del vehículo subida exitosamente"
    }


@router.post("/portfolio-photo", summary="Upload portfolio image")
async def upload_portfolio_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload an image for the technician's portfolio.
    Returns the URL to be used in POST /technicians/me/portfolio
    """
    ext = _validate_image(file)
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
    filename = f"{current_user['id']}_portfolio_{uuid.uuid4().hex[:8]}{ext}"
    optimized = optimize_image(content, ext, max_dimension=1920, quality=82)
    
    url = await storage.upload(
        content=optimized,
        path=f"portfolio-photos/{filename}",
        content_type=get_content_type(ext),
    )
    
    return {
        "url": url,
        "message": "Imagen de portafolio subida correctamente"
    }
