# 🚀 Tec360 Seguridad

**Tec360 Seguridad** es una plataforma web y móvil que conecta usuarios con técnicos certificados del SENA para la instalación y mantenimiento de sistemas de seguridad (GPS, alarmas, cámaras, etc.) en toda Colombia.  
El proyecto integra un ecosistema **web + app móvil + backend + base de datos + APIs externas** bajo un modelo escalable, moderno y con costos iniciales mínimos.

---

## 🧠 Objetivo del Proyecto

Desarrollar un **Producto Mínimo Viable (PMV)** que permita:
- ✅ Gestionar usuarios y técnicos (autenticación y roles).
- ✅ Crear, asignar y monitorear servicios técnicos en tiempo real.
- ⏳ Ofrecer trazabilidad GPS, calificación, facturación y soporte multimedia.
- 🎯 Escalar hacia un modelo SaaS para empresas de seguridad y logística.

---

## 📊 Estado del MVP

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Autenticación y Roles** | ✅ Completo | JWT con Supabase Auth, RLS habilitado |
| **Gestión de Servicios** | ✅ Completo | CRUD, asignación, paginación, filtros |
| **Gestión de Técnicos** | ⏳ En desarrollo | Perfiles, búsqueda cercana, disponibilidad |
| **Sistema de Calificaciones** | ⏳ Pendiente | Rating de servicios y técnicos |
| **Geolocalización (Google Maps)** | ⏳ Pendiente | Geocoding, rutas, autocomplete |
| **Subida de Imágenes** | ⏳ Pendiente | Evidencias fotográficas en Supabase Storage |
| **Frontend Web** | ⏸️ No iniciado | Next.js + React + TailwindCSS |
| **App Móvil** | ⏸️ No iniciado | React Native o Flutter |

---

## �️ Arquitectura del Sistema

Usuario (cliente / técnico)  
        │  
        ▼  
[Frontend: React / Next.js]  →  Desplegado en **Vercel**  
        │  
        ▼  
[Backend: FastAPI (Python)]  →  Desplegado en **Fly.io**  
        │  
        ▼  
[Base de datos + Auth + Storage: Supabase (PostgreSQL + PostGIS)]  
        │  
        ├── Almacenamiento multimedia (imágenes, videos)  
        ├── Autenticación JWT  
        └── Políticas RLS y seguridad por rol  
        │  
        ▼  
[APIs Externas: Google Maps / Wompi / Email Service]

---

## 🧩 Stack Tecnológico

