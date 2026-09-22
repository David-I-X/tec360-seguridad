"""
Centralized storage service for file uploads.
Supports two backends:
  - "local": saves to /opt/tec360-seguridad/uploads/ (Oracle Cloud persistent volume / dev)
  - "oci" / "s3": uploads to Oracle Cloud Infrastructure (OCI) Object Storage (S3-compatible, production)

Usage:
    from app.services.storage_service import storage, validate_image, generate_filename

    url = await storage.upload(
        file_bytes=content,
        folder="documents",
        filename="cedula_front_abc123.jpg",
        content_type="image/jpeg",
    )
"""
import logging
import os
import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_image(file: UploadFile) -> str:
    """Validate file extension. Returns the extension."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {ext} not allowed. Use: {ALLOWED_EXTENSIONS}")
    return ext


def generate_filename(prefix: str, ext: str) -> str:
    """Generate a unique filename like 'prefix_a1b2c3d4.jpg'."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"


def get_content_type(ext: str) -> str:
    """Map file extension to MIME type."""
    types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    return types.get(ext.lower(), "application/octet-stream")


class StorageBackend:
    """Abstract interface that storage backends implement."""

    async def upload(
        self,
        file_bytes: Optional[bytes] = None,
        folder: Optional[str] = None,
        filename: Optional[str] = None,
        content_type: str = "image/jpeg",
        content: Optional[bytes] = None,
        path: Optional[str] = None,
    ) -> str:
        raise NotImplementedError

    async def delete(self, url: str) -> bool:
        raise NotImplementedError


class LocalStorageBackend(StorageBackend):
    """
    Stores files on local filesystem (Docker persistent volume on Oracle Cloud VM).
    Served directly by Nginx under /uploads/.
    """

    BASE_DIR = "/opt/tec360-seguridad/uploads"

    def __init__(self):
        # On Windows dev machines, use a relative path if needed
        if os.name == "nt":
            self.BASE_DIR = os.path.join(os.getcwd(), "uploads")
        os.makedirs(self.BASE_DIR, exist_ok=True)

    async def upload(
        self,
        file_bytes: Optional[bytes] = None,
        folder: Optional[str] = None,
        filename: Optional[str] = None,
        content_type: str = "image/jpeg",
        content: Optional[bytes] = None,
        path: Optional[str] = None,
    ) -> str:
        data = file_bytes if file_bytes is not None else content
        if data is None:
            raise ValueError("No file content provided to upload")

        if path:
            rel_path = path
        elif folder and filename:
            rel_path = f"{folder}/{filename}"
        elif filename:
            rel_path = filename
        else:
            rel_path = f"misc_{uuid.uuid4().hex[:8]}.bin"

        full_path = os.path.join(self.BASE_DIR, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, "wb") as f:
            f.write(data)

        url = f"/uploads/{rel_path}"
        logger.info(f"Saved file locally: {url}")
        return url

    async def delete(self, url: str) -> bool:
        relative = url.lstrip("/").replace("uploads/", "", 1)
        filepath = os.path.join(self.BASE_DIR, relative)
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Deleted local file: {filepath}")
            return True
        return False


class OCIObjectStorageBackend(StorageBackend):
    """
    Stores files on Oracle Cloud Infrastructure (OCI) Object Storage
    using its S3-compatible API.
    """

    def __init__(self):
        import boto3
        from botocore.config import Config as BotoConfig

        self.bucket = settings.OCI_STORAGE_BUCKET
        self.region = settings.OCI_STORAGE_REGION
        self.endpoint = settings.OCI_STORAGE_ENDPOINT
        self.public_url = settings.OCI_STORAGE_PUBLIC_URL

        client_kwargs = {
            "service_name": "s3",
            "region_name": self.region,
            "aws_access_key_id": settings.OCI_STORAGE_KEY,
            "aws_secret_access_key": settings.OCI_STORAGE_SECRET,
            "config": BotoConfig(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "adaptive"},
            ),
        }
        if self.endpoint:
            client_kwargs["endpoint_url"] = self.endpoint

        self.client = boto3.client(**client_kwargs)
        logger.info(
            f"OCI Object Storage initialized — bucket={self.bucket} endpoint={self.endpoint}"
        )

    async def upload(
        self,
        file_bytes: Optional[bytes] = None,
        folder: Optional[str] = None,
        filename: Optional[str] = None,
        content_type: str = "image/jpeg",
        content: Optional[bytes] = None,
        path: Optional[str] = None,
    ) -> str:
        data = file_bytes if file_bytes is not None else content
        if data is None:
            raise ValueError("No file content provided to upload")

        if path:
            key = path
        elif folder and filename:
            key = f"{folder}/{filename}"
        elif filename:
            key = filename
        else:
            key = f"misc_{uuid.uuid4().hex[:8]}.bin"

        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

        if self.public_url:
            url = f"{self.public_url.rstrip('/')}/{key}"
        elif self.endpoint:
            url = f"{self.endpoint.rstrip('/')}/{self.bucket}/{key}"
        else:
            url = f"https://{self.bucket}.compat.objectstorage.{self.region}.oraclecloud.com/{key}"

        logger.info(f"Uploaded to OCI Object Storage: {url}")
        return url

    async def delete(self, url: str) -> bool:
        try:
            if self.public_url and url.startswith(self.public_url):
                key = url.split(f"{self.public_url.rstrip('/')}/", 1)[1]
            elif self.endpoint and url.startswith(self.endpoint):
                key = url.split(f"{self.bucket}/", 1)[1]
            else:
                key = url.split("/")[-1]

            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Deleted from OCI Object Storage: {key}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete from OCI Object Storage: {e}")
            return False


# Compatibility aliases
LocalStorage = LocalStorageBackend
OCIObjectStorage = OCIObjectStorageBackend
SpacesStorageBackend = OCIObjectStorageBackend
SpacesStorage = OCIObjectStorageBackend
S3Storage = OCIObjectStorageBackend


def _create_backend() -> StorageBackend:
    """Factory: create the configured storage backend."""
    try:
        backend_type = settings.STORAGE_BACKEND.lower()
    except Exception:
        backend_type = os.getenv("STORAGE_BACKEND", "local").lower()

    if backend_type in ("oci", "s3", "spaces"):
        try:
            if not settings.OCI_STORAGE_KEY or not settings.OCI_STORAGE_SECRET:
                logger.warning(
                    f"STORAGE_BACKEND={backend_type} but OCI_STORAGE_KEY/SECRET not set. "
                    "Falling back to local storage (Docker volume on OCI VM)."
                )
                return LocalStorageBackend()
            return OCIObjectStorageBackend()
        except Exception as e:
            logger.error(f"Failed to initialize OCI Object Storage: {e} — falling back to local")
            return LocalStorageBackend()

    return LocalStorageBackend()


# Singleton instance
storage: StorageBackend = _create_backend()
