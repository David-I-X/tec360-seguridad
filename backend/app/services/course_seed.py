import logging
from sqlmodel import Session, select
from app.models.course import Course, Lesson, CourseQuiz, CourseCategory, CourseDifficulty

logger = logging.getLogger(__name__)

INITIAL_COURSES = [
    {
        "title": "Fundamentos de Instalación y Seguridad Tec360",
        "slug": "fundamentos-instalacion-seguridad",
        "category": CourseCategory.basicos.value,
        "difficulty": CourseDifficulty.beginner.value,
        "estimated_hours": 2,
        "is_published": True,
        "is_paid": False,
        "price": 0.0,
        "is_required_for_technicians": True,
        "rank_points_reward": 25,
        "badge_name": "Técnico Verificado Tec360",
        "badge_icon": "shield-check",
        "sort_order": 1,
        "rating": 4.9,
        "description": "Curso obligatorio de inducción y estándares de oro para técnicos de instalación vehicular en la red Tec360.",
        "thumbnail_url": "/images/courses/fundamentos.svg",
        "lessons": [
            {
                "title": "Inducción a la plataforma Tec360 y protocolos de seguridad",
                "slug": "induccion-protocolos-seguridad",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 480,
                "sort_order": 1,
                "is_free_preview": True,
                "content_markdown": "### Protocolos de Oro de Tec360\n\nBienvenido a la Escuela Técnica de Tec360 Seguridad. Como técnico certificado, eres el embajador de la tecnología en el vehículo de cada cliente.\n\n#### Principios Fundamentales\n1. **Inspección Inicial 360°**: Antes de tocar cualquier cable, realiza una inspección visual con el cliente y registra el estado del tablero (check engine, luces de advertencia).\n2. **Desconexión Segura**: Desconecta siempre el borne negativo de la batería antes de manipular ramales principales.\n3. **Calidad de Materiales**: Solo utiliza cinta de tela automotriz Tesa y termorretráctil con adhesivo interno. Prohibida la cinta aislante genérica de PVC.\n4. **Registro de Evidencias**: Sube fotos nítidas del punto de masa, empalmes y ocultamiento para la aprobación de garantía."
            },
            {
                "title": "Herramientas esenciales del instalador automotriz",
                "slug": "herramientas-esenciales-instalador",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 620,
                "sort_order": 2,
                "is_free_preview": False,
                "content_markdown": "### Kit de Herramientas Obligatorio\n\nPara garantizar una instalación limpia y sin riesgos para la computadora del auto:\n\n- **Multímetro Digital Automotriz**: Con impedancia mínima de 10 MΩ para no enviar voltaje accidental a la computadora del motor.\n- **Cautín portátil a gas o batería (60W+)**: Para soldadura con estaño 60/40 en empalmes de corte.\n- **Pelacables de precisión automático**: Evita degollar los hilos de cobre de cables de bajo calibre.\n- **Palancas de desarme de nylon**: Para desmontar plásticos y molduras del tablero sin rayar ni romper grapas.\n- **Pistola de calor portátil**: Para contraer el termorretráctil de manera uniforme."
            },
            {
                "title": "Lectura de diagramas eléctricos básicos y colores de cableado",
                "slug": "lectura-diagramas-electricos-basicos",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 750,
                "sort_order": 3,
                "is_free_preview": False,
                "content_markdown": "### Identificación de Señales en el Switch de Encendido\n\nTodo accesorio de seguridad requiere tres alimentaciones básicas:\n\n1. **BATT+ (+12V Permanente)**: Mantiene 12V continuos aun con el vehículo apagado y la llave afuera.\n2. **IGN (+12V Ignición / Contacto)**: Entrega 12V al girar la llave a ON y se MANTIENE durante el momento de arranque (Crank).\n3. **ACC (+12V Accesorios)**: Entrega 12V en posición de radio pero CAE a 0V en el momento de arranque para proteger equipos.\n4. **GND (Masa / Chasis)**: Siempre fijada con terminal de ojo a un tornillo directo de chasis de acero sin pintura."
            },
            {
                "title": "Protocolo de entrega, pruebas funcionales y evidencia fotográfica",
                "slug": "protocolo-entrega-evidencia",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 510,
                "sort_order": 4,
                "is_free_preview": False,
                "content_markdown": "### Lista de Chequeo Final con el Cliente\n\nAntes de cerrar el servicio en tu App de Técnico:\n\n- Verifica que no queden testigos de falla en el tablero (Airbag, ABS, Check Engine).\n- Comprueba que el radio, vidrios eléctricos y aire acondicionado funcionen normalmente.\n- Realiza una prueba de parada de motor en la app cliente en presencia del usuario.\n- Explica cordialmente al cliente cómo usar el botón de pánico y la geolocalización."
            }
        ],
        "quizzes": [
            {
                "question_text": "¿Cuál es el primer paso antes de intervenir cualquier instalación eléctrica en un vehículo?",
                "options": [
                    "Conectar el multímetro en modo amperímetro directamente al alternador.",
                    "Desconectar el borne negativo de la batería y verificar ausencia de consumo residual.",
                    "Pelar los cables del switch de ignición con un bisturí.",
                    "Encender las luces altas para descargar los capacitores."
                ],
                "correct_option_index": 1,
                "explanation": "Desconectar el borne negativo previene cortocircuitos accidentales y protege los módulos electrónicos del vehículo.",
                "sort_order": 1
            },
            {
                "question_text": "¿Por qué es obligatorio subir fotografías claras de la instalación en Tec360?",
                "options": [
                    "Para compartirlas en redes sociales de los clientes.",
                    "Para validar la calidad técnica, certificar la garantía y habilitar la liquidación del pago.",
                    "Únicamente como respaldo en caso de robo del vehículo.",
                    "No es obligatorio si el cliente firma un papel."
                ],
                "correct_option_index": 1,
                "explanation": "La evidencia fotográfica certifica que los empalmes y componentes cumplen los estándares de seguridad de Tec360.",
                "sort_order": 2
            },
            {
                "question_text": "¿Qué herramienta es indispensable para verificar voltajes sin riesgo de dañar la ECU del vehículo?",
                "options": [
                    "Una bombilla halógena de 55W conectada a masa.",
                    "Un destornillador metálico para generar chispas de prueba.",
                    "Un multímetro digital automotriz de alta impedancia o lámpara lógica LED.",
                    "Cualquier tester casero sin resistencia interna."
                ],
                "correct_option_index": 2,
                "explanation": "Las herramientas de alta impedancia no drenan corriente excesiva de las líneas de señal de la computadora.",
                "sort_order": 3
            },
            {
                "question_text": "¿Qué calibre de cable automotriz de cobre estañado es el recomendado en líneas de alimentación principal de seguridad?",
                "options": [
                    "Calibre 28 AWG de cable telefónico.",
                    "Calibre 16 o 18 AWG automotriz tipo GPT / TXL de cobre resistente a temperatura.",
                    "Alambre rígido de construcción de 2.5 mm.",
                    "Cable dúplex transparente de audio."
                ],
                "correct_option_index": 1,
                "explanation": "El cable automotriz 16-18 AWG ofrece la resistencia mecánica y disipación térmica necesaria en vehículos.",
                "sort_order": 4
            }
        ]
    },
    {
        "title": "Instalación Profesional de GPS 4G y Corte de Corriente",
        "slug": "instalacion-profesional-gps-4g",
        "category": CourseCategory.gps_alarmas.value,
        "difficulty": CourseDifficulty.intermediate.value,
        "estimated_hours": 3,
        "is_published": True,
        "is_paid": False,
        "price": 0.0,
        "is_required_for_technicians": True,
        "rank_points_reward": 35,
        "badge_name": "Especialista GPS 4G",
        "badge_icon": "radio",
        "sort_order": 2,
        "rating": 5.0,
        "description": "Domina la instalación de dispositivos de rastreo satelital LTE Cat-M1/4G, cableado de corte de ignición con relé y comandos de configuración.",
        "thumbnail_url": "/images/courses/gps-4g.svg",
        "lessons": [
            {
                "title": "Arquitectura de un rastreador 4G: módem, antenas y consumo",
                "slug": "arquitectura-rastreador-4g",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 600,
                "sort_order": 1,
                "is_free_preview": True,
                "content_markdown": "### Componentes Internos del Dispositivo GPS\n\n- **Módulo GNSS**: Recepción satelital multiconstelación (GPS, GLONASS, Galileo, BeiDou).\n- **Módem LTE 4G / Cat-M1**: Transmisión de telemetría por red celular con fallback a 2G.\n- **Batería de Respaldo Li-Ion**: Permite enviar alertas de desconexión de batería del vehículo.\n- **Acelerómetro de 3 ejes**: Detección de impacto (crash), remolque y frenadas bruscas."
            },
            {
                "title": "Conexión y activación de relé de corte de motor (Ignición vs Bomba)",
                "slug": "conexion-activacion-rele-corte",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 920,
                "sort_order": 2,
                "is_free_preview": False,
                "content_markdown": "### Conexión del Relé de 5 Pines\n\nDiagrama de conexiones estándar:\n- **Pin 85**: Salida negativa de corte del GPS (cable amarillo).\n- **Pin 86**: Señal de ignición +12V (cable blanco del relé).\n- **Pin 30 y Pin 87a (Normalmente Cerrado)**: En serie con la línea interrumpida (Ignición de bobina o bomba).\n- **Pin 87**: Queda sin conexión aislada con termorretráctil."
            },
            {
                "title": "Comandos SMS, configuración APN y enlace con el servidor Tec360",
                "slug": "comandos-sms-configuracion-servidor",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 540,
                "sort_order": 3,
                "is_free_preview": False,
                "content_markdown": "### Enlace Telemático en Tiempo Real\n\nConfigura el operador y el puerto de telemetría Tec360:\n- APN Claro: `internet.comcel.com.co`\n- APN Movistar: `internet.movistar.com.co`\n- APN Tigo: `web.colombiamovil.com.co`\n- Servidor: `gps.tec-360.tech` / Puerto TCP: `5013`"
            },
            {
                "title": "Ubicaciones estratégicas de ocultamiento táctico en cabina",
                "slug": "ubicaciones-estrategicas-ocultamiento",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 680,
                "sort_order": 4,
                "is_free_preview": False,
                "content_markdown": "### Ocultamiento Táctico Antirrobo\n\nUn delincuente busca un GPS en los primeros 60 segundos bajo el volante:\n- **Zonas prohibidas**: Directamente sobre el conector OBD-II o pegado a la caja de fusibles principal.\n- **Zonas tácticas recomendadas**: Detrás del climatizador central, en parantes traseros C o D, o integrado en el mazo original de cables encintado de fábrica."
            }
        ],
        "quizzes": [
            {
                "question_text": "¿Qué tipo de relé se utiliza habitualmente para el corte de ignición seguro?",
                "options": [
                    "Relé de arranque de 200 Amperios.",
                    "Relé automotriz de 12V/40A de 5 pines con contactos Normalmente Cerrados (30 y 87a).",
                    "Un interruptor manual de palanca colocado en la consola.",
                    "Un fusible térmico de 5A."
                ],
                "correct_option_index": 1,
                "explanation": "El contacto normalmente cerrado (NC 87a) asegura que si el GPS pierde energía, el auto continúe encendido sin apagarse repentinamente.",
                "sort_order": 1
            },
            {
                "question_text": "¿En qué posición deben orientarse las antenas internas del dispositivo GPS?",
                "options": [
                    "Hacia el suelo para captar el asfalto.",
                    "Hacia el cielo despejado, libres de láminas de acero o blindaje metálico directo encima.",
                    "Completamente envuelto en papel aluminio.",
                    "Dentro de una caja de herramientas de hierro."
                ],
                "correct_option_index": 1,
                "explanation": "Las señales satelitales GPS no atraviesan el metal; necesitan una línea de vista hacia el exterior a través de plásticos o vidrios.",
                "sort_order": 2
            },
            {
                "question_text": "¿Por qué NO se debe realizar el corte de corriente súbito a alta velocidad?",
                "options": [
                    "Porque se descarga la batería del GPS.",
                    "Por seguridad vial; el corte de corriente debe realizarse idealmente cuando el vehículo se detiene o a baja velocidad.",
                    "Porque la señal celular se distorsiona.",
                    "No hay problema en cortar motor a cualquier velocidad."
                ],
                "correct_option_index": 1,
                "explanation": "Apagar un motor a 100 km/h anula la dirección hidráulica/asistida y el servofreno, causando riesgo de accidente grave.",
                "sort_order": 3
            },
            {
                "question_text": "¿Qué comando verifica si el GPS tiene señal satelital fija y enlace GPRS activo?",
                "options": [
                    "RESET#",
                    "Comando de estado o STATUS / CHECK según el fabricante del equipo.",
                    "FORMAT ALL#",
                    "POWER OFF#"
                ],
                "correct_option_index": 1,
                "explanation": "El comando de estado reporta el nivel de señal celular (CSQ), número de satélites enganchados y voltaje de batería.",
                "sort_order": 4
            }
        ]
    },
    {
        "title": "Instalación de Dashcams HD y Cámaras Dobles",
        "slug": "instalacion-dashcams-hd",
        "category": CourseCategory.dashcam.value,
        "difficulty": CourseDifficulty.beginner.value,
        "estimated_hours": 2,
        "is_published": True,
        "is_paid": False,
        "price": 0.0,
        "is_required_for_technicians": False,
        "rank_points_reward": 20,
        "badge_name": "Técnico Dashcam HD",
        "badge_icon": "camera",
        "sort_order": 3,
        "rating": 4.8,
        "description": "Instalación oculta de cámaras frontal, trasera y de cabina. Conexión de kit Hardwire a fusilera para modo centinela 24/7 sin agotar batería.",
        "thumbnail_url": "/images/courses/dashcam.svg",
        "lessons": [
            {
                "title": "Tipos de cámaras: frontal, trasera y cabina para flotas",
                "slug": "tipos-camaras-dashcam",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 420,
                "sort_order": 1,
                "is_free_preview": True,
                "content_markdown": "### Variantes de Cámaras de Seguridad\n\n- **Cámara Frontal**: Ángulo amplio (140° a 170°) para registrar colisiones e invasiones de carril.\n- **Cámara Trasera**: Asistencia de parqueo y registro de choques por alcance posterior.\n- **Cámara Infrarroja Interior**: Para transporte de pasajeros y conductores de aplicación."
            },
            {
                "title": "Instalación con Hardwire Kit a caja de fusibles (BATT, ACC, GND)",
                "slug": "instalacion-hardwire-kit-fusibles",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 680,
                "sort_order": 2,
                "is_free_preview": False,
                "content_markdown": "### Conexión de los 3 Hilos del Hardwire Kit\n\n1. **Cable Amarillo (BATT+)**: Conectado con portafusible 'Add-a-Circuit' a un circuito con energía constante (Luz de cortesía o bocina).\n2. **Cable Rojo (ACC)**: Conectado a un circuito activo solo en ignición (Toma de 12V o limpiaparabrisas).\n3. **Cable Negro (GND)**: Tornillo a chasis sin pintura."
            },
            {
                "title": "Enrutamiento estético y seguro de cableado por parantes y empaques",
                "slug": "enrutamiento-estetico-seguro",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 580,
                "sort_order": 3,
                "is_free_preview": False,
                "content_markdown": "### Seguridad con Airbags de Cortina\n\n- **NUNCA cruces el cable de la cámara por delante de la bolsa de aire del parante A.**\n- Retira la moldura del parante y pasa el cable por DETRÁS del airbag sujeto al mazo original con precintos plásticos."
            }
        ],
        "quizzes": [
            {
                "question_text": "¿A qué tipo de circuito se conecta el cable ACC del kit de cableado directo (Hardwire Kit)?",
                "options": [
                    "Directo al polo positivo de la batería sin fusible.",
                    "A un circuito que solo reciba 12V cuando la llave esté en posición de accesorios o contacto.",
                    "A la computadora del airbag.",
                    "A la luz de freno."
                ],
                "correct_option_index": 1,
                "explanation": "La señal ACC le avisa a la dashcam cuándo el vehículo está encendido para cambiar entre modo de conducción y modo centinela.",
                "sort_order": 1
            },
            {
                "question_text": "¿Por qué el cableado de la cámara NUNCA debe pasar por encima del airbag de cortina?",
                "options": [
                    "Porque genera interferencia en la radio AM.",
                    "Porque en caso de impacto la bolsa de aire podría salir bloqueada o expulsar el cable violentamente contra los pasajeros.",
                    "Porque el cable se calienta.",
                    "Porque la cámara no grabaría en HD."
                ],
                "correct_option_index": 1,
                "explanation": "Los airbags se despliegan en milisegundos con fuerza pirotécnica; cualquier cable cruzado enfrente constituye un peligro mortal.",
                "sort_order": 2
            },
            {
                "question_text": "¿Qué característica debe tener la tarjeta MicroSD recomendada para dashcams de grabación continua?",
                "options": [
                    "La más económica de clase 4.",
                    "Tarjeta de alta resistencia ('High Endurance') Clase 10 / U3 con ciclos continuos de sobreescritura.",
                    "Cualquier tarjeta usada de teléfono.",
                    "Tarjeta con adaptador USB."
                ],
                "correct_option_index": 1,
                "explanation": "Las tarjetas 'High Endurance' soportan las altas temperaturas y miles de horas continuas de sobreescritura sin corromperse.",
                "sort_order": 3
            }
        ]
    },
    {
        "title": "Electricidad y Mecánica Automotriz para Instaladores",
        "slug": "electricidad-mecanica-automotriz",
        "category": CourseCategory.mecanica_basica.value,
        "difficulty": CourseDifficulty.intermediate.value,
        "estimated_hours": 3,
        "is_published": True,
        "is_paid": False,
        "price": 0.0,
        "is_required_for_technicians": False,
        "rank_points_reward": 30,
        "badge_name": "Experto en Redes Eléctricas",
        "badge_icon": "cpu",
        "sort_order": 4,
        "rating": 4.9,
        "description": "Aprende medición de señales analógicas y digitales, identificación de líneas CAN-Bus automotriz y técnicas profesionales de empalme.",
        "thumbnail_url": "/images/courses/mecanica.svg",
        "lessons": [
            {
                "title": "Fundamentos de la Ley de Ohm y cálculo de amperaje en accesorios",
                "slug": "ley-de-ohm-calculo-amperaje",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 540,
                "sort_order": 1,
                "is_free_preview": True,
                "content_markdown": "### Cálculo de Carga y Selección de Fusibles\n\n- Potencia (W) = Voltaje (V) × Corriente (A)\n- Si una sirena consume 30W a 12V: Corriente = 30 / 12 = 2.5 Amperios.\n- El fusible de protección recomendado es un 25% a 50% superior a la carga nominal (Fusible de 3A a 5A)."
            },
            {
                "title": "Soldadura con estaño, termorretráctil y cinta de tela automotriz",
                "slug": "soldadura-termorretractil-cinta",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 720,
                "sort_order": 2,
                "is_free_preview": False,
                "content_markdown": "### El Empalme Tipo Western Union\n\n1. Entrelaza firmemente los filamentos de cobre sin cortarlos.\n2. Aplica calor con el cautín y deja que el estaño fluya por capilaridad.\n3. Cubre con termorretráctil de doble pared con adhesivo.\n4. Finaliza con encintado de tela tipo OEM para insonorización."
            },
            {
                "title": "Redes CAN-Bus: identificación de señales y prevención de fallas ECU",
                "slug": "redes-can-bus-identificacion-senales",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 690,
                "sort_order": 3,
                "is_free_preview": False,
                "content_markdown": "### Precaución con Redes de Datos CAN-Bus\n\n- Cables trenzados en pares (CAN High ~2.5V a 3.5V y CAN Low ~1.5V a 2.5V).\n- **JAMÁS conectes un consumo de 12V ni una punta de prueba incandescente en un par CAN-Bus.**\n- Si necesitas leer datos CAN, utiliza lectores inductivos sin corte (tipo CAN-Click)."
            }
        ],
        "quizzes": [
            {
                "question_text": "¿Qué sucede si se usa una lámpara de prueba incandescente tradicional en una línea de datos CAN-Bus?",
                "options": [
                    "La bombilla prende más brillante.",
                    "Puede inducir sobrecorriente y dañar de forma irreversible los transceptores de la computadora del auto (ECU/BCM).",
                    "Aumenta la velocidad de transmisión de datos.",
                    "No causa ningún daño porque funciona a 12V."
                ],
                "correct_option_index": 1,
                "explanation": "Las líneas de datos operan con corrientes de miliamperios. Una lámpara incandescente demanda varios cientos de miliamperios, quemando los chips.",
                "sort_order": 1
            },
            {
                "question_text": "¿Cuál es la mejor práctica para aislar empalmes en la instalación eléctrica de un vehículo?",
                "options": [
                    "Enrollar con cinta transparente de embalar.",
                    "Soldadura de estaño, tubo termorretráctil con adhesivo y encintado con cinta de tela automotriz.",
                    "Dejar los cables pelados si no se tocan entre sí.",
                    "Usar cinta de enmascarar de papel."
                ],
                "correct_option_index": 1,
                "explanation": "La soldadura previene corrosión y falso contacto, y el termorretráctil sella contra humedad y vibraciones mecánicas.",
                "sort_order": 2
            },
            {
                "question_text": "¿Qué caída de voltaje máxima es admisible en una buena conexión de tierra (masa) automotriz?",
                "options": [
                    "5.0 Voltios.",
                    "Menos de 0.2 Voltios respecto al terminal negativo de la batería con el circuito en carga.",
                    "12.0 Voltios.",
                    "No importa el valor de voltaje."
                ],
                "correct_option_index": 1,
                "explanation": "Una caída superior a 0.2V indica alta resistencia por óxido, pintura o tornillo flojo, provocando reinicios del equipo telemático.",
                "sort_order": 3
            }
        ]
    },
    {
        "title": "Telemetría Pesada Avanzada: Queclink & Teltonika en Camiones",
        "slug": "telemetria-pesada-queclink-teltonika",
        "category": CourseCategory.proveedor.value,
        "difficulty": CourseDifficulty.advanced.value,
        "estimated_hours": 4,
        "is_published": True,
        "is_paid": True,
        "price": 149000.0,
        "is_required_for_technicians": False,
        "rank_points_reward": 50,
        "badge_name": "Master Telemetría Pesada",
        "badge_icon": "truck",
        "sort_order": 5,
        "rating": 5.0,
        "description": "Curso especializado de pago para instalación de telemetría de grado industrial en tractocamiones de 24V, sensores de combustible y CAN J1939.",
        "thumbnail_url": "/images/courses/telemetria-pesada.svg",
        "lessons": [
            {
                "title": "Sistemas eléctricos de 24V en tractocamiones y convertidores DC-DC",
                "slug": "sistemas-electricos-24v-tractocamiones",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 780,
                "sort_order": 1,
                "is_free_preview": True,
                "content_markdown": "### Particularidades de los Sistemas de 24V\n\n- En camiones con dos baterías en serie el voltaje del alternador llega hasta 28.8V y picos inductivos de 40V+.\n- Verifica siempre el rango del hardware (Queclink GV300 y Teltonika FMB aceptan 10V a 30V).\n- Utiliza siempre relés certificados para 24V DC en corte de inyección diésel."
            },
            {
                "title": "Instalación y calibración de sensores de combustible capacitivos y ultrasónicos",
                "slug": "sensores-combustible-capacitivos-ultrasonicos",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 960,
                "sort_order": 2,
                "is_free_preview": False,
                "content_markdown": "### Calibración de Varillas Capacitivas\n\n1. Corta la varilla a la altura del tanque menos 2 cm.\n2. Realiza el proceso de calibración en seco (Empty value) y sumergido en combustible (Full value).\n3. Conecta por puerto RS232 o RS485 al dispositivo GPS."
            },
            {
                "title": "Configuración de sensores Bluetooth BLE para furgones refrigerados",
                "slug": "sensores-ble-furgones-refrigerados",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 620,
                "sort_order": 3,
                "is_free_preview": False,
                "content_markdown": "### Monitoreo de Cadena de Frío con BLE\n\n- Sensores de temperatura y humedad inalámbricos con batería interna de 5 años.\n- Emparejamiento por Bluetooth con el GPS de cabina para reportar alertas de temperatura fuera de rango a la central Tec360."
            },
            {
                "title": "Lectura de Odómetro y Consumo en CAN J1939 con Pinza Inductiva",
                "slug": "lectura-can-j1939-pinza-inductiva",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "video_duration_seconds": 850,
                "sort_order": 4,
                "is_free_preview": False,
                "content_markdown": "### Tecnología Contactless CAN\n\n- La pinza 'Crocodile / CAN-Click' lee los datos por inducción magnética sin cortar el aislamiento del cable.\n- Conserva al 100% la garantía de fábrica del camión nuevo."
            }
        ],
        "quizzes": [
            {
                "question_text": "¿Qué precaución crítica se debe tener al instalar GPS y relés en camiones pesados de 24V?",
                "options": [
                    "Colocar un fusible de 50 Amperios.",
                    "Verificar que el equipo GPS y el relé de corte estén certificados específicamente para bobina de 24V DC.",
                    "Conectar a una sola batería de 12V desbalanceando el sistema.",
                    "No requiere ninguna precaución diferente."
                ],
                "correct_option_index": 1,
                "explanation": "Conectar un relé de 12V en un sistema de 24V quemará la bobina inmediatamente y puede generar un principio de incendio.",
                "sort_order": 1
            },
            {
                "question_text": "¿Cómo se calibra un sensor de nivel de combustible capacitivo de varilla?",
                "options": [
                    "Adivinando la capacidad del tanque.",
                    "Midiendo la frecuencia con la varilla limpia y seca (tanque vacío) y totalmente sumergida en diésel (tanque lleno).",
                    "Golpeando el tanque con un martillo de goma.",
                    "Midiendo con una cinta métrica escolar."
                ],
                "correct_option_index": 1,
                "explanation": "El dieléctrico del combustible varía la capacitancia del tubo; la calibración de extremos vacío y lleno es esencial para la precisión.",
                "sort_order": 2
            },
            {
                "question_text": "¿Qué ventaja ofrece el sensor de temperatura Bluetooth BLE en un furgón refrigerado?",
                "options": [
                    "Enfría la carga automáticamente.",
                    "Permite medir temperatura sin necesidad de perforar el furgón ni pasar cables largos desde el chasis a la cabina.",
                    "Sirve como antena GPS adicional.",
                    "Aumenta la velocidad del camión."
                ],
                "correct_option_index": 1,
                "explanation": "La tecnología inalámbrica BLE elimina el cableado vulnerable que suele cortarse en las puertas o enganches de remolque.",
                "sort_order": 3
            },
            {
                "question_text": "¿Qué dispositivo permite leer los datos de consumo y odómetro del bus CAN J1939 sin anular la garantía de la marca?",
                "options": [
                    "Una pinza o interfaz de lectura contactless / inductiva (CAN Click).",
                    "Un pelacables manual afilado.",
                    "Un puente directo de 12V.",
                    "Una resistencia soldada al pedal del acelerador."
                ],
                "correct_option_index": 0,
                "explanation": "La pinza magnética inductiva capta los campos electromagnéticos del par trenzado sin tocar el cobre ni perforar el aislante.",
                "sort_order": 4
            }
        ]
    }
]


