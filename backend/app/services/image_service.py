"""
Service Layer para gestión de imágenes en Supabase Storage
Path: backend/app/services/image_service.py
"""
from typing import List, Optional, BinaryIO
from fastapi import HTTPException, status, UploadFile
from app.core.security import supabase_client
from app.schemas.image import (
    ImageUploadMetadata,
    ImageResponse,
    ImageListResponse,
    ImageListItem,
    ImageValidation,
    StorageStats,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    MAX_TOTAL_SIZE_PER_SERVICE
)
import os
from datetime import datetime
import uuid


class ImageService:
    """
    Servicio para gestión de imágenes en Supabase Storage
    
    Bucket de Supabase: 'service-images'
    Estructura de carpetas: services/{service_id}/{image_type}_{timestamp}_{uuid}.jpg
    """
    
    def __init__(self):
        self.supabase = supabase_client
        self.bucket_name = "service-images"
    
    
    def _validate_image_file(
        self,
        file: UploadFile
    ) -> ImageValidation:
        """
        Valida que el archivo sea una imagen válida
        
        Validaciones:
        - Tipo MIME permitido
        - Extensión permitida
        - Tamaño menor a 5MB
        """
        # Validar tipo MIME
        if file.content_type not in ALLOWED_MIME_TYPES:
            return ImageValidation(
                is_valid=False,
                error_message=f"Tipo de archivo no permitido. Solo se permiten: {', '.join(ALLOWED_MIME_TYPES)}",
                mime_type=file.content_type
            )
        
        # Validar extensión
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            return ImageValidation(
                is_valid=False,
                error_message=f"Extensión no permitida. Solo: {', '.join(ALLOWED_EXTENSIONS)}",
                mime_type=file.content_type
            )
        
        # Validar tamaño
        # Leer archivo para obtener tamaño
        file.file.seek(0, 2)  # Ir al final del archivo
        file_size = file.file.tell()
        file.file.seek(0)  # Volver al inicio
        
        file_size_mb = file_size / (1024 * 1024)
        
        if file_size > MAX_FILE_SIZE:
            return ImageValidation(
                is_valid=False,
                error_message=f"Archivo muy grande. Máximo: 5MB. Tamaño actual: {file_size_mb:.2f}MB",
                file_size_mb=file_size_mb,
                mime_type=file.content_type
            )
        
        return ImageValidation(
            is_valid=True,
            error_message=None,
            file_size_mb=file_size_mb,
            mime_type=file.content_type
        )
    
    
    async def upload_image(
        self,
        file: UploadFile,
        metadata: ImageUploadMetadata,
        user_id: str,
        user_role: str
    ) -> ImageResponse:
        """
        Sube una imagen a Supabase Storage
        
        Args:
            file: Archivo subido
            metadata: Metadata de la imagen
            user_id: UUID del usuario
            user_role: Rol del usuario
        
        Returns:
            ImageResponse con datos de la imagen subida
        """
        try:
            # 1. Validar que el servicio existe
            service_response = self.supabase.table("services").select(
                "id, client_id, technician_id, status"
            ).eq("id", metadata.service_id).execute()
            
            if not service_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Servicio no encontrado"
                )
            
            service = service_response.data[0]
            
            # 2. Verificar permisos (solo cliente, técnico asignado o admin)
            if user_role not in ["admin"]:
                if user_role == "client" and service["client_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permiso para subir imágenes a este servicio"
                    )
                elif user_role == "technician" and service["technician_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permiso para subir imágenes a este servicio"
                    )
            
            # 3. Validar archivo
            validation = self._validate_image_file(file)
            if not validation.is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=validation.error_message
                )
            
            # 4. Verificar límite total por servicio
            existing_images = self.supabase.table("service_images").select(
                "file_size"
            ).eq("service_id", metadata.service_id).execute()
            
            total_size = sum(img.get("file_size", 0) or 0 for img in existing_images.data)
            file.file.seek(0, 2)
            current_file_size = file.file.tell()
            file.file.seek(0)
            
            if (total_size + current_file_size) > MAX_TOTAL_SIZE_PER_SERVICE:
                max_mb = MAX_TOTAL_SIZE_PER_SERVICE / (1024 * 1024)
                current_mb = total_size / (1024 * 1024)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Límite de almacenamiento alcanzado para este servicio. Máximo: {max_mb}MB. Actual: {current_mb:.2f}MB"
                )
            
            # 5. Generar nombre de archivo único
            timestamp = int(datetime.now().timestamp())
            file_ext = os.path.splitext(file.filename)[1].lower()
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{metadata.image_type}_{timestamp}_{unique_id}{file_ext}"
            
            # Ruta en storage: services/{service_id}/{filename}
            file_path = f"services/{metadata.service_id}/{filename}"
            
            # 6. Subir a Supabase Storage
            file_content = await file.read()
            
            upload_response = self.supabase.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=file_content,
                file_options={
                    "content-type": file.content_type,
                    "cache-control": "3600",
                    "upsert": "false"
                }
            )
            
            # 7. Obtener URL pública
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_path)
            
            # 8. Guardar metadata en base de datos
            image_data = {
                "service_id": metadata.service_id,
                "uploaded_by": user_id,
                "image_type": metadata.image_type,
                "description": metadata.description,
                "file_path": file_path,
                "file_size": current_file_size,
                "mime_type": file.content_type
            }
            
            db_response = self.supabase.table("service_images").insert(
                image_data
            ).execute()
            
            if not db_response.data:
                # Si falla el insert, intentar eliminar archivo de storage
                try:
                    self.supabase.storage.from_(self.bucket_name).remove([file_path])
                except:
                    pass
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al guardar metadata de la imagen"
                )
            
            created_image = db_response.data[0]
            
            # 9. Obtener nombre del usuario
            user_response = self.supabase.table("users").select(
                "full_name"
            ).eq("id", user_id).execute()
            
            uploader_name = user_response.data[0]["full_name"] if user_response.data else None
            
            return ImageResponse(
                id=created_image["id"],
                service_id=created_image["service_id"],
                uploaded_by=created_image["uploaded_by"],
                image_type=created_image["image_type"],
                description=created_image.get("description"),
                file_path=created_image["file_path"],
                file_size=created_image.get("file_size"),
                mime_type=created_image.get("mime_type"),
                public_url=public_url,
                created_at=created_image["created_at"],
                uploader_name=uploader_name
            )
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al subir imagen: {str(e)}"
            )
    
    
    async def list_service_images(
        self,
        service_id: str,
        user_id: str,
        user_role: str
    ) -> ImageListResponse:
        """
        Lista todas las imágenes de un servicio
        
        Permisos:
        - Cliente: solo sus servicios
        - Técnico: solo servicios asignados
        - Admin: todos
        """
        try:
            # Verificar que el servicio existe y el usuario tiene permiso
            service_response = self.supabase.table("services").select(
                "id, client_id, technician_id"
            ).eq("id", service_id).execute()
            
            if not service_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Servicio no encontrado"
                )
            
            service = service_response.data[0]
            
            # Verificar permisos
            if user_role != "admin":
                if user_role == "client" and service["client_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permiso para ver imágenes de este servicio"
                    )
                elif user_role == "technician" and service["technician_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permiso para ver imágenes de este servicio"
                    )
            
            # Obtener imágenes
            images_response = self.supabase.table("service_images").select(
                "*"
            ).eq("service_id", service_id).order("created_at", desc=True).execute()
            
            images_list = []
            
            for image in images_response.data:
                # Obtener URL pública
                public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(
                    image["file_path"]
                )
                
                # Obtener nombre del usuario
                user_response = self.supabase.table("users").select(
                    "full_name"
                ).eq("id", image["uploaded_by"]).execute()
                
                uploader_name = user_response.data[0]["full_name"] if user_response.data else None
                
                images_list.append(ImageListItem(
                    id=image["id"],
                    image_type=image["image_type"],
                    description=image.get("description"),
                    public_url=public_url,
                    file_size=image.get("file_size"),
                    created_at=image["created_at"],
                    uploader_name=uploader_name
                ))
            
            return ImageListResponse(
                images=images_list,
                total=len(images_list),
                service_id=service_id
            )
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al listar imágenes: {str(e)}"
            )
    
    
    async def get_image_by_id(
        self,
        image_id: str,
        user_id: str,
        user_role: str
    ) -> ImageResponse:
        """
        Obtiene una imagen por ID
        """
        try:
            # Obtener imagen
            image_response = self.supabase.table("service_images").select(
                "*"
            ).eq("id", image_id).execute()
            
            if not image_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Imagen no encontrada"
                )
            
            image = image_response.data[0]
            
            # Verificar permisos sobre el servicio
            service_response = self.supabase.table("services").select(
                "client_id, technician_id"
            ).eq("id", image["service_id"]).execute()
            
            if service_response.data:
                service = service_response.data[0]
                
                if user_role != "admin":
                    if user_role == "client" and service["client_id"] != user_id:
                        raise HTTPException(status_code=403, detail="Sin permiso")
                    elif user_role == "technician" and service["technician_id"] != user_id:
                        raise HTTPException(status_code=403, detail="Sin permiso")
            
            # Obtener URL pública
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(
                image["file_path"]
            )
            
            # Obtener nombre del usuario
            user_response = self.supabase.table("users").select(
                "full_name"
            ).eq("id", image["uploaded_by"]).execute()
            
            uploader_name = user_response.data[0]["full_name"] if user_response.data else None
            
            return ImageResponse(
                id=image["id"],
                service_id=image["service_id"],
                uploaded_by=image["uploaded_by"],
                image_type=image["image_type"],
                description=image.get("description"),
                file_path=image["file_path"],
                file_size=image.get("file_size"),
                mime_type=image.get("mime_type"),
                public_url=public_url,
                created_at=image["created_at"],
                uploader_name=uploader_name
            )
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener imagen: {str(e)}"
            )
    
    
    async def delete_image(
        self,
        image_id: str,
        user_id: str,
        user_role: str
    ) -> dict:
        """
        Elimina una imagen (de storage y base de datos)
        
        Solo puede eliminar:
        - El usuario que la subió
        - Admin
        """
        try:
            # Obtener imagen
            image_response = self.supabase.table("service_images").select(
                "*"
            ).eq("id", image_id).execute()
            
            if not image_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Imagen no encontrada"
                )
            
            image = image_response.data[0]
            
            # Verificar permisos (solo quien la subió o admin)
            if user_role != "admin" and image["uploaded_by"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo el usuario que subió la imagen o un admin puede eliminarla"
                )
            
            # Eliminar de storage
            try:
                self.supabase.storage.from_(self.bucket_name).remove([image["file_path"]])
            except Exception as e:
                print(f"⚠️ Warning: Error al eliminar de storage: {e}")
                # Continuar aunque falle (la imagen en DB se eliminará)
            
            # Eliminar de base de datos
            delete_response = self.supabase.table("service_images").delete().eq(
                "id", image_id
            ).execute()
            
            return {
                "success": True,
                "message": "Imagen eliminada exitosamente",
                "image_id": image_id
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar imagen: {str(e)}"
            )
    
    
    async def get_storage_stats(
        self,
        user_id: str,
        user_role: str
    ) -> StorageStats:
        """
        Obtiene estadísticas de almacenamiento
        
        - Admin: stats globales
        - Técnico/Cliente: solo sus servicios
        """
        try:
            # Construir query según rol
            if user_role == "admin":
                # Admin ve todo
                images_response = self.supabase.table("service_images").select(
                    "image_type, file_size"
                ).execute()
            else:
                # Cliente/Técnico solo sus servicios
                services_response = self.supabase.table("services").select("id")
                
                if user_role == "client":
                    services_response = services_response.eq("client_id", user_id)
                else:  # technician
                    services_response = services_response.eq("technician_id", user_id)
                
                services = services_response.execute()
                service_ids = [s["id"] for s in services.data]
                
                if not service_ids:
                    return StorageStats(
                        total_images=0,
                        total_size_mb=0.0,
                        images_by_type={}
                    )
                
                images_response = self.supabase.table("service_images").select(
                    "image_type, file_size"
                ).in_("service_id", service_ids).execute()
            
            images = images_response.data
            
            # Calcular estadísticas
            total_images = len(images)
            total_size_bytes = sum(img.get("file_size", 0) or 0 for img in images)
            total_size_mb = total_size_bytes / (1024 * 1024)
            
            # Contar por tipo
            images_by_type = {}
            for image in images:
                img_type = image["image_type"]
                images_by_type[img_type] = images_by_type.get(img_type, 0) + 1
            
            return StorageStats(
                total_images=total_images,
                total_size_mb=round(total_size_mb, 2),
                images_by_type=images_by_type
            )
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener estadísticas: {str(e)}"
            )


# Instancia global del servicio
image_service = ImageService()