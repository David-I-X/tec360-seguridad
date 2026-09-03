"""
Script para crear o promover un usuario Administrador en Tec360 Seguridad
Uso:
  python -m app.scripts.create_admin <phone> [full_name] [email]
Ejemplo:
  python -m app.scripts.create_admin +573001234567 "Admin Principal" "admin@tec-360.tech"
"""
import sys
from sqlmodel import Session, select
from app.core.database import engine
from app.models.user import User

def create_or_promote_admin(phone: str, full_name: str = "Administrador Tec360", email: str = None):
    if not email:
        email = f"{phone.replace('+', '')}@tec-360.tech"
        
    with Session(engine) as session:
        statement = select(User).where((User.phone == phone) | (User.email == email))
        user = session.exec(statement).first()
        
        if user:
            user.role = "admin"
            user.is_active = True
            if full_name:
                user.full_name = full_name
            if email:
                user.email = email
            session.add(user)
            session.commit()
            session.refresh(user)
            print("✅ Usuario existente actualizado a Administrador:")
            print(f"   ID: {user.id}")
            print(f"   Teléfono: {user.phone}")
            print(f"   Email: {user.email}")
            print(f"   Nombre: {user.full_name}")
            print(f"   Rol: {user.role}")
        else:
            user = User(
                email=email,
                phone=phone,
                full_name=full_name,
                role="admin",
                is_active=True,
                hashed_password="nopassword"
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            print("✅ Nuevo usuario Administrador creado exitosamente:")
            print(f"   ID: {user.id}")
            print(f"   Teléfono: {user.phone}")
            print(f"   Email: {user.email}")
            print(f"   Nombre: {user.full_name}")
            print(f"   Rol: {user.role}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python -m app.scripts.create_admin <phone> [full_name] [email]")
        sys.exit(1)
        
    phone_arg = sys.argv[1]
    name_arg = sys.argv[2] if len(sys.argv) > 2 else "Administrador Tec360"
    email_arg = sys.argv[3] if len(sys.argv) > 3 else None
    
    create_or_promote_admin(phone_arg, name_arg, email_arg)
