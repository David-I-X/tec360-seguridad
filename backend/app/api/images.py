"""
Endpoints de FastAPI para gestión de imágenes
Path: backend/app/api/images.py
Refactorizado para usar SQLModel Session y Local Storage
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import get_current_user
from app.schemas.image import (
    ImageUploadMetadata,
    ImageResponse,
    ImageListResponse,
    ImageUploadResponse,
    ImageDeleteResponse,
    StorageStats,
    ImageType
)
from app.services.image_service import image_service


router = APIRouter(prefix="/images", tags=["images"])


# ============================================
# ENDPOINTS DE SUBIDA
# ============================================

@router.post(
    "/upload",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Subir imagen de servicio"
)
async def upload_image(
    file: UploadFile = File(..., description="Archivo de imagen"),
    service_id: str = Form(..., description="UUID del servicio"),
    image_type: ImageType = Form(..., description="Tipo de imagen"),
    description: str = Form(None, description="Descripción opcional"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Subir imagen de evidencia
    """
    metadata = ImageUploadMetadata(
        service_id=service_id,
        image_type=image_type,
        description=description
    )
    
    image = await image_service.upload_image(
        session=session,
        file=file,
        metadata=metadata,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )
    
    return ImageUploadResponse(
        success=True,
        message="Imagen subida exitosamente",
        image=image
    )


# ============================================
# ENDPOINTS DE CONSULTA
# ============================================

@router.get(
    "/services/{service_id}",
    response_model=ImageListResponse,
    summary="Listar imágenes de un servicio"
)
async def list_service_images(
    service_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Listar imágenes de un servicio
    """
    return await image_service.list_service_images(
        session=session,
        service_id=service_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


@router.get(
    "/{image_id}",
    response_model=ImageResponse,
    summary="Obtener imagen por ID"
)
async def get_image(
    image_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Obtener imagen por ID
    """
    return await image_service.get_image_by_id(
        session=session,
        image_id=image_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


# ============================================
# ENDPOINTS DE ELIMINACIÓN
# ============================================

@router.delete(
    "/{image_id}",
    response_model=ImageDeleteResponse,
    summary="Eliminar imagen"
)
async def delete_image(
    image_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Eliminar imagen
    """
    result = await image_service.delete_image(
        session=session,
        image_id=image_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )
    
    return ImageDeleteResponse(
        success=result["success"],
        message=result["message"],
        image_id=result["image_id"]
    )


# ============================================
# ENDPOINTS DE ESTADÍSTICAS
# ============================================

@router.get(
    "/stats/storage",
    response_model=StorageStats,
    summary="Estadísticas de almacenamiento"
)
async def get_storage_stats(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Obtener estadísticas de almacenamiento
    """
    return await image_service.get_storage_stats(
        session=session,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )
