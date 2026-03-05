"""
File upload endpoints for avatars and service photos.
Path: backend/app/api/uploads.py
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.extras import ServiceImage
from app.models.user import User
from app.models.service import Service

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = "/opt/tec360-seguridad/uploads"
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
SERVICE_PHOTO_DIR = os.path.join(UPLOAD_DIR, "service-photos")

def ensure_upload_dirs():
    """Create upload directories. Call on app startup after volumes are mounted."""
    for d in [AVATAR_DIR, SERVICE_PHOTO_DIR]:
        os.makedirs(d, exist_ok=True)

# Also call at import time as fallback (works in dev without Docker volumes)
try:
    ensure_upload_dirs()
except Exception:
    pass  # will retry on startup

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (phone cameras can exceed 5MB)


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
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    filename = f"{current_user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    avatar_url = f"/uploads/avatars/{filename}"
    
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
    valid_types = ["before", "during", "after", "issue"]
    if image_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"image_type must be one of: {valid_types}")
    
    # Verify service exists
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    filename = f"{service_id}_{image_type}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(SERVICE_PHOTO_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    image_url = f"/uploads/service-photos/{filename}"
    
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


@router.get("/service-photos/{service_id}", summary="Get service evidence photos")
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
