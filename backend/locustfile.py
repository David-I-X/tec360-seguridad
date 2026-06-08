"""
╔══════════════════════════════════════════════════════════════╗
║  Tec360 Seguridad — Prueba de Estrés (Load Test)           ║
║  Ejecutar:                                                  ║
║    pip install locust websocket-client                      ║
║    cd backend                                               ║
║    locust -f locustfile.py                                  ║
║  Luego abre http://localhost:8089 en tu navegador           ║
╚══════════════════════════════════════════════════════════════╝

IMPORTANTE: Antes de ejecutar contra producción:
  1. Asegúrate de que SMS_ENABLED=false en el servidor para evitar
     enviar SMS reales (el OTP fijo "123456" se usa en modo dev).
  2. Haz un backup de tu BD si lo necesitas.

Qué simula:
  - ClientUser (peso 3): Login OTP → ver servicios → crear servicios
  - TechUser   (peso 1): Login OTP → ver servicios pendientes → enviar cotizaciones
  - WSUser     (peso 1): Login OTP → mantener conexión WebSocket enviando GPS
"""

import random
import string
import time
import json
import logging
from locust import HttpUser, task, between, events
from locust.exception import StopUser

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────
OTP_CODE = "123456"  # Código fijo en modo dev

# Coordenadas aleatorias en el área de Medellín
MEDELLIN_CENTER = (6.2442, -75.5812)
COORD_SPREAD = 0.05  # ~5km radius


def random_phone():
    """Genera un teléfono colombiano aleatorio para la prueba."""
    return f"+5730{random.randint(10000000, 99999999)}"


def random_coords():
    """Devuelve coordenadas aleatorias cerca a Medellín."""
    lat = MEDELLIN_CENTER[0] + random.uniform(-COORD_SPREAD, COORD_SPREAD)
    lng = MEDELLIN_CENTER[1] + random.uniform(-COORD_SPREAD, COORD_SPREAD)
    return round(lat, 6), round(lng, 6)


SERVICE_TYPES = [
    "gps_installation",
    "gps_maintenance",
    "alarm_installation",
    "alarm_maintenance",
    "camera_installation",
]


# ──────────────────────────────────────────────
# BASE: Login con OTP simulado
# ──────────────────────────────────────────────
class Tec360BaseUser(HttpUser):
    """Clase base — NO se ejecuta directamente."""
    abstract = True
    wait_time = between(1, 3)

    token = None
    user_id = None
    phone = None

    def login_otp(self, role: str = "client"):
        """
        Flujo completo: request-otp → verify-otp → onboarding
        Retorna True si el login fue exitoso.
        """
        self.phone = random_phone()

        # 1. Solicitar OTP
        r1 = self.client.post(
            "/auth/request-otp",
            json={"phone": self.phone},
            name="/auth/request-otp",
        )
        if r1.status_code != 200:
            logger.warning(f"OTP request failed: {r1.status_code}")
            return False

        # 2. Verificar OTP (código fijo)
        r2 = self.client.post(
            "/auth/verify-otp",
            json={"phone": self.phone, "code": OTP_CODE},
            name="/auth/verify-otp",
        )
        if r2.status_code != 200:
            logger.warning(f"OTP verify failed: {r2.status_code}")
            return False

        data = r2.json()
        self.token = data.get("access_token")
        self.user_id = data.get("user", {}).get("id")
        is_new = data.get("is_new_user", False)

        # 3. Onboarding si es nuevo
        if is_new:
            rand_name = f"Test {'Cliente' if role == 'client' else 'Técnico'} {random.randint(1000,9999)}"
            r3 = self.client.post(
                "/auth/onboarding",
                json={
                    "full_name": rand_name,
                    "email": f"test{random.randint(10000,99999)}@loadtest.com",
                    "user_type": role,
                },
                headers=self._auth_headers(),
                name="/auth/onboarding",
            )
            if r3.status_code != 200:
                logger.warning(f"Onboarding failed: {r3.status_code}")

        return True

    def _auth_headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}


