# Tec360 Seguridad - Backend

Backend API construido con **FastAPI** y **Supabase**.

---

## 🚀 Inicio rápido

### 1. Crear entorno virtual
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
Copia `.env.example` a `.env` y completa las credenciales de Supabase:
```bash
cp ../.env.example ../.env
```

### 4. Ejecutar servidor de desarrollo
```bash
uvicorn app.main:app --reload
```

El servidor estará disponible en: **http://localhost:8000**

---

## 📚 Documentación de la API

Una vez iniciado el servidor, accede a:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🧪 Testing

```bash
pytest -v
```

---

## 📁 Estructura

```
backend/
├── app/
│   ├── main.py          # Entry point de FastAPI
│   ├── api/             # Endpoints (rutas)
│   ├── core/            # Configuración y utilidades
│   ├── models/          # Modelos de base de datos
│   ├── schemas/         # Validaciones Pydantic
│   └── services/        # Lógica de negocio e integraciones
├── tests/               # Tests con Pytest
└── requirements.txt
```

---

## 🔐 Autenticación

Este proyecto usa **Supabase Auth**, lo que significa:
- Los usuarios se registran/loguean directamente contra Supabase
- El backend valida tokens JWT generados por Supabase
- No necesitamos manejar passwords localmente

---

## 🛠️ Comandos útiles

### Instalar dependencia nueva
```bash
pip install nombre-paquete
pip freeze > requirements.txt
```

### Ejecutar con hot-reload
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Ver logs detallados
```bash
uvicorn app.main:app --reload --log-level debug
```