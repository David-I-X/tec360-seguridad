# 🚀 Tec360 Seguridad

**Tec360 Seguridad** es una plataforma web y móvil que conecta usuarios con técnicos certificados del SENA para la instalación y mantenimiento de sistemas de seguridad (GPS, alarmas, cámaras, etc.) en toda Colombia.  
El proyecto integra un ecosistema **web + app móvil + backend + base de datos + APIs externas** bajo un modelo escalable, moderno y con costos iniciales mínimos.

---

## 🧠 Objetivo del Proyecto

Desarrollar un **Producto Mínimo Viable (PMV)** que permita:
- Gestionar usuarios y técnicos (autenticación y roles).
- Crear, asignar y monitorear servicios técnicos en tiempo real.
- Ofrecer trazabilidad GPS, calificación, facturación y soporte multimedia.
- Escalar hacia un modelo SaaS para empresas de seguridad y logística.

---

## 🏗️ Arquitectura del Sistema

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

| Capa | Tecnología | Función principal |
|------|-------------|------------------|
| **Frontend** | [Next.js](https://nextjs.org/) + [React](https://react.dev/) + [TailwindCSS](https://tailwindcss.com/) | Interfaz web y dashboards |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/) desplegado en [Fly.io](https://fly.io/) | API REST, lógica de negocio, integración externa |
| **Base de datos** | [Supabase (PostgreSQL + PostGIS)](https://supabase.com/) | Datos, autenticación y almacenamiento |
| **Infraestructura** | [Vercel](https://vercel.com/), [Fly.io](https://fly.io/) | Hosting y despliegue continuo |
| **Geolocalización** | [Google Maps Platform](https://developers.google.com/maps) | Rutas, ubicación de técnicos y clientes |
| **Pagos** | [Wompi](https://wompi.co/) o [Stripe](https://stripe.com/) | Procesamiento de pagos y facturación |
| **Control de versiones** | [Git + GitHub](https://github.com/) | Gestión del código y CI/CD |

---

## 🧱 Estructura del Proyecto

```
tec360-seguridad/
│
├── backend/
│   ├── app/
│   │   ├── main.py              # Punto de entrada de FastAPI
│   │   ├── api/                 # Rutas (endpoints)
│   │   ├── core/                # Configuración (CORS, JWT, DB)
│   │   ├── models/              # ORM con SQLAlchemy
│   │   ├── schemas/             # Validaciones con Pydantic
│   │   └── services/            # Integraciones externas (Wompi, Maps)
│   ├── tests/                   # Pruebas unitarias (Pytest)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # Rutas de Next.js
│   │   ├── components/          # UI reutilizable
│   │   ├── hooks/               # Custom hooks (fetch, auth, etc.)
│   │   ├── lib/                 # Configuración API y helpers
│   │   └── styles/              # TailwindCSS
│   └── package.json
│
├── database/
│   ├── schema.sql               # Estructura inicial Supabase
│   └── seed.sql                 # Datos de prueba
│
├── .env.example                 # Variables de entorno
├── docker-compose.yml           # (Opcional, para entorno local)
├── README.md
└── docs/
    ├── Informe_Tecnologico_Tec360_Seguridad.pdf
    └── diagramas/
        └── arquitectura.png
```

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
source venv/bin/activate
pip install -r requirements.txt
```

### 3️⃣ Variables de entorno
Crea un archivo `.env` en la raíz del proyecto con las siguientes claves:

```env
# Backend
API_URL=https://tec360-backend.fly.dev
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/tec360
JWT_SECRET=supersecreto
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_KEY=public_key
GOOGLE_MAPS_API_KEY=tu_api_key
WOMPI_API_KEY=tu_api_key
```

### 4️⃣ Ejecutar backend
```bash
uvicorn app.main:app --reload
```

### 5️⃣ Ejecutar frontend
```bash
cd frontend
npm install
npm run dev
```
Accede en tu navegador a:  
👉 http://localhost:3000

---

## ☁️ Despliegue

### **Vercel (Frontend)**
1. Conecta tu repositorio en [Vercel Dashboard](https://vercel.com/).  
2. Configura las variables de entorno desde el panel.  
3. Cada push a `main` genera un despliegue automático.

### **Fly.io (Backend)**
1. Instala la CLI: `flyctl auth signup`
2. Crea la app: `flyctl launch` y selecciona tu carpeta `backend/`.
3. Define las variables del `.env` con `flyctl secrets set`.
4. Despliega con: `flyctl deploy`.

### **Supabase (Base de datos y Auth)**
1. Crea un proyecto en [Supabase](https://supabase.com/).  
2. Configura la base de datos (PostgreSQL + PostGIS).  
3. Activa autenticación por email/password o magic links.

---

## 💰 Costos Estimados (por mes)

| Escenario | Usuarios | Costo Estimado (USD/mes) |
|------------|-----------|--------------------------|
| PMV Inicial | 100 | 0 – 10 |
| Uso Real | 1,000 | 10 – 30 |
| Escalamiento (Ciudad) | 100,000+ | 100 – 500 |

> Estimaciones combinadas de Vercel, Fly.io y Supabase con uso moderado.

---

## 🔐 Seguridad y Buenas Prácticas

- Autenticación con JWT y roles (cliente, técnico, administrador).  
- Políticas RLS activadas en Supabase.  
- HTTPS forzado en todos los entornos.  
- Logs centralizados y monitoreo básico con Supabase y Fly.io.  
- Pruebas unitarias y de integración en cada commit.

---

## 📈 Escalamiento futuro

Etapas previstas:
1. **PMV (Fly.io + Supabase + Vercel)**  
   Arquitectura gratuita o de muy bajo costo.  
2. **Preincubación (Optimización y APIs adicionales)**  
   Agregar microservicios, caching y mejoras de rendimiento.  
3. **Escalamiento nacional (Migración parcial o híbrida)**  
   Evaluar migración del backend hacia **AWS**, **Azure** o **Google Cloud** según conveniencia de rendimiento, disponibilidad regional o requerimientos de integración empresarial.

---

## 📚 Documentación adicional

- 📄 `docs/Informe_Tecnologico_Tec360_Seguridad.pdf`
- 🧭 Diagramas arquitectónicos en `/docs/diagramas/`
- 🧠 Wiki de desarrollo (pendiente de crear en GitHub)

---

## 👨‍💻 Autor

**Oscar Nelson Vásquez Mieles**  
Líder del emprendimiento **Tec360 Seguridad**  
Email: oscarvasquezbroker@gmail.com  
Operado en la Ruta del Emprendimiento 2025 por **Créame Incubadora de Empresas**

---

### ⚡ Licencia
Este proyecto se distribuye bajo licencia **MIT**.  
Eres libre de usar, modificar y compartir siempre que se conserve la atribución original.