def seed_courses(session: Session) -> None:
    """Inserta cursos, lecciones y quizzes iniciales si no existen."""
    try:
        existing = session.exec(select(Course)).first()
        if existing:
            logger.info("Cursos de la Escuela Tec ya existen en la base de datos.")
            return

        logger.info("Iniciando carga de cursos iniciales de Escuela Tec...")
        for c_data in INITIAL_COURSES:
            course = Course(
                title=c_data["title"],
                slug=c_data["slug"],
                category=c_data["category"],
                difficulty=c_data["difficulty"],
                estimated_hours=c_data["estimated_hours"],
                is_published=c_data["is_published"],
                is_paid=c_data["is_paid"],
                price=c_data["price"],
                is_required_for_technicians=c_data["is_required_for_technicians"],
                rank_points_reward=c_data["rank_points_reward"],
                badge_name=c_data["badge_name"],
                badge_icon=c_data["badge_icon"],
                sort_order=c_data["sort_order"],
                rating=c_data["rating"],
                description=c_data["description"],
                thumbnail_url=c_data["thumbnail_url"],
            )
            session.add(course)
            session.commit()
            session.refresh(course)

            # Lessons
            for l_data in c_data.get("lessons", []):
                lesson = Lesson(
                    course_id=course.id,
                    title=l_data["title"],
                    slug=l_data["slug"],
                    content_markdown=l_data["content_markdown"],
                    video_url=l_data["video_url"],
                    video_duration_seconds=l_data["video_duration_seconds"],
                    sort_order=l_data["sort_order"],
                    is_published=True,
                    is_free_preview=l_data.get("is_free_preview", False),
                )
                session.add(lesson)

            # Quizzes
            for q_data in c_data.get("quizzes", []):
                quiz = CourseQuiz(
                    course_id=course.id,
                    question_text=q_data["question_text"],
                    options=q_data["options"],
                    correct_option_index=q_data["correct_option_index"],
                    explanation=q_data.get("explanation"),
                    sort_order=q_data["sort_order"],
                )
                session.add(quiz)

            session.commit()

        logger.info(f"Se cargaron {len(INITIAL_COURSES)} cursos con éxito en Escuela Tec.")
    except Exception as e:
        logger.error(f"Error al sembrar cursos de Escuela Tec: {e}", exc_info=True)
        session.rollback()
