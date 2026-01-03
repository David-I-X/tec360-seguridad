"""
Endpoints de FastAPI para gestión de imágenes
Path: backend/app/api/images.py
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
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
    summary="Subir imagen de servicio",
    description="""
    Sube una imagen de evidencia para un servicio.
    
    **Validaciones:**
    - Solo imágenes (JPG, PNG, WEBP, HEIC)
    - Máximo 5MB por imagen
    - Máximo 20MB total por servicio
    - Solo cliente, técnico asignado o admin pueden subir
    
    **Tipos de imagen:**
    - `before`: Foto antes del servicio
    - `after`: Foto después del servicio
    - `during`: Foto durante el servicio
    - `other`: Otra foto
    
    **Roles permitidos:** client, technician, admin
    """
)
async def upload_image(
    file: UploadFile = File(..., description="Archivo de imagen"),
    service_id: str = Form(..., description="UUID del servicio"),
    image_type: ImageType = Form(..., description="Tipo de imagen"),
    description: str = Form(None, description="Descripción opcional"),
    current_user: dict = Depends(get_current_user)
):
    """
    Subir imagen de evidencia
    
    El archivo se guarda en Supabase Storage y se registra en la BD
    """
    metadata = ImageUploadMetadata(
        service_id=service_id,
        image_type=image_type,
        description=description
    )
    
    image = await image_service.upload_image(
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
    summary="Listar imágenes de un servicio",
    description="""
    Lista todas las imágenes asociadas a un servicio.
    
    **Permisos:**
    - Cliente: solo sus servicios
    - Técnico: solo servicios asignados
    - Admin: todos los servicios
    
    **Roles permitidos:** client, technician, admin
    """
)
async def list_service_images(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Listar imágenes de un servicio
    """
    return await image_service.list_service_images(
        service_id=service_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


@router.get(
    "/{image_id}",
    response_model=ImageResponse,
    summary="Obtener imagen por ID",
    description="""
    Obtiene los detalles de una imagen específica.
    
    Incluye:
    - URL pública de la imagen
    - Metadata (tipo, descripción, tamaño)
    - Información del usuario que la subió
    
    **Roles permitidos:** client, technician, admin
    """
)
async def get_image(
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener imagen por ID
    """
    return await image_service.get_image_by_id(
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
    summary="Eliminar imagen",
    description="""
    Elimina una imagen del storage y la base de datos.
    
    **Permisos:**
    - Solo el usuario que subió la imagen puede eliminarla
    - Admin puede eliminar cualquier imagen
    
    **Roles permitidos:** client, technician, admin
    """
)
async def delete_image(
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar imagen
    
    Elimina del storage y de la base de datos
    """
    result = await image_service.delete_image(
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
    summary="Estadísticas de almacenamiento",
    description="""
    Obtiene estadísticas de uso de almacenamiento.
    
    **Admin:** Estadísticas globales
    **Técnico/Cliente:** Solo de sus servicios
    
    Incluye:
    - Total de imágenes
    - Espacio usado en MB
    - Distribución por tipo de imagen
    
    **Roles permitidos:** client, technician, admin
    """
)
async def get_storage_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener estadísticas de almacenamiento
    """
    return await image_service.get_storage_stats(
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


# ============================================
# RESUMEN DE ENDPOINTS
# ============================================

"""
ENDPOINTS DISPONIBLES:

📤 SUBIDA:
  POST   /images/upload                      - Subir imagen

📋 CONSULTA:
  GET    /images/services/{service_id}       - Listar imágenes de servicio
  GET    /images/{image_id}                  - Obtener imagen por ID

🗑️ ELIMINACIÓN:
  DELETE /images/{image_id}                  - Eliminar imagen

📊 ESTADÍSTICAS:
  GET    /images/stats/storage               - Estadísticas de almacenamiento

TOTAL: 5 endpoints

NOTA: Todos requieren autenticación
"""
