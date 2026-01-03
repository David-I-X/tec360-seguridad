"""
Endpoints de ejemplo mostrando el uso del módulo de seguridad
"""
from fastapi import APIRouter, Depends
from app.core.security import (
    get_current_user,
    require_roles,
    get_user_id,
    get_optional_user
)

router = APIRouter(prefix="/example", tags=["Examples"])


@router.get("/public")
async def public_route():
    """
    Ruta PÚBLICA - No requiere autenticación.
    Cualquiera puede acceder sin token.
    """
    return {
        "message": "Esta es una ruta pública",
        "auth_required": False
    }


@router.get("/protected")
async def protected_route(current_user: dict = Depends(get_current_user)):
    """
    Ruta PROTEGIDA - Requiere token válido.
    Cualquier usuario autenticado puede acceder.
    
    Header requerido:
        Authorization: Bearer <supabase_jwt_token>
    """
    return {
        "message": f"Hola {current_user['email']}!",
        "user_id": current_user["id"],
        "role": current_user["role"],
        "auth_required": True
    }


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Obtiene el perfil completo del usuario autenticado.
    """
    return {
        "profile": {
            "id": current_user["id"],
            "email": current_user["email"],
            "role": current_user["role"],
            "metadata": current_user.get("user_metadata", {}),
            "created_at": current_user.get("created_at")
        }
    }


@router.get("/my-id")
async def get_my_id(user_id: str = Depends(get_user_id)):
    """
    Ejemplo usando la dependencia simplificada get_user_id.
    Solo retorna el ID del usuario (UUID string).
    """
    return {
        "user_id": user_id,
        "message": "Este es tu ID de usuario"
    }


@router.get("/admin-only")
async def admin_only_route(current_user: dict = Depends(require_roles("admin"))):
    """
    Ruta SOLO PARA ADMINISTRADORES.
    Retorna 403 Forbidden si el usuario no tiene rol "admin".
    """
    return {
        "message": "Bienvenido al panel de administrador",
        "admin_email": current_user["email"]
    }


@router.get("/technician-dashboard")
async def technician_dashboard(
    current_user: dict = Depends(require_roles("technician", "admin"))
):
    """
    Ruta para TÉCNICOS Y ADMINISTRADORES.
    Permite acceso si el rol es "technician" o "admin".
    """
    return {
        "message": "Dashboard de técnico",
        "user": {
            "email": current_user["email"],
            "role": current_user["role"]
        },
        "stats": {
            "services_completed": 0,
            "pending_services": 0
        }
    }


@router.get("/optional-auth")
async def optional_auth_route(user: dict = Depends(get_optional_user)):
    """
    Ruta con autenticación OPCIONAL.
    Muestra contenido diferente si el usuario está logueado o no.
    """
    if user:
        return {
            "message": f"Bienvenido de vuelta, {user['email']}",
            "authenticated": True,
            "personalized_content": ["Item 1", "Item 2", "Item 3"]
        }
    else:
        return {
            "message": "Contenido público",
            "authenticated": False,
            "generic_content": ["Generic 1", "Generic 2"]
        }