"""
Módulo de seguridad - Validación de tokens Supabase y dependencias FastAPI
"""
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client # type: ignore
from app.core.config import settings

# Esquema de seguridad Bearer token
security = HTTPBearer()

# Cliente Supabase global (usa SERVICE_KEY para operaciones de backend)
supabase_client: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY  # Service key, NO anon key
)


async def verify_supabase_token(token: str) -> dict:
    """
    Verifica un token JWT de Supabase y retorna la info del usuario.
    
    Args:
        token: JWT token de Supabase (sin el prefijo "Bearer")
    
    Returns:
        dict: Información del usuario validado desde Supabase
        Ejemplo: {
            "id": "uuid-del-usuario",
            "email": "usuario@example.com",
            "role": "client",
            "user_metadata": {...}
        }
    
    Raises:
        HTTPException: Si el token es inválido, expirado o el usuario no existe
    """
    try:
        # Usar el método get_user de Supabase para verificar el token
        # Este método valida el JWT automáticamente
        response = supabase_client.auth.get_user(token)
        
        # Verificar que obtuvimos un usuario válido
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = response.user
        
        # Extraer rol del user_metadata (o asignar "client" por defecto)
        # En el MVP, configuramos esto manualmente en Supabase
        user_metadata = user.user_metadata or {}
        role = user_metadata.get("role", "client")  # Default: client
        
        # Construir objeto de usuario limpio
        user_data = {
            "id": user.id,
            "email": user.email,
            "role": role,
            "user_metadata": user_metadata,
            "created_at": user.created_at,
        }
        
        return user_data
        
    except HTTPException:
        # Re-lanzar excepciones HTTP que ya creamos
        raise
        
    except Exception as e:
        # Capturar cualquier otro error (problemas de red, Supabase down, etc.)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error al verificar token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependencia de FastAPI que extrae y valida el token del header Authorization.
    
    Uso en endpoints:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"message": f"Hola {user['email']}"}
    
    Args:
        credentials: Credenciales extraídas del header Authorization por HTTPBearer
    
    Returns:
        dict: Usuario validado con id, email, role, etc.
    
    Raises:
        HTTPException 401: Si no hay token o es inválido
    """
    # HTTPBearer ya extrajo el token del header "Authorization: Bearer <token>"
    token = credentials.credentials
    
    # Validar el token con Supabase
    user = await verify_supabase_token(token)
    
    return user


def require_roles(*allowed_roles: str):
    """
    Factory de dependencia que verifica que el usuario tenga uno de los roles permitidos.
    
    Uso:
        @app.get("/admin")
        async def admin_only(user: dict = Depends(require_roles("admin"))):
            return {"message": "Área de administrador"}
        
        @app.get("/technician-dashboard")
        async def tech_dashboard(user: dict = Depends(require_roles("technician", "admin"))):
            return {"message": "Dashboard de técnico"}
    
    Args:
        *allowed_roles: Roles permitidos (ej: "admin", "technician", "client")
    
    Returns:
        Callable: Dependencia de FastAPI que valida roles
    """
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        """
        Verifica que el usuario actual tenga uno de los roles permitidos.
        """
        user_role = current_user.get("role")
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere rol: {', '.join(allowed_roles)}",
            )
        
        return current_user
    
    return role_checker


# Utilidades adicionales

def get_user_id(current_user: dict = Depends(get_current_user)) -> str:
    """
    Dependencia simplificada que solo retorna el ID del usuario.
    Útil cuando solo necesitas el user_id en un endpoint.
    
    Uso:
        @app.get("/my-services")
        async def get_my_services(user_id: str = Depends(get_user_id)):
            # user_id es un string UUID
            return {"user_id": user_id, "services": [...]}
    """
    return current_user["id"]


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    Dependencia que intenta obtener el usuario, pero NO falla si no hay token.
    Útil para rutas públicas que muestran contenido diferente si el usuario está logueado.
    
    Uso:
        @app.get("/feed")
        async def get_feed(user: Optional[dict] = Depends(get_optional_user)):
            if user:
                return {"feed": "personalizado", "user": user["email"]}
            else:
                return {"feed": "público"}
    
    Returns:
        dict | None: Usuario si hay token válido, None si no hay token
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        user = await verify_supabase_token(token)
        return user
    except HTTPException:
        # Si el token es inválido, retornamos None en lugar de lanzar error
        return None