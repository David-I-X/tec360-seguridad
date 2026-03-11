---
name: Backend API Development
description: How to add new API endpoints, models, schemas, and services to the FastAPI backend.
---

# Backend API Development

## Adding a New Endpoint

### 1. Create or modify the router file

Location: `backend/app/api/<module>.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.database import get_session
from app.core.auth_utils import get_current_user

router = APIRouter(prefix="/<module>", tags=["<Module>"])

@router.get("/", summary="List items")
async def list_items(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Business logic here
    return {"items": []}
```

### 2. Register the router in `main.py`

```python
from app.api import new_module
app.include_router(new_module.router, prefix="/api")
```

### 3. Create a Pydantic schema (if needed)

Location: `backend/app/schemas/<name>.py`

```python
from pydantic import BaseModel
from typing import Optional

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
```

### 4. Create or modify the SQLModel model

Location: `backend/app/models/<name>.py`

```python
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Item(SQLModel, table=True):
    __tablename__ = "items"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 5. Create business logic in a service

Location: `backend/app/services/<name>_service.py`

Keep API routers thin — put logic in service files.

## Key Conventions

- **Auth**: Use `Depends(get_current_user)` for protected endpoints. Returns `{"id": ..., "role": ..., "phone": ...}`.
- **Database**: Use `Depends(get_session)` for database sessions.
- **Roles**: `client`, `technician`, `admin`. Check via `current_user["role"]`.
- **Uploads**: Use `backend/app/api/uploads.py` patterns for file uploads. Always create the directory in `ensure_upload_dirs()`.
- **WebSockets**: Import `ws_manager` from `app.core.websocket_manager` to broadcast real-time events.
- **Error handling**: Use `HTTPException` with proper status codes and descriptive detail messages.

## Running the Backend Locally

```bash
# From project root
docker compose -f docker-compose.prod.yml up db -d   # Start PostgreSQL
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: `http://localhost:8000/docs`

## Linting

```bash
cd backend
ruff check app/
```
