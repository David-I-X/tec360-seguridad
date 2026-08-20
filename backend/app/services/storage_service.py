"""
Centralized storage service for file uploads.
Supports two backends:
  - "local": saves to /opt/tec360-seguridad/uploads/ (dev / legacy)
  - "spaces": uploads to DigitalOcean Spaces (S3-compatible, production)

Usage:
    from app.services.storage_service import storage

    url = await storage.upload(
        file_bytes=content,
        folder="documents",
        filename="cedula_front_abc123.jpg",
        content_type="image/jpeg",
    )
    # Returns: "/uploads/documents/cedula_front_abc123.jpg"  (local)
    #      or: "https://tec360-uploads.nyc3.digitaloceanspaces.com/documents/cedula_front_abc123.jpg"  (spaces)

    await storage.delete(url)
"""
import os
import uuid
import logging

from fastapi import UploadFile, HTTPException

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


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------
class StorageBackend:
    """Interface that both backends implement."""

    async def upload(
        self,
        file_bytes: bytes,
        folder: str,
        filename: str,
        content_type: str = "image/jpeg",
    ) -> str:
        raise NotImplementedError

    async def delete(self, url: str) -> bool:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Local filesystem backend (dev / legacy)
# ---------------------------------------------------------------------------
class LocalStorageBackend(StorageBackend):
    BASE_DIR = "/opt/tec360-seguridad/uploads"

    def __init__(self):
        # On Windows dev machines, use a relative path
        if os.name == "nt":
            self.BASE_DIR = os.path.join(os.getcwd(), "uploads")
        os.makedirs(self.BASE_DIR, exist_ok=True)

    async def upload(
        self,
        file_bytes: bytes,
        folder: str,
        filename: str,
        content_type: str = "image/jpeg",
    ) -> str:
        dir_path = os.path.join(self.BASE_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)

        filepath = os.path.join(dir_path, filename)
        with open(filepath, "wb") as f:
            f.write(file_bytes)

        url = f"/uploads/{folder}/{filename}"
        logger.info("Saved file locally: %s", url)
        return url

    async def delete(self, url: str) -> bool:
        # url looks like "/uploads/documents/file.jpg"
        relative = url.lstrip("/").replace("uploads/", "", 1)
        filepath = os.path.join(self.BASE_DIR, relative)
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info("Deleted local file: %s", filepath)
            return True
        return False


# ---------------------------------------------------------------------------
# DigitalOcean Spaces backend (production)
# ---------------------------------------------------------------------------
class SpacesStorageBackend(StorageBackend):
    def __init__(
        self,
        key: str,
        secret: str,
        region: str,
        bucket: str,
        endpoint: str,
    ):
        import boto3
        from botocore.config import Config as BotoConfig

        self.bucket = bucket
        self.region = region

        # Build the endpoint URL if not provided
        if not endpoint:
            endpoint = f"https://{region}.digitaloceanspaces.com"
        self.endpoint = endpoint

        # CDN URL for public reads (DO Spaces edge cache)
        self.cdn_url = f"https://{bucket}.{region}.cdn.digitaloceanspaces.com"

        self.client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint,
            aws_access_key_id=key,
            aws_secret_access_key=secret,
            config=BotoConfig(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "adaptive"},
            ),
        )
        logger.info(
            "DigitalOcean Spaces client initialized — bucket=%s endpoint=%s",
            bucket, endpoint,
        )

    async def upload(
        self,
        file_bytes: bytes,
        folder: str,
        filename: str,
        content_type: str = "image/jpeg",
    ) -> str:
        key = f"{folder}/{filename}"

        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
            ACL="public-read",
        )

        url = f"{self.cdn_url}/{key}"
        logger.info("Uploaded to Spaces: %s", url)
        return url

    async def delete(self, url: str) -> bool:
        # Extract key from CDN URL
        # e.g. "https://tec360-uploads.nyc3.cdn.digitaloceanspaces.com/documents/file.jpg"
        #  -> key = "documents/file.jpg"
        try:
            key = url.split(f"{self.cdn_url}/", 1)[1]
        except (IndexError, AttributeError):
            # Try extracting from endpoint URL as fallback
            try:
                key = url.split(f"{self.endpoint}/{self.bucket}/", 1)[1]
            except (IndexError, AttributeError):
                logger.warning("Could not extract key from URL: %s", url)
                return False

        self.client.delete_object(Bucket=self.bucket, Key=key)
        logger.info("Deleted from Spaces: %s", key)
        return True


# ---------------------------------------------------------------------------
# Factory — creates the correct backend based on settings
# ---------------------------------------------------------------------------
def _create_backend() -> StorageBackend:
    # Import here to avoid circular imports during testing
    try:
        from app.core.config import settings
        backend_type = settings.STORAGE_BACKEND
    except Exception:
        backend_type = os.getenv("STORAGE_BACKEND", "local")

    if backend_type == "spaces":
        try:
            from app.core.config import settings as s
            return SpacesStorageBackend(
                key=s.DO_SPACES_KEY,
                secret=s.DO_SPACES_SECRET,
                region=s.DO_SPACES_REGION,
                bucket=s.DO_SPACES_BUCKET,
                endpoint=s.DO_SPACES_ENDPOINT,
            )
        except Exception as e:
            logger.error("Failed to create Spaces backend: %s — falling back to local", e)
            return LocalStorageBackend()

    return LocalStorageBackend()


# Singleton instance
storage: StorageBackend = _create_backend()
