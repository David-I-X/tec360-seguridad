"""
Service Layer para gestión de imágenes con almacenamiento centralizado (storage_service).
Path: backend/app/services/image_service.py
Unifica /api/images/upload con /api/uploads/ para servir todo desde /uploads/ en Nginx.
"""
from datetime import datetime
import logging
import os
import uuid
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlmodel import Session, select

from app.models.extras import ServiceImage
from app.models.service import Service
from app.models.user import User
from app.schemas.image import (
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    ImageListItem,
    ImageListResponse,
    ImageResponse,
    ImageUploadMetadata,
    ImageValidation,
    StorageStats,
)
from app.services.storage_service import storage

logger = logging.getLogger(__name__)


class ImageService:
    """
    Servicio para gestión de imágenes de servicios sincronizado con `storage_service` (/uploads/service-photos/).
    """

    def __init__(self):
        self.base_upload_dir = getattr(storage, "BASE_DIR", os.path.join(os.getcwd(), "uploads"))

    def _validate_image_file(self, file: UploadFile) -> ImageValidation:
        if file.content_type not in ALLOWED_MIME_TYPES:
            return ImageValidation(
                is_valid=False,
                error_message=f"Tipo de archivo no permitido: {file.content_type}",
                mime_type=file.content_type,
            )

        file_ext = os.path.splitext(file.filename or "")[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            return ImageValidation(
                is_valid=False,
                error_message=f"Extensión no permitida: {file_ext}",
                mime_type=file.content_type,
            )

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        file_size_mb = file_size / (1024 * 1024)
        if file_size > MAX_FILE_SIZE:
            return ImageValidation(
                is_valid=False,
                error_message=f"Archivo muy grande ({file_size_mb:.2f}MB). Max 5MB",
                file_size_mb=file_size_mb,
                mime_type=file.content_type,
            )

        return ImageValidation(
            is_valid=True,
            error_message=None,
            file_size_mb=file_size_mb,
            mime_type=file.content_type,
        )

    async def upload_image(
        self,
        session: Session,
        file: UploadFile,
        metadata: ImageUploadMetadata,
        user_id: str,
        user_role: str,
    ) -> ImageResponse:
        try:
            svc_uuid = UUID(str(metadata.service_id))
            u_uuid = UUID(str(user_id))
            service = session.get(Service, svc_uuid)
            if not service:
                raise HTTPException(404, "Servicio no encontrado")

            if user_role not in ["admin"]:
                if user_role == "client" and str(service.client_id) != str(user_id):
                    raise HTTPException(403, "No autorizado")
                elif user_role == "technician" and str(service.technician_id) != str(user_id):
                    raise HTTPException(403, "No autorizado")

            val = self._validate_image_file(file)
            if not val.is_valid:
                raise HTTPException(400, val.error_message)

            content = await file.read()
            timestamp = int(datetime.now().timestamp())
            file_ext = os.path.splitext(file.filename or ".jpg")[1].lower() or ".jpg"
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{metadata.service_id}_{metadata.image_type}_{timestamp}_{unique_id}{file_ext}"

            relative_url = await storage.upload(
                content=content,
                path=f"service-photos/{filename}",
                content_type=file.content_type or "image/jpeg",
            )

            new_image = ServiceImage(
                service_id=svc_uuid,
                uploaded_by=u_uuid,
                image_type=metadata.image_type,
                image_url=relative_url,
            )
            session.add(new_image)
            session.commit()
            session.refresh(new_image)

            user = session.get(User, u_uuid)

            return ImageResponse(
                id=str(new_image.id),
                service_id=str(new_image.service_id),
                uploaded_by=str(new_image.uploaded_by),
                image_type=new_image.image_type,
                description=None,
                file_path=relative_url,
                file_size=len(content),
                mime_type=file.content_type,
                public_url=relative_url,
                created_at=new_image.created_at,
                uploader_name=user.full_name if user else None,
            )

        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            logger.error(f"Upload error: {e}")
            raise HTTPException(500, f"Error uploading: {str(e)}")

    async def list_service_images(
        self,
        session: Session,
        service_id: str,
        user_id: str,
        user_role: str,
    ) -> ImageListResponse:
        try:
            svc_uuid = UUID(str(service_id))
            service = session.get(Service, svc_uuid)
            if not service:
                raise HTTPException(404, "Not found")

            if user_role != "admin":
                if user_role == "client" and str(service.client_id) != str(user_id):
                    raise HTTPException(403, "Forbidden")
                if user_role == "technician" and str(service.technician_id) != str(user_id):
                    raise HTTPException(403, "Forbidden")

            images = session.exec(
                select(ServiceImage)
                .where(ServiceImage.service_id == svc_uuid)
                .order_by(ServiceImage.created_at.desc())
            ).all()

            uploader_ids = {img.uploaded_by for img in images if img.uploaded_by}
            user_map = {
                u.id: u
                for u in (
                    session.exec(select(User).where(User.id.in_(uploader_ids))).all()
                    if uploader_ids
                    else []
                )
            }

            list_items = []
            for img in images:
                user = user_map.get(img.uploaded_by)
                list_items.append(
                    ImageListItem(
                        id=str(img.id),
                        image_type=img.image_type,
                        description=None,
                        public_url=img.image_url,
                        file_size=0,
                        created_at=img.created_at,
                        uploader_name=user.full_name if user else None,
                    )
                )

            return ImageListResponse(images=list_items, total=len(list_items), service_id=service_id)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, str(e))

    async def get_image_by_id(
        self,
        session: Session,
        image_id: str,
        user_id: str,
        user_role: str,
    ) -> ImageResponse:
        try:
            img = session.get(ServiceImage, UUID(str(image_id)))
            if not img:
                raise HTTPException(404, "Image not found")

            service = session.get(Service, img.service_id)
            if user_role != "admin" and service:
                if user_role == "client" and str(service.client_id) != str(user_id):
                    raise HTTPException(403, "Forbidden")
                if user_role == "technician" and str(service.technician_id) != str(user_id):
                    raise HTTPException(403, "Forbidden")

            user = session.get(User, img.uploaded_by) if img.uploaded_by else None
            return ImageResponse(
                id=str(img.id),
                service_id=str(img.service_id),
                uploaded_by=str(img.uploaded_by),
                image_type=img.image_type,
                description=None,
                file_path=img.image_url,
                file_size=0,
                mime_type=None,
                public_url=img.image_url,
                created_at=img.created_at,
                uploader_name=user.full_name if user else None,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, str(e))

    async def delete_image(
        self,
        session: Session,
        image_id: str,
        user_id: str,
        user_role: str,
    ) -> dict:
        try:
            img = session.get(ServiceImage, UUID(str(image_id)))
            if not img:
                raise HTTPException(404, "Image not found")

            if user_role != "admin" and str(img.uploaded_by) != str(user_id):
                raise HTTPException(403, "Permission denied")

            try:
                await storage.delete(img.image_url)
            except Exception as e:
                logger.warning(f"Failed to delete file {img.image_url}: {e}")

            session.delete(img)
            session.commit()

            return {"success": True, "message": "Deleted", "image_id": image_id}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, str(e))

    async def get_storage_stats(
        self,
        session: Session,
        user_id: str,
        user_role: str,
    ) -> StorageStats:
        return StorageStats(total_images=0, total_size_mb=0.0, images_by_type={})


image_service = ImageService()
