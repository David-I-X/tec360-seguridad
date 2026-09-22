"""
Storage Service — Abstracción para almacenamiento de archivos.
Soporta:
- local: Volumen Docker persistente en servidor OCI (Rose Diamond / /opt/tec360-seguridad/uploads).
- oci / s3: Oracle Cloud Infrastructure Object Storage (API compatible con S3 via boto3).

Se elige según settings.STORAGE_BACKEND ("local" | "oci" | "s3").
"""
import logging
import os

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageBackend:
    """Base class for storage backends."""

    def upload(self, content: bytes, path: str, content_type: str = "image/jpeg") -> str:
        """
        Upload content and return the public URL.
        Args:
            content: Raw file bytes
            path: Relative path like "avatars/abc123.jpg"
            content_type: MIME type
        Returns:
            Public URL string
        """
        raise NotImplementedError

    def delete(self, path: str) -> bool:
        """Delete a file by path. Returns True if successful."""
        raise NotImplementedError


class LocalStorage(StorageBackend):
    """
    Stores files on local filesystem (Docker persistent volume on Oracle Cloud VM).
    Served directly by Nginx under /uploads/.
    """

    BASE_DIR = "/opt/tec360-seguridad/uploads"

    def __init__(self):
        os.makedirs(self.BASE_DIR, exist_ok=True)

    def upload(self, content: bytes, path: str, content_type: str = "image/jpeg") -> str:
        full_path = os.path.join(self.BASE_DIR, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        # Return relative URL served by Nginx
        return f"/uploads/{path}"

    def delete(self, path: str) -> bool:
        full_path = os.path.join(self.BASE_DIR, path)
        try:
            os.remove(full_path)
            return True
        except FileNotFoundError:
            return False


class OCIObjectStorage(StorageBackend):
    """
    Stores files on Oracle Cloud Infrastructure (OCI) Object Storage
    using its S3-compatible API.
    """

    def __init__(self):
        import boto3
        self.bucket = settings.OCI_STORAGE_BUCKET
        self.region = settings.OCI_STORAGE_REGION
        self.endpoint = settings.OCI_STORAGE_ENDPOINT
        self.public_url = settings.OCI_STORAGE_PUBLIC_URL

        client_kwargs = {
            "service_name": "s3",
            "region_name": self.region,
            "aws_access_key_id": settings.OCI_STORAGE_KEY,
            "aws_secret_access_key": settings.OCI_STORAGE_SECRET,
        }
        if self.endpoint:
            client_kwargs["endpoint_url"] = self.endpoint

        self.client = boto3.client(**client_kwargs)
        logger.info(f"OCIObjectStorage initialized: bucket={self.bucket}, endpoint={self.endpoint}")

    def upload(self, content: bytes, path: str, content_type: str = "image/jpeg") -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=content,
            ContentType=content_type,
        )
        if self.public_url:
            url = f"{self.public_url.rstrip('/')}/{path}"
        elif self.endpoint:
            url = f"{self.endpoint.rstrip('/')}/{self.bucket}/{path}"
        else:
            url = f"https://{self.bucket}.compat.objectstorage.{self.region}.oraclecloud.com/{path}"

        logger.info(f"Uploaded to OCI Object Storage: {url}")
        return url

    def delete(self, path: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=path)
            return True
        except Exception as e:
            logger.error(f"Failed to delete from OCI Object Storage: {e}")
            return False


# Compatibility alias
SpacesStorage = OCIObjectStorage
S3Storage = OCIObjectStorage


def _create_backend() -> StorageBackend:
    """Factory: create the configured storage backend."""
    backend = settings.STORAGE_BACKEND.lower()
    if backend in ("oci", "s3", "spaces"):
        if not settings.OCI_STORAGE_KEY or not settings.OCI_STORAGE_SECRET:
            logger.warning(
                f"STORAGE_BACKEND={backend} but OCI_STORAGE_KEY/SECRET not set. "
                "Falling back to local storage (Docker volume on OCI VM)."
            )
            return LocalStorage()
        return OCIObjectStorage()
    return LocalStorage()


# Singleton instance
try:
    storage = _create_backend()
except Exception as e:
    logger.warning(f"Failed to initialize storage backend: {e}. Using local fallback.")
    storage = LocalStorage()


def get_content_type(ext: str) -> str:
    """Map file extension to MIME type."""
    types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    return types.get(ext.lower(), "application/octet-stream")
