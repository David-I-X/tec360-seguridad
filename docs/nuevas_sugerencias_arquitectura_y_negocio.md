# 🚀 Tec360 Seguridad — Nuevas Sugerencias de Arquitectura, Operación y Negocio

Este documento consolida las decisiones estratégicas, técnicas y de modelo de negocio acordadas para optimizar los costos de operación, maximizar la confianza institucional y permitir una gestión ágil y automatizada para el fundador.

---

## 📑 Tabla de Contenido
1. [Alternativas a Twilio para Autenticación OTP (Sin recargas mínimas altas)](#1-alternativas-a-twilio-para-autenticación-otp)
2. [Póliza Colectiva de Responsabilidad Civil con SURA](#2-póliza-colectiva-de-responsabilidad-civil-con-sura)
3. [Modelo de Billetera Prepago con Factus Pay ($800 COP)](#3-modelo-de-billetera-prepago-con-factus-pay)
4. [Experiencia de Pago Corporativa: Liquidación Oficial y Certificado](#4-experiencia-de-pago-corporativa-liquidación-oficial-y-certificado)
5. [Automatizaciones Estratégicas con n8n](#5-automatizaciones-estratégicas-con-n8n)
6. [Hoja de Ruta de Implementación Técnica](#6-hoja-de-ruta-de-implementación-técnica)

---

## 1. Alternativas a Twilio para Autenticación OTP

### 🚨 El Problema con Twilio
* **Recarga mínima forzada:** Twilio exige una recarga mínima con tarjeta de crédito de **$20 USD** (aprox. $85.000 - $90.000 COP) que queda retenida como saldo prepago.
* **Costo por SMS alto:** El costo de envío a operadores colombianos suele oscilar entre **$0.04 y $0.06 USD por SMS** (~$180 a $260 COP cada mensaje).

---

### 🔍 Opciones Investigadas (Sin recargas mínimas abusivas)

### Opción A: Háblame Colombia (`hablame.co`) ⭐ *Mejor opción nacional*
* **¿Qué es?:** Proveedor colombiano especializado en telecomunicaciones y mensajería masiva/transaccional con API REST para desarrolladores.
* **Política de recarga:**
  * **Sin recargas mínimas altas en dólares:** Permite recargas flexibles en pesos colombianos vía **PSE**, tarjetas locales o corresponsales (desde $10.000 o $20.000 COP).
  * Saldo sin vencimiento forzoso restrictivo.
* **Costo por mensaje:**
  * Alrededor de **$15 a $30 COP por SMS prioritario/OTP** (frente a los ~$200 COP de Twilio). Es hasta **8 veces más económico**.
* **Integración:**
  * API REST sencilla con soporte de endpoints para envío transaccional inmediato y verificación.
  * Documentación en español y soporte local.

### Opción B: Firebase Phone Authentication (Google Identity Platform) ⭐ *Opción 100% gratuita para iniciar*
* **¿Qué es?:** Sistema de autenticación de números telefónicos de Google integrado en Firebase.
* **Política de costo:**
  * **10.000 SMS de verificación GRATIS al mes** en el nivel gratuito (Plan Spark/Blaze).
  * **Recarga mínima:** **$0 COP**. No te congelan dinero en saldo prepago.
  * Si superas los 10.000 SMS/mes, se factura mes vencido únicamente el excedente por tarjeta.
* **Integración:**
  * Se integra en el frontend (Next.js y React Native Expo) usando el widget invisible de reCAPTCHA / SDK de Firebase.
  * El frontend recibe un `idToken` de Firebase verificado y lo envía a FastAPI (`backend`), donde se valida con `firebase-admin` en Python para generar el JWT de sesión de Tec360.

### Opción C: Código OTP vía WhatsApp (Meta Cloud API / Evolution API)
* **¿Qué es?:** Enviar el código de 6 dígitos directamente a la app de WhatsApp del usuario.
* **Ventajas en Colombia:**
  * La tasa de apertura y velocidad de entrega en WhatsApp en Colombia es del 99%.
  * **Meta Cloud API:** Ofrece hasta **1.000 conversaciones de servicio gratuitas cada mes**.
  * **Evolution API (Self-hosted):** Puede correr en el mismo servidor de Tec360 en Docker enviando mensajes sin costo por mensaje.

### Opción D: AWS SNS (Amazon Web Services)
* **Política de cobro:** Pos-pago estricto (no exige recargar saldo). Si en el mes envías 10 mensajes, al cierre de mes te cobran exactamente los $0.40 USD consumidos a tu tarjeta.
* **Desventaja:** La tasa de entrega de SMS a operadores de Colombia por AWS requiere registros de remitente para evitar filtros de spam de Claro/Tigo/Movistar.

> 💡 **Recomendación para Tec360:**
> 1. Para **costo $0 absoluto hoy**: Implementar **Firebase Phone Auth** (10.000 SMS gratis al mes).
> 2. Para **SMS puro tradicional sin depender de Google**: Integrar la API de **Háblame Colombia**, recargando $15.000 o $20.000 COP por PSE según se necesite.

---

## 2. Póliza Colectiva de Responsabilidad Civil con SURA

Para evitar descapitalizarse creando un fondo de garantía interno, se adopta una **Póliza Colectiva de Responsabilidad Civil Extracontractual (RCE)** con Seguros SURA:

### Estructura de la Póliza
* **Tomador:** Tec360 Seguridad (persona jurídica o titular de la plataforma).
* **Asegurados:** Técnicos certificados por el SENA mientras prestan el servicio y vehículos de los clientes bajo intervención.
* **Amparos clave:**
  1. *Predios, labores y operaciones.*
  2. *Vehículos bajo cuidado, tenencia y control* (amparo contra daños eléctricos, computadoras de a bordo/ECU, cableado o accesorios durante la instalación).
  3. *Contratistas y subcontratistas independientes.*

### Esquema de Costos y Trazabilidad
* **Modelo por Declaración Mensual:** SURA asigna una tarifa fija por servicio reportado (estimada entre **$3.000 y $5.500 COP** por orden).
* **Cero riesgo de caja:** Si en un mes se realizan 15 servicios, solo se pagan 15 seguros.
* **Financiación de la póliza:** El costo se traslada al cliente dentro del valor de la cotización o se descuenta de la comisión de la plataforma.

### Soporte en el Código (`backend`)
* Campos en base de datos (`Service` o tabla `service_insurances`):
  * `insurance_provider`: `"SURA"`
  * `insurance_cost`: `5000.0`
  * `insurance_status`: `pending_report` | `reported` | `invoiced`
* Endpoint administrativo que genera un reporte CSV mensual con un solo clic con los datos que exige SURA (Placa, Cédula Cliente, Cédula Técnico, Fecha y Valor Asegurado).

---

## 3. Modelo de Billetera Prepago con Factus Pay ($800 COP)

Para monetizar la plataforma sin asumir la custodia de dinero ajeno ni lidiar con dispersiones bancarias complejas (*Split Payments*), se adopta el modelo de **saldo prepago (estilo inDriver / Picap)**:

### Funcionamiento
1. **Recarga del técnico:** El técnico compra créditos en la app para poder cotizar y tomar servicios (ej. recarga $50.000 o $100.000 COP).
2. **Uso de Factus Pay:**
   * La recarga se hace mediante **Factus Pay sobre la red Bre-B** (código QR instantáneo desde cualquier banco/Nequi).
   * **Costo transaccional:** Tarifa plana fija de **$800 COP** por recarga, sin importar si recarga $30.000 o $200.000 COP.
   * **Facturación automática:** Factus emite de forma nativa la factura electrónica DIAN de Tec360 al técnico por concepto de *"Comisión por intermediación tecnológica"*.
3. **Estrategia para evitar barrera de entrada:**
   * Al registrarse, se le otorgan al técnico **$15.000 COP en saldo de bienvenida promocional**, permitiéndole hacer sus primeros 1 o 2 servicios gratis antes de requerir su primera recarga.

---

## 4. Experiencia de Pago Corporativa: Liquidación Oficial y Certificado

Para que Tec360 tenga presencia de marca y genere máxima confianza en ambas partes **sin recaudar el dinero del servicio**:

### El Flujo de Liquidación en Campo
1. **Técnico finaliza el trabajo:** Sube las fotos obligatorias de evidencia (`before`, `during`, `after`) en su app.
2. **Pantalla Oficial de Liquidación en el celular del cliente:**
   * La app de Tec360 muestra una interfaz corporativa con membrete:
     * Nombre del técnico y certificado SENA validado.
     * Placa del vehículo y detalle de instalación.
     * Monto total pactado (ej. $100.000 COP).
     * **Datos de cobro oficiales del técnico:** Muestra el código QR de Nequi/Bre-B registrado por el técnico en su perfil, enmarcado dentro del diseño institucional de Tec360.
3. **Pago directo:** El cliente escanea el QR desde su banco o entrega el efectivo al técnico.
4. **Confirmación bidireccional:**
   * El cliente presiona: *“Confirmar Pago Realizado”*.
   * El técnico presiona: *“Pago Recibido”*.
5. **Deducción automática:** El backend descuenta de la billetera prepago del técnico la comisión de la plataforma y el valor de la póliza SURA.
6. **El Entregable de Confianza:** La app genera de inmediato el **Certificado Digital de Garantía Tec360 y Póliza SURA (PDF)** para que el cliente lo guarde en su celular.

---

## 5. Automatizaciones Estratégicas con n8n

Para que el fundador no dependa de estar pegado al computador durante su jornada laboral de ventas, se definen los siguientes flujos de **n8n (Open Source / $0 costo de licencia)**:

| Flujo | Disparador | Acción Automatizada | Beneficio |
| :--- | :--- | :--- | :--- |
| **Despachador WhatsApp 24/7** | Nuevo servicio creado en la web | Enviar WhatsApp al cliente confirmando recepción y alertar a técnicos de la zona en Telegram con enlace a cotizar. | Cero pérdida de clientes por demora en respuesta. |
| **Secretario Ejecutivo (Telegram)** | Técnico sube documentos o se reporta un incidente | Enviar notificación con botones de acción al Telegram personal del fundador. | Control operativo del negocio desde el celular en 30 segundos. |
| **Conciliación Mensual SURA** | Cron el día 1 de cada mes | Extrae servicios completados en PostgreSQL, crea el Excel con el formato de SURA y lo envía por correo al asesor. | Ahorro de 4 horas de trabajo manual contable. |
| **Auditoría Post-Servicio** | 24 horas después de completar servicio | Pregunta al cliente por WhatsApp sobre el estado del vehículo y solicita reseña en Google Maps si fue positivo. | Control de calidad y detección temprana de fallas. |

---

## 6. Hoja de Ruta de Implementación Técnica

### Fase 1: Autenticación y Billetera Prepago
- [ ] Configurar **Firebase Phone Auth** o **Háblame Colombia** en reemplazo del endpoint de Twilio para eliminar la recarga mínima de $20 USD.
- [ ] Agregar tabla/campos de billetera (`wallet_balance`, `transactions`) en el modelo del técnico.
- [ ] Implementar la pantalla de registro de datos de cobro del técnico (QR Bre-B / Nequi / Cuenta bancaria).

### Fase 2: Experiencia de Liquidación y Certificados
- [ ] Diseñar la pantalla de *Liquidación Oficial Tec360* en el detalle del servicio para el cliente.
- [ ] Crear el generador de PDF para el *Certificado de Garantía Tec360 + Póliza Colectiva SURA*.
- [ ] Conectar la confirmación bidireccional de pago con la deducción de comisión del saldo del técnico.

### Fase 3: Integración Factus Pay y n8n
- [ ] Crear el endpoint de recarga de saldo del técnico conectando la API de **Factus Pay** (generación de QR Bre-B a $800 COP).
- [ ] Desplegar contenedor de **n8n** en el servidor de DigitalOcean y configurar los webhooks básicos de notificación hacia Telegram y WhatsApp.
