"""
Storage Service — Abstracción para almacenamiento de archivos.
Soporta: local (Docker volume) y DigitalOcean Spaces (S3-compatible).
Se elige según settings.STORAGE_BACKEND ("local" | "spaces").
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
    """Stores files on local filesystem (Docker volume)."""

    BASE_DIR = "/opt/tec360-seguridad/uploads"

    def __init__(self):
        os.makedirs(self.BASE_DIR, exist_ok=True)

    def upload(self, content: bytes, path: str, content_type: str = "image/jpeg") -> str:
        full_path = os.path.join(self.BASE_DIR, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        # Return relative URL for local
        return f"/uploads/{path}"

    def delete(self, path: str) -> bool:
        full_path = os.path.join(self.BASE_DIR, path)
        try:
            os.remove(full_path)
            return True
        except FileNotFoundError:
            return False


class SpacesStorage(StorageBackend):
    """Stores files on DigitalOcean Spaces (S3-compatible)."""

    def __init__(self):
        import boto3
        self.bucket = settings.DO_SPACES_BUCKET
        self.region = settings.DO_SPACES_REGION
        self.endpoint = settings.DO_SPACES_ENDPOINT or f"https://{self.region}.digitaloceanspaces.com"
        self.cdn_url = self.endpoint.replace("digitaloceanspaces.com", "cdn.digitaloceanspaces.com")

        self.client = boto3.client(
            "s3",
            region_name=self.region,
            endpoint_url=self.endpoint,
            aws_access_key_id=settings.DO_SPACES_KEY,
            aws_secret_access_key=settings.DO_SPACES_SECRET,
        )
        logger.info(f"SpacesStorage initialized: bucket={self.bucket}, endpoint={self.endpoint}")

    def upload(self, content: bytes, path: str, content_type: str = "image/jpeg") -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=content,
            ContentType=content_type,
            ACL="public-read",
        )
        # Return CDN URL
        url = f"{self.cdn_url}/{self.bucket}/{path}"
        logger.info(f"Uploaded to Spaces: {url}")
        return url

    def delete(self, path: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=path)
            return True
        except Exception as e:
            logger.error(f"Failed to delete from Spaces: {e}")
            return False


def _create_backend() -> StorageBackend:
    """Factory: create the configured storage backend."""
    backend = settings.STORAGE_BACKEND.lower()
    if backend == "spaces":
        if not settings.DO_SPACES_KEY or not settings.DO_SPACES_SECRET:
            logger.warning(
                "STORAGE_BACKEND=spaces but DO_SPACES_KEY/SECRET not set. "
                "Falling back to local storage."
            )
            return LocalStorage()
        return SpacesStorage()
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