# ──────────────────────────────────────────────
# PERFIL 1: CLIENTE
# ──────────────────────────────────────────────
class ClientUser(Tec360BaseUser):
    """
    Simula un cliente que:
    - Ve la lista de sus servicios
    - Crea solicitudes de servicio nuevas
    - Revisa cotizaciones
    """
    weight = 3  # 3 clientes por cada 1 técnico

    def on_start(self):
        if not self.login_otp("client"):
            raise StopUser()
        self.my_service_ids = []

    @task(5)
    def view_my_services(self):
        """Carga la lista de servicios del cliente (lectura frecuente)."""
        self.client.get(
            "/services/my-services",
            headers=self._auth_headers(),
            name="/services/my-services [CLIENT]",
        )

    @task(3)
    def view_service_types(self):
        """Carga los tipos de servicio (endpoint público, cacheable)."""
        self.client.get(
            "/services/types",
            name="/services/types",
        )

    @task(2)
    def create_service(self):
        """Crea una solicitud de servicio nueva."""
        lat, lng = random_coords()
        r = self.client.post(
            "/services/",
            json={
                "title": f"Servicio de prueba {random.randint(1, 9999)}",
                "description": "Solicitud generada por prueba de estrés Locust. "
                               "Necesito instalación urgente en mi vehículo.",
                "service_type": random.choice(SERVICE_TYPES),
                "address": f"Calle {random.randint(1,100)} #{random.randint(1,80)}-{random.randint(1,99)}, Medellín",
                "latitude": lat,
                "longitude": lng,
                "priority": random.choice(["normal", "urgent"]),
            },
            headers=self._auth_headers(),
            name="/services/ [CREATE]",
        )
        if r.status_code in (200, 201):
            svc = r.json()
            svc_id = svc.get("id") or svc.get("service", {}).get("id")
            if svc_id:
                self.my_service_ids.append(svc_id)

    @task(2)
    def view_quotations(self):
        """Si tiene servicios, revisa las cotizaciones."""
        if not self.my_service_ids:
            return
        service_id = random.choice(self.my_service_ids)
        self.client.get(
            f"/quotations/service/{service_id}",
            headers=self._auth_headers(),
            name="/quotations/service/{id} [CLIENT]",
        )

    @task(1)
    def view_notifications(self):
        """Revisa notificaciones."""
        self.client.get(
            "/notifications/",
            headers=self._auth_headers(),
            name="/notifications/ [CLIENT]",
        )


# ──────────────────────────────────────────────
# PERFIL 2: TÉCNICO
# ──────────────────────────────────────────────
class TechUser(Tec360BaseUser):
    """
    Simula un técnico que:
    - Ve servicios disponibles (pendientes)
    - Envía cotizaciones a servicios
    - Revisa sus cotizaciones enviadas
    """
    weight = 1

    def on_start(self):
        if not self.login_otp("technician"):
            raise StopUser()
        self.quoted_services = set()

    @task(5)
    def view_pending_services(self):
        """Técnico busca servicios pendientes para cotizar."""
        self.client.get(
            "/services/?status=pending&page=1&page_size=20",
            headers=self._auth_headers(),
            name="/services/?status=pending [TECH]",
        )

    @task(3)
    def view_my_quotations(self):
        """Revisa las cotizaciones que ha enviado."""
        self.client.get(
            "/quotations/me?page=1&page_size=10",
            headers=self._auth_headers(),
            name="/quotations/me [TECH]",
        )

    @task(2)
    def send_quotation(self):
        """Busca un servicio pendiente y le envía cotización."""
        # Primero obtener lista de servicios pendientes
        r = self.client.get(
            "/services/?status=pending&page=1&page_size=5",
            headers=self._auth_headers(),
            name="/services/?pending (for quoting)",
        )
        if r.status_code != 200:
            return

        data = r.json()
        services = data.get("services") or data.get("items") or []
        if not services:
            return

        # Elegir uno al que no haya cotizado
        available = [
            s for s in services
            if (s.get("id") or s.get("service_id")) not in self.quoted_services
        ]
        if not available:
            return

        svc = random.choice(available)
        svc_id = svc.get("id") or svc.get("service_id")

        amount = random.randint(80000, 500000)
        r2 = self.client.post(
            f"/quotations/service/{svc_id}",
            json={
                "amount": amount,
                "description": f"Cotización de estrés: incluye mano de obra, materiales y "
                               f"garantía. Precio total: ${amount:,} COP.",
                "expires_in_hours": random.choice([24, 48, 72]),
            },
            headers=self._auth_headers(),
            name="/quotations/service/{id} [SEND]",
        )
        if r2.status_code in (200, 201):
            self.quoted_services.add(svc_id)

    @task(1)
    def view_notifications(self):
        """Revisa notificaciones."""
        self.client.get(
            "/notifications/",
            headers=self._auth_headers(),
            name="/notifications/ [TECH]",
        )


