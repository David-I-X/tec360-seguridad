---
name: Database Migrations
description: How to modify the database schema safely in the Tec360 project.
---

# Database Migrations

This project uses **SQLModel** (SQLAlchemy under the hood) with **PostgreSQL + PostGIS**.

## Adding a New Column

### 1. Update the SQLModel model

Location: `backend/app/models/<model>.py`

```python
class Service(SQLModel, table=True):
    # ... existing fields ...
    new_field: Optional[str] = Field(default=None)  # Add the new field
```

### 2. Create a migration SQL file

Location: `migration.sql` (project root) or run directly in production.

```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS new_field TEXT;
```

### 3. Apply the migration

**Local development:**
```bash
docker exec -i tec360_db psql -U tec360 tec360 -c "ALTER TABLE services ADD COLUMN IF NOT EXISTS new_field TEXT;"
```

**Production:**
```bash
ssh user@server
docker exec -i tec360_db psql -U tec360 tec360 -c "ALTER TABLE services ADD COLUMN IF NOT EXISTS new_field TEXT;"
```

### 4. Update schemas

If the field should appear in API responses, update the Pydantic schema:

Location: `backend/app/schemas/<name>.py`

```python
class ServiceResponse(BaseModel):
    # ... existing fields ...
    new_field: Optional[str] = None
```

## Adding a New Table

### 1. Create the model file

```python
# backend/app/models/new_model.py
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class NewTable(SQLModel, table=True):
    __tablename__ = "new_table"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 2. Import in models/__init__.py

Make sure the model is imported so SQLModel knows about it.

### 3. Create the table

The app's `create_db_and_tables()` in `database.py` handles this on startup, but for production you may prefer:

```sql
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
```

## Key Conventions

- Always use `Optional[type] = Field(default=None)` for nullable fields
- Always use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to make migrations idempotent
- Use `Field(index=True)` for frequently queried columns
- PostGIS types: use `Column(Geometry("POINT", srid=4326))` for geographic data
- Keep `migration.sql` updated as a living document of all schema changes

## Useful SQL Queries

```sql
-- List all tables
\dt

-- Describe a table
\d services

-- Check indexes
\di

-- Count rows
SELECT COUNT(*) FROM services;

-- Check PostGIS
SELECT PostGIS_version();
```
