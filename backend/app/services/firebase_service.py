"""
Servicio de autenticación e integración con Firebase Admin SDK
Permite verificar tokens telefónicos emitidos por Google Identity / Firebase Auth
"""
import os
import json
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
import firebase_admin
from firebase_admin import auth, credentials
from app.core.config import settings

logger = logging.getLogger(__name__)


class FirebaseService:
    def __init__(self):
        self._app: Optional[firebase_admin.App] = None
        self._init_firebase()

    def _init_firebase(self):
        """Inicializa Firebase Admin SDK si no está inicializado ya."""
        if firebase_admin._apps:
            self._app = firebase_admin.get_app()
            logger.info("Firebase Admin SDK ya estaba inicializado.")
            return

        cred_path = settings.FIREBASE_CREDENTIALS_PATH

        # Buscar posibles rutas del archivo de credenciales
        candidate_paths = [
            cred_path,
            os.path.join(os.path.dirname(__file__), "..", "..", cred_path),
            os.path.join(os.path.dirname(__file__), "..", "..", "firebase-credentials.json"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "tec-360-firebase-adminsdk-fbsvc-f02624bd2a.json"),
            "/app/credentials/firebase-credentials.json",
            "/app/firebase-credentials.json",
            "credentials/firebase-credentials.json",
            "firebase-credentials.json",
        ]

        # 1. Intentar variable de entorno directa con JSON
        cred_json_env = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if cred_json_env:
            try:
                cred_dict = json.loads(cred_json_env)
                cred = credentials.Certificate(cred_dict)
                self._app = firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin inicializado desde FIREBASE_CREDENTIALS_JSON")
                return
            except Exception as e:
                logger.error(f"Error al parsear FIREBASE_CREDENTIALS_JSON: {e}")

        # 2. Intentar buscar el archivo en las rutas candidatas
        for path in candidate_paths:
            if path and os.path.exists(path):
                try:
                    cred = credentials.Certificate(path)
                    self._app = firebase_admin.initialize_app(cred)
                    logger.info(f"Firebase Admin inicializado exitosamente desde: {path}")
                    return
                except Exception as e:
                    logger.error(f"Error al inicializar Firebase con archivo {path}: {e}")

        logger.warning(
            "No se encontraron credenciales de Firebase válidas. "
            "El endpoint /auth/firebase-verify requerirá configuración antes de operar en producción."
        )

    def is_configured(self) -> bool:
        """Retorna True si Firebase Admin SDK está inicializado."""
        return self._app is not None or bool(firebase_admin._apps)

    def verify_id_token(self, id_token: str) -> Dict[str, Any]:
        """
        Verifica criptográficamente el token ID emitido por Firebase Authentication.
        Retorna el diccionario con la información del usuario (phone_number, uid, etc.)
        """
        if not self.is_configured():
            # Reintentar inicialización por si el archivo fue colocado después
            self._init_firebase()
            if not self.is_configured():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="El servicio de autenticación Firebase no está configurado en el servidor."
                )

        try:
            # check_revoked=True asegura que si el token fue revocado se rechace
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except auth.ExpiredIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="El código de verificación ha expirado. Solicita uno nuevo."
            )
        except auth.RevokedIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La sesión de verificación ha sido revocada."
            )
        except auth.InvalidIdTokenError as e:
            logger.warning(f"InvalidIdTokenError en Firebase: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de verificación inválido."
            )
        except Exception as e:
            logger.error(f"Error al verificar token con Firebase: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Error en la verificación de identidad: {str(e)}"
            )


# Instancia singleton del servicio
firebase_service = FirebaseService()
