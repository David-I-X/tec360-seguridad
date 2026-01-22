"""
Authentication Schemas
Schemas for OTP-based phone authentication
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
import re


class PhoneRequest(BaseModel):
    """Request schema for phone number operations"""
    
    phone: str = Field(
        ...,
        description="Phone number in international format",
        example="+573001234567"
    )
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format"""
        # Remover espacios y guiones
        v = v.replace(' ', '').replace('-', '')
        
        # Validar formato internacional
        if not re.match(r'^\+\d{10,15}$', v):
            raise ValueError(
                'Número de teléfono inválido. Debe estar en formato internacional '
                '(ejemplo: +573001234567)'
            )
        
        # Validar que sea de Colombia (+57)
        if not v.startswith('+57'):
            raise ValueError('Por ahora solo soportamos números de Colombia (+57)')
        
        # Validar longitud para Colombia (debe tener 12 caracteres: +57 + 10 dígitos)
        if len(v) != 13:
            raise ValueError(
                'Número colombiano inválido. Debe tener 10 dígitos después del +57 '
                '(ejemplo: +573001234567)'
            )
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "phone": "+573001234567"
            }
        }


class OTPRequest(BaseModel):
    """Request schema for OTP verification"""
    
    phone: str = Field(
        ...,
        description="Phone number in international format",
        example="+573001234567"
    )
    
    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="6-digit OTP code",
        example="123456"
    )
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format"""
        v = v.replace(' ', '').replace('-', '')
        
        if not re.match(r'^\+57\d{10}$', v):
            raise ValueError('Número de teléfono inválido')
        
        return v
    
    @validator('code')
    def validate_code(cls, v):
        """Validate OTP code format"""
        if not v.isdigit():
            raise ValueError('El código debe contener solo dígitos')
        
        if len(v) != 6:
            raise ValueError('El código debe tener 6 dígitos')
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "phone": "+573001234567",
                "code": "123456"
            }
        }


class OTPResponse(BaseModel):
    """Response schema for OTP request"""
    
    success: bool = Field(..., description="Whether OTP was sent successfully")
    message: str = Field(..., description="Response message")
    phone: str = Field(..., description="Phone number (masked)")
    expires_in_minutes: int = Field(..., description="Minutes until OTP expires")
    code: Optional[str] = Field(
        None, 
        description="OTP code (only in development mode)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Código enviado exitosamente",
                "phone": "+57300***4567",
                "expires_in_minutes": 5,
                "code": "123456"  # Solo en desarrollo
            }
        }


class AuthResponse(BaseModel):
    """Response schema for successful authentication"""
    
    success: bool = Field(..., description="Whether authentication was successful")
    message: str = Field(..., description="Response message")
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    user: dict = Field(..., description="User information")
    is_new_user: bool = Field(
        ..., 
        description="Whether this is a new user (needs onboarding)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Autenticación exitosa",
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "user": {
                    "id": "uuid-here",
                    "phone": "+573001234567",
                    "role": "client",
                    "created_at": "2025-01-07T12:00:00Z"
                },
                "is_new_user": True
            }
        }


class ErrorResponse(BaseModel):
    """Response schema for errors"""
    
    success: bool = Field(False, description="Always false for errors")
    error: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "Código incorrecto. Te quedan 2 intentos.",
                "code": "INVALID_OTP"
            }
        }


class OnboardingRequest(BaseModel):
    """Request schema for completing user profile"""
    
    full_name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="User's full name",
        example="Juan Pérez"
    )
    
    email: Optional[str] = Field(
        None,
        description="Email address (optional)",
        example="juan@example.com"
    )
    
    user_type: str = Field(
        ...,
        description="Type of user: client or technician",
        example="client"
    )
    
    @validator('full_name')
    def validate_name(cls, v):
        """Validate name format"""
        v = v.strip()
        
        if len(v) < 3:
            raise ValueError('El nombre debe tener al menos 3 caracteres')
        
        if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', v):
            raise ValueError('El nombre solo puede contener letras y espacios')
        
        return v
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if v is None or v.strip() == '':
            return None
        
        v = v.strip().lower()
        
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Email inválido')
        
        return v
    
    @validator('user_type')
    def validate_user_type(cls, v):
        """Validate user type"""
        v = v.lower()
        
        if v not in ['client', 'technician']:
            raise ValueError('Tipo de usuario inválido. Debe ser "client" o "technician"')
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Juan Pérez",
                "email": "juan@example.com",
                "user_type": "client"
            }
        }


class OnboardingResponse(BaseModel):
    """Response schema for onboarding completion"""
    
    success: bool = Field(..., description="Whether onboarding was successful")
    message: str = Field(..., description="Response message")
    user: dict = Field(..., description="Updated user information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Perfil completado exitosamente",
                "user": {
                    "id": "uuid-here",
                    "phone": "+573001234567",
                    "full_name": "Juan Pérez",
                    "email": "juan@example.com",
                    "role": "client",
                    "onboarding_completed": True
                }
            }
        }