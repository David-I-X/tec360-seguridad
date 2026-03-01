"""
Módulo de seguridad - Validación de tokens JWT Locales
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings

# OAuth2 scheme points to the login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme_optional)) -> Optional[dict]:
    """
    Returns user dict if token is valid, else None.
    Does NOT raise HTTPException.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return {"id": payload.get("sub"), "role": payload.get("role", "client")}
    except JWTError:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Validate JWT token and return user data (id, role, email).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode token locally
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
        # For now, we return basic data from token/validation
        # In a real scenario, you might fetch fresh data from DB here
        # But for performance we trust the token's claims if valid
        return {
            "id": user_id,
            "role": payload.get("role", "client") # Defaults to client if not present
        }
        
    except JWTError:
        raise credentials_exception

def require_roles(*allowed_roles: str):
    """
    Factory validation for roles.
    Assumes role is embedded in token or fetched from DB.
    For this MVP migration, we will fetch the user from DB in the next step
    or embed verify calls.
    """
    async def role_checker(token: str = Depends(oauth2_scheme)) -> dict:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            # We need to make sure 'role' is in the payload during Login
            user_role = payload.get("role", "client") 
            
            if user_role not in allowed_roles and "admin" not in user_role:
                 raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Acceso denegado. Se requiere rol: {', '.join(allowed_roles)}",
                )
            
            return {"id": payload.get("sub"), "role": user_role}
            
        except JWTError:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
            
    return role_checker

# Utilities
def get_user_id(current_user: dict = Depends(get_current_user)) -> str:
    return current_user["id"]

def decode_token(token: str) -> dict:
    """Decode a JWT token and return payload. Used for WebSocket auth."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise ValueError("Invalid token")