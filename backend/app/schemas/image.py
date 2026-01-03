"""
Schemas de Pydantic para gestión de imágenes
Path: backend/app/schemas/image.py
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============================================
# ENUMS
# ============================================

class ImageType(str, Enum):
    """Tipo de imagen"""
    BEFORE = "before"  # Foto antes del servicio
    AFTER = "after"    # Foto después del servicio
    DURING = "during"  # Foto durante el servicio
    OTHER = "other"    # Otra foto


# ============================================
# SCHEMAS DE REQUEST (INPUT)
# ============================================

class ImageUploadMetadata(BaseModel):
    """Metadata para subir imagen"""
    service_id: str = Field(..., description="UUID del servicio")
    image_type: ImageType = Field(..., description="Tipo de imagen")
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Descripción opcional de la imagen"
    )
    
    @validator('description')
    def validate_description(cls, v):
        """Validar que la descripción no sea solo espacios"""
        if v and not v.strip():
            raise ValueError("La descripción no puede estar vacía")
        return v.strip() if v else None
    
    class Config:
        json_schema_extra = {
            "example": {
                "service_id": "service-uuid-123",
                "image_type": "before",
                "description": "Estado inicial del vehículo antes de la instalación"
            }
        }


class ImageUpdate(BaseModel):
    """Schema para actualizar metadata de imagen"""
    description: Optional[str] = Field(None, max_length=500)
    image_type: Optional[ImageType] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "description": "Instalación de GPS completada",
                "image_type": "after"
            }
        }


# ============================================
# SCHEMAS DE RESPONSE (OUTPUT)
# ============================================

class ImageResponse(BaseModel):
    """Response completa de una imagen"""
    id: str = Field(..., description="UUID de la imagen")
    service_id: str = Field(..., description="UUID del servicio")
    uploaded_by: str = Field(..., description="UUID del usuario que subió")
    image_type: str = Field(..., description="Tipo de imagen")
    description: Optional[str] = Field(None, description="Descripción")
    file_path: str = Field(..., description="Ruta del archivo en storage")
    file_size: Optional[int] = Field(None, description="Tamaño en bytes")
    mime_type: Optional[str] = Field(None, description="Tipo MIME")
    public_url: str = Field(..., description="URL pública de la imagen")
    created_at: datetime = Field(..., description="Fecha de creación")
    
    # Info adicional del usuario (opcional)
    uploader_name: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "image-uuid-123",
                "service_id": "service-uuid-456",
                "uploaded_by": "tech-uuid-789",
                "image_type": "after",
                "description": "GPS instalado correctamente",
                "file_path": "services/service-uuid-456/after_1234567890.jpg",
                "file_size": 2048576,
                "mime_type": "image/jpeg",
                "public_url": "https://storage.supabase.co/...",
                "created_at": "2024-12-15T10:30:00Z",
                "uploader_name": "Carlos Rodríguez"
            }
        }


class ImageListItem(BaseModel):
    """Item simplificado para listados"""
    id: str
    image_type: str
    description: Optional[str]
    public_url: str
    file_size: Optional[int]
    created_at: datetime
    uploader_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ImageListResponse(BaseModel):
    """Response para listar imágenes de un servicio"""
    images: List[ImageListItem]
    total: int
    service_id: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "images": [
                    {
                        "id": "image-1",
                        "image_type": "before",
                        "description": "Estado inicial",
                        "public_url": "https://...",
                        "file_size": 2048576,
                        "created_at": "2024-12-15T10:00:00Z",
                        "uploader_name": "Carlos Rodríguez"
                    }
                ],
                "total": 1,
                "service_id": "service-uuid-456"
            }
        }


class ImageUploadResponse(BaseModel):
    """Response después de subir imagen"""
    success: bool
    message: str
    image: ImageResponse
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Imagen subida exitosamente",
                "image": {
                    "id": "image-uuid-123",
                    "service_id": "service-uuid-456",
                    "public_url": "https://storage.supabase.co/..."
                }
            }
        }


class ImageDeleteResponse(BaseModel):
    """Response después de eliminar imagen"""
    success: bool
    message: str
    image_id: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Imagen eliminada exitosamente",
                "image_id": "image-uuid-123"
            }
        }


# ============================================
# SCHEMAS DE VALIDACIÓN
# ============================================

class ImageValidation(BaseModel):
    """Validación de archivo de imagen"""
    is_valid: bool
    error_message: Optional[str] = None
    file_size_mb: Optional[float] = None
    mime_type: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_valid": True,
                "error_message": None,
                "file_size_mb": 1.95,
                "mime_type": "image/jpeg"
            }
        }


class StorageStats(BaseModel):
    """Estadísticas de almacenamiento"""
    total_images: int = Field(..., description="Total de imágenes")
    total_size_mb: float = Field(..., description="Tamaño total en MB")
    images_by_type: dict = Field(..., description="Imágenes por tipo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_images": 45,
                "total_size_mb": 89.5,
                "images_by_type": {
                    "before": 20,
                    "after": 20,
                    "during": 5
                }
            }
        }


# ============================================
# CONSTANTES
# ============================================

# Tipos MIME permitidos
ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",  # iPhone
    "image/heif"   # iPhone
]

# Extensiones permitidas
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]

# Tamaño máximo por archivo (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB en bytes

# Tamaño máximo total por servicio (20MB)
MAX_TOTAL_SIZE_PER_SERVICE = 20 * 1024 * 1024  # 20MB