# ──────────────────────────────────────────────
# PERFIL 3: WEBSOCKET (Tracking en vivo)
# ──────────────────────────────────────────────
class WSUser(Tec360BaseUser):
    """
    Simula un técnico con conexión WebSocket abierta
    enviando su ubicación GPS cada 5 segundos.

    ESTE ES EL PERFIL MÁS PESADO para el servidor:
    mantiene conexiones abiertas que consumen RAM.
    """
    weight = 1

    def on_start(self):
        if not self.login_otp("technician"):
            raise StopUser()

    @task
    def maintain_ws_connection(self):
        """
        Abre WebSocket al canal de usuario y envía pings
        simulando el comportamiento real de la app móvil.

        Nota: Locust no tiene soporte nativo de WS.
        Usamos websocket-client como fallback y medimos
        manualmente el tiempo de respuesta.
        """
        try:
            import websocket as ws_lib
        except ImportError:
            logger.error("websocket-client no instalado. pip install websocket-client")
            return

        # Construir URL de WebSocket
        host = self.host.replace("https://", "").replace("http://", "")
        protocol = "wss" if "https" in self.host else "ws"
        ws_url = f"{protocol}://{host}/ws/user?token={self.token}"

        start = time.time()
        try:
            ws = ws_lib.create_connection(ws_url, timeout=10)

            # Leer confirmación de conexión
            connected_msg = ws.recv()
            elapsed = time.time() - start
            events.request.fire(
                request_type="WS",
                name="/ws/user [CONNECT]",
                response_time=elapsed * 1000,
                response_length=len(connected_msg),
                exception=None,
                context={},
            )

            # Enviar pings cada 5 segundos durante 30 segundos
            for i in range(6):
                time.sleep(5)

                ping_start = time.time()
                ws.send(json.dumps({"type": "ping"}))
                pong = ws.recv()
                ping_elapsed = time.time() - ping_start

                events.request.fire(
                    request_type="WS",
                    name="/ws/user [PING]",
                    response_time=ping_elapsed * 1000,
                    response_length=len(pong),
                    exception=None,
                    context={},
                )

            ws.close()

        except Exception as e:
            elapsed = time.time() - start
            events.request.fire(
                request_type="WS",
                name="/ws/user [ERROR]",
                response_time=elapsed * 1000,
                response_length=0,
                exception=e,
                context={},
            )


# ──────────────────────────────────────────────
# EVENTOS GLOBALES
# ──────────────────────────────────────────────
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "=" * 60)
    print("🚀 PRUEBA DE ESTRÉS TEC360 INICIADA")
    print("=" * 60)
    print(f"  Host: {environment.host}")
    print(f"  Perfiles: ClientUser(x3), TechUser(x1), WSUser(x1)")
    print(f"  OTP Code: {OTP_CODE}")
    print("=" * 60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n" + "=" * 60)
    print("🏁 PRUEBA DE ESTRÉS FINALIZADA")
    print("=" * 60)
    stats = environment.runner.stats
    print(f"  Total requests: {stats.total.num_requests}")
    print(f"  Failures:       {stats.total.num_failures}")
    print(f"  Avg response:   {stats.total.avg_response_time:.0f}ms")
    print(f"  Median:         {stats.total.median_response_time}ms")
    print(f"  P95:            {stats.total.get_response_time_percentile(0.95):.0f}ms")
    print(f"  P99:            {stats.total.get_response_time_percentile(0.99):.0f}ms")
    print(f"  RPS:            {stats.total.total_rps:.1f}")
    print("=" * 60 + "\n")