| Capa | Tecnología | Función principal | Estado |
|------|-------------|-------------------|--------|
| **Frontend** | [Next.js](https://nextjs.org/) + [React](https://react.dev/) + [TailwindCSS](https://tailwindcss.com/) | Interfaz web y dashboards | ⏸️ Pendiente |
| **Backend** | [FastAPI 0.109.0](https://fastapi.tiangolo.com/) en [Fly.io](https://fly.io/) | API REST, lógica de negocio | ✅ Funcional |
| **Base de datos** | [Supabase](https://supabase.com/) (PostgreSQL 15 + PostGIS) | Datos, auth, storage | ✅ Configurado |
| **Validación** | [Pydantic 2.5.3](https://docs.pydantic.dev/) + [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | Schemas y configuración | ✅ Implementado |
| **Testing** | [Pytest 7.4.4](https://pytest.org/) + [pytest-mock](https://pytest-mock.readthedocs.io/) | Tests unitarios y de integración | ✅ Implementado |
| **Infraestructura** | [Vercel](https://vercel.com/), [Fly.io](https://fly.io/) | Hosting y despliegue continuo | ⏳ Local por ahora |
| **Geolocalización** | [Google Maps Platform](https://developers.google.com/maps) | Rutas, ubicación de técnicos | ⏳ Pendiente |
| **Pagos** | [Wompi](https://wompi.co/) o [Stripe](https://stripe.com/) | Procesamiento de pagos | ⏳ Pendiente |
| **Control de versiones** | [Git + GitHub](https://github.com/) | Gestión del código y CI/CD | ✅ Activo |

---

## 🧱 Estructura del Proyecto

```
tec360-seguridad/
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # ✅ Punto de entrada de FastAPI
│   │   ├── api/                       # ✅ Rutas (endpoints)
│   │   │   ├── __init__.py
│   │   │   ├── example.py            # ✅ Endpoints de ejemplo
│   │   │   └── services.py           # ✅ CRUD de servicios (NEW)
│   │   ├── core/                      # ✅ Configuración
│   │   │   ├── __init__.py
│   │   │   ├── config.py             # ✅ Settings con Pydantic
│   │   │   └── security.py           # ✅ Auth y dependencias JWT
│   │   ├── models/                    # ⏸️ ORM (no usado por ahora)
│   │   │   └── __init__.py
│   │   ├── schemas/                   # ✅ Validaciones con Pydantic
│   │   │   ├── __init__.py
│   │   │   └── service.py            # ✅ Schemas de servicios (NEW)
│   │   └── services/                  # ✅ Lógica de negocio
│   │       ├── __init__.py
│   │       └── service_service.py    # ✅ Service layer de servicios (NEW)
│   ├── tests/                         # ✅ Pruebas unitarias (Pytest)
│   │   ├── __init__.py
│   │   ├── test_security.py          # ✅ Tests de autenticación
│   │   └── test_services.py          # ✅ Tests de servicios (NEW)
│   └── requirements.txt               # ✅ Dependencias Python
│
├── frontend/                          # ⏸️ No iniciado
│   └── README.md                      # Placeholder
│
├── database/
│   ├── schema_v2_corregido.sql       # ✅ Schema PostgreSQL + PostGIS
│   ├── seed.sql                       # ⏳ Datos de prueba
│   ├── EMERGENCY_CLEANUP.sql         # ✅ Script de limpieza
│   └── ERRORES_Y_CORRECCIONES.md     # ✅ Documentación de errores
│
├── .env.example                       # ✅ Template de variables
├── .gitignore                         # ✅ Configurado para Python + Node
├── README.md                          # ✅ Este archivo
└── docs/
    ├── Informe_Tecnologico_Tec360_Seguridad.pdf
    └── diagramas/
        └── arquitectura.png
```

**Leyenda:**
- ✅ Implementado y funcional
- ⏳ En desarrollo o parcialmente completo
- ⏸️ No iniciado

---

## 🔥 Funcionalidades Implementadas (Backend)

### **✅ Autenticación y Seguridad**
- Autenticación con Supabase Auth (JWT)
- Validación de tokens automática
- Dependencias de FastAPI para proteger rutas
- Control de acceso basado en roles (client, technician, admin)
- Row Level Security (RLS) en Supabase

### **✅ Gestión de Servicios**
- **POST /services** - Crear solicitud de servicio (cliente)
- **GET /services** - Listar servicios con paginación y filtros
- **GET /services/{id}** - Detalle completo de un servicio
- **PATCH /services/{id}** - Actualizar servicio (estado, notas, precios)
- **POST /services/{id}/assign** - Asignar técnico a servicio (admin)
- **GET /services/{id}/nearby-technicians** - Buscar técnicos cercanos con PostGIS
- **DELETE /services/{id}** - Cancelar servicio
- **GET /services/stats/summary** - Estadísticas por usuario

### **✅ Base de Datos**
- **5 Tablas principales**: users, technicians, services, service_ratings, service_images
- **3 ENUMs personalizados**: user_role, service_status, service_type
- **PostGIS habilitado** para geolocalización
- **Triggers automáticos**:
  - Creación de perfil al registrarse
  - Actualización de `updated_at` automática
  - Recalculo de rating promedio de técnicos
- **Funciones útiles**:
  - `find_nearby_technicians()` - Busca técnicos en radio definido
  - `calculate_distance_km()` - Calcula distancia entre coordenadas

### **✅ Testing**
- Tests unitarios con pytest
- Mocking de Supabase para tests aislados
- Coverage de endpoints críticos
- Validación de permisos por rol

---

## ⚙️ Instalación y Ejecución Local

### 1️⃣ Clonar el repositorio
```bash
git clone https://github.com/tuusuario/tec360-seguridad.git
cd tec360-seguridad
```

### 2️⃣ Configurar entorno virtual (backend)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3️⃣ Variables de entorno
Copia `.env.example` a `.env` y configura:

```env
# Entorno
ENVIRONMENT=development
DEBUG=True

# Seguridad
SECRET_KEY=cambiar-en-produccion-super-secreto-123

# Supabase (obtener desde Supabase Dashboard → Settings → API)
SUPABASE_URL=https://tuproyecto.supabase.co
SUPABASE_KEY=eyJhbGc...  # anon public key
SUPABASE_SERVICE_KEY=eyJhbGc...  # service_role key (⚠️ secreto)

# Database (opcional, Supabase ya provee esto)
DATABASE_URL=postgresql://postgres:[password]@db.tuproyecto.supabase.co:5432/postgres

# APIs Externas (por ahora vacío)
GOOGLE_MAPS_API_KEY=
WOMPI_API_KEY=

# Servidor
HOST=0.0.0.0
PORT=8000
```

### 4️⃣ Configurar Supabase
1. Crea un proyecto en [Supabase](https://supabase.com/)
2. Ve a **SQL Editor** → **New Query**
3. Copia y ejecuta `database/schema_v2_corregido.sql`
4. Verifica que aparezca: `✅ INSTALACIÓN COMPLETA Y EXITOSA`

### 5️⃣ Ejecutar backend
```bash
# Desde backend/ con venv activado
uvicorn app.main:app --reload
```

Accede a:
- 🌐 API: http://localhost:8000
- 📚 Docs interactivas: http://localhost:8000/docs
- 📖 ReDoc: http://localhost:8000/redoc

### 6️⃣ Ejecutar tests
```bash
# Desde backend/ con venv activado
pytest tests/ -v
```

### 7️⃣ Ejecutar frontend (cuando esté disponible)
```bash
cd frontend
npm install
npm run dev
```
👉 http://localhost:3000

---

## 🧪 Testing

### Ejecutar todos los tests
```bash
cd backend
pytest -v
```

### Ejecutar tests específicos
```bash
pytest tests/test_security.py -v
pytest tests/test_services.py -v
```

### Ver coverage
```bash
pytest --cov=app --cov-report=html
# Abre htmlcov/index.html en el navegador
```

---

## 📡 API Endpoints Disponibles

### **Autenticación (manejada por Supabase)**
- Los usuarios se registran/loguean en Supabase Auth
- El backend valida tokens JWT automáticamente

### **Endpoints Públicos**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/services/types` | Lista tipos de servicio disponibles |

### **Endpoints Protegidos - Servicios**
| Método | Endpoint | Rol Requerido | Descripción |
|--------|----------|---------------|-------------|
| POST | `/services` | client | Crear solicitud de servicio |
| GET | `/services` | Todos | Listar servicios (filtrado por usuario/rol) |
| GET | `/services/{id}` | Dueño/Admin | Detalle de servicio |
| PATCH | `/services/{id}` | Dueño/Admin | Actualizar servicio |
| POST | `/services/{id}/assign` | admin | Asignar técnico |
| GET | `/services/{id}/nearby-technicians` | admin/client | Buscar técnicos cercanos |
| DELETE | `/services/{id}` | client/admin | Cancelar servicio |
| GET | `/services/stats/summary` | Todos | Estadísticas del usuario |

### **Endpoints de Ejemplo (desarrollo)**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/example/public` | Ruta pública de prueba |
| GET | `/example/protected` | Requiere autenticación |
| GET | `/example/admin-only` | Solo rol admin |

---

## ☁️ Despliegue

### **Vercel (Frontend)** - ⏸️ Pendiente
1. Conecta tu repositorio en [Vercel Dashboard](https://vercel.com/)
2. Configura las variables de entorno
3. Cada push a `main` genera un despliegue automático

### **Fly.io (Backend)** - ⏳ Por configurar
```bash
# Instalar CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Crear app (primera vez)
cd backend
flyctl launch

# Configurar secrets
flyctl secrets set SUPABASE_URL=https://...
flyctl secrets set SUPABASE_SERVICE_KEY=eyJhbGc...
flyctl secrets set SECRET_KEY=tu-secret-key

# Desplegar
flyctl deploy
```

### **Supabase (Base de datos y Auth)** - ✅ Configurado
1. Proyecto creado en [Supabase](https://supabase.com/)
2. Schema ejecutado (`schema_v2_corregido.sql`)
3. Autenticación por email/password habilitada
4. RLS y triggers activos

---

## 💰 Costos Estimados (por mes)

| Escenario | Usuarios | Servicios/mes | Costo Estimado (USD/mes) |
|-----------|----------|---------------|--------------------------|
| **PMV Inicial** | ~100 | ~500 | **$0 - $10** |
| **Uso Real** | ~1,000 | ~5,000 | **$10 - $30** |
| **Escalamiento** | ~10,000 | ~50,000 | **$50 - $150** |
| **Ciudad completa** | 100,000+ | 500,000+ | **$100 - $500** |

**Desglose por servicio:**
- **Fly.io**: $0 (free tier) hasta $5/mes (shared-cpu-1x)
- **Supabase**: $0 (free tier) hasta $25/mes (Pro)
- **Vercel**: $0 (hobby) hasta $20/mes (Pro)
- **Google Maps**: Pay-as-you-go (primeros $200 gratis/mes)

> Estimaciones basadas en uso moderado. Los costos reales dependen del tráfico.

---

## 🔒 Seguridad y Buenas Prácticas

### **Implementado:**
- ✅ Autenticación con JWT via Supabase Auth
- ✅ Roles diferenciados (client, technician, admin)
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Validación de datos con Pydantic
- ✅ CORS configurado para orígenes permitidos
- ✅ Variables de entorno para secretos
- ✅ `.gitignore` configurado (no sube `.env` ni credenciales)

### **Pendiente:**
- ⏳ Rate limiting en endpoints
- ⏳ HTTPS forzado en producción (automático en Fly.io/Vercel)
- ⏳ Logging centralizado (Fly.io logs + Supabase logs)
- ⏳ Monitoreo de errores (Sentry o similar)
- ⏳ Backups automáticos de BD (Supabase Pro)

---

## 📈 Escalamiento Futuro

### **Fase 1: PMV (Actual)**
- Stack: Fly.io + Supabase + Vercel
- Costo: $0 - $30/mes
- Capacidad: ~1,000 usuarios activos

### **Fase 2: Preincubación**
- Agregar caching (Redis)
- CDN para assets estáticos
- Optimización de queries
- Monitoreo y alertas
- Costo estimado: $50 - $100/mes

### **Fase 3: Escalamiento Nacional**
- Evaluación de migración a AWS/GCP/Azure
- Microservicios si es necesario
- Load balancing multi-región
- Auto-scaling
- Costo variable según demanda

---

## 🛠️ Troubleshooting

### **Error: "SUPABASE_SERVICE_KEY no está configurada"**
- Verifica que el `.env` exista y tenga todas las variables
- Asegúrate de usar `service_role` key, no `anon` key

### **Error: "type user_role does not exist"**
- El schema no se ejecutó correctamente
- Ejecuta `database/EMERGENCY_CLEANUP.sql` y luego `schema_v2_corregido.sql`

### **Tests fallan con "ModuleNotFoundError"**
- Verifica que el `venv` esté activado: `source venv/bin/activate`
- Reinstala dependencias: `pip install -r requirements.txt`

### **Backend no inicia**
- Verifica logs: `uvicorn app.main:app --reload --log-level debug`
- Revisa que todas las dependencias estén instaladas
- Confirma que `.env` tenga las variables correctas

---

## 📚 Documentación Adicional

- 📄 **Schema de BD**: `database/schema_v2_corregido.sql`
- 🧹 **Script de limpieza**: `database/EMERGENCY_CLEANUP.sql`
- 📝 **Errores conocidos**: `database/ERRORES_Y_CORRECCIONES.md`
- 📊 **Informe técnico**: `docs/Informe_Tecnologico_Tec360_Seguridad.pdf`
- 🗺️ **Diagramas**: `docs/diagramas/arquitectura.png`
- 🧪 **Tests**: `backend/tests/`

---

## 🗓️ Roadmap de Desarrollo

### **✅ Sprint 1 (Completado)**
- [x] Estructura base del proyecto
- [x] Autenticación con Supabase
- [x] Schema de base de datos con PostGIS
- [x] CRUD completo de servicios
- [x] Tests unitarios básicos

### **⏳ Sprint 2 (En progreso)**
- [ ] Endpoints de técnicos (perfiles, búsqueda)
- [ ] Sistema de calificaciones
- [ ] Integración Google Maps
- [ ] Subida de imágenes a Supabase Storage

### **🎯 Sprint 3 (Planeado)**
- [ ] Frontend con Next.js
- [ ] Dashboard de cliente
- [ ] Dashboard de técnico
- [ ] Panel de administración

### **🚀 Sprint 4 (Futuro)**
- [ ] App móvil (React Native/Flutter)
- [ ] Notificaciones push
- [ ] Integración de pagos (Wompi)
- [ ] Sistema de facturación

---

## 👥 Contribuir

Este es un proyecto en desarrollo activo. Si quieres contribuir:

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

### **Convenciones de commits:**
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `test:` - Agregar o modificar tests
- `refactor:` - Refactorización de código
- `chore:` - Tareas de mantenimiento

---

## 👨‍💻 Autor

**Oscar Nelson Vásquez Mieles**  
Líder del emprendimiento **Tec360 Seguridad**  
📧 Email: oscarvasquezbroker@gmail.com  
🏢 Operado en la **Ruta del Emprendimiento 2025** por **Créame Incubadora de Empresas**

---

## ⚡ Licencia

Este proyecto se distribuye bajo licencia **MIT**.  
Eres libre de usar, modificar y compartir siempre que se conserve la atribución original.

---

## 📞 Soporte

¿Tienes preguntas o problemas?
1. Revisa la sección de [Troubleshooting](#-troubleshooting)
2. Consulta la documentación en `/docs`
3. Abre un issue en GitHub
4. Contacta al equipo: oscarvasquezbroker@gmail.com

---

**Última actualización**: Diciembre 2024  
**Versión**: 0.1.0 (MVP en desarrollo)
