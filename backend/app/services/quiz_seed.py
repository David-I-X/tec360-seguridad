import logging
from sqlmodel import Session, select
from app.models.verification import QuizQuestion

logger = logging.getLogger(__name__)

# Banco de preguntas generado por IA
QUIZ_QUESTIONS = [
    # --- GPS INSTALLATION ---
    {
        "specialization": "gps_installation",
        "question_text": "¿Cuál es el voltaje de funcionamiento típico de un rastreador GPS para vehículos estándar?",
        "options": ["5V", "9V - 36V", "110V", "220V"],
        "correct_option_index": 1,
        "difficulty": "easy"
    },
    {
        "specialization": "gps_installation",
        "question_text": "¿Dónde es el mejor lugar para conectar la alimentación principal de un GPS para evitar cortes al apagar el vehículo?",
        "options": ["Al cable de accesorios (ACC)", "Directo a la batería o línea de corriente constante (VCC)", "Al cable de la radio", "Al cable de las luces"],
        "correct_option_index": 1,
        "difficulty": "medium"
    },
    {
        "specialization": "gps_installation",
        "question_text": "¿Qué función cumple el relay (relé) de corte comúnmente instalado con el GPS?",
        "options": ["Mejorar la señal satelital", "Apagar el GPS si la batería está baja", "Permitir el bloqueo remoto del motor (corte de bomba o ignición)", "Activar la sirena del vehículo"],
        "correct_option_index": 2,
        "difficulty": "medium"
    },
    {
        "specialization": "gps_installation",
        "question_text": "Para asegurar la mejor recepción de señal GPS, la antena o el dispositivo (si tiene antena interna) debe instalarse:",
        "options": ["Debajo de partes metálicas sólidas", "Cerca del motor para protegerlo", "Con vista despejada al cielo, preferiblemente bajo plástico o vidrio, no metal", "Debajo del asiento del conductor"],
        "correct_option_index": 2,
        "difficulty": "easy"
    },
    {
        "specialization": "gps_installation",
        "question_text": "¿Qué significa el cable ACC en el esquema de cableado del vehículo?",
        "options": ["Corriente Alterna", "Accesorios (energizado cuando se gira la llave)", "Alimentación de Batería (constante)", "Tierra (GND)"],
        "correct_option_index": 1,
        "difficulty": "easy"
    },
    
    # --- ALARM INSTALLATION ---
    {
        "specialization": "alarm_installation",
        "question_text": "¿Cuál es la función principal del sensor de impacto (shock sensor) en una alarma vehicular?",
        "options": ["Detectar si se abre una puerta", "Detectar si el motor se enciende", "Detectar golpes o vibraciones fuertes en la carrocería", "Detectar si las luces están encendidas"],
        "correct_option_index": 2,
        "difficulty": "easy"
    },
    {
        "specialization": "alarm_installation",
        "question_text": "Al conectar los pulsadores de las puertas (pin switches), la mayoría de vehículos operan con:",
        "options": ["Pulso positivo (+12V) al abrir", "Pulso negativo (tierra/GND) al abrir", "Corriente alterna", "Señal multiplexada únicamente"],
        "correct_option_index": 1,
        "difficulty": "medium"
    },
    {
        "specialization": "alarm_installation",
        "question_text": "¿Qué componente evita que el vehículo encienda si la alarma está activada?",
        "options": ["La sirena", "El sensor de movimiento", "El relay de corte de ignición/arranque", "El control remoto"],
        "correct_option_index": 2,
        "difficulty": "medium"
    },
    {
        "specialization": "alarm_installation",
        "question_text": "¿Por qué es crucial identificar correctamente los cables de las cerraduras eléctricas antes de conectar el módulo de la alarma?",
        "options": ["Para no quemar los fusibles o el módulo original del vehículo (BCM)", "Para que la alarma suene más fuerte", "No es importante, cualquier cable funciona", "Para ahorrar batería"],
        "correct_option_index": 0,
        "difficulty": "hard"
    },
    {
        "specialization": "alarm_installation",
        "question_text": "Si una alarma tiene función de antiasalto, ¿qué evento suele detonarlo?",
        "options": ["Abrir y cerrar una puerta mientras el motor está encendido", "Pisar el freno bruscamente", "Encender el aire acondicionado", "Llamar por celular"],
        "correct_option_index": 0,
        "difficulty": "medium"
    },

    # --- DASHCAM INSTALLATION ---
    {
        "specialization": "camera_installation",
        "question_text": "Para usar el modo de estacionamiento (Parking Mode) en una dashcam, ¿cómo se debe conectar la alimentación usando un hardwire kit?",
        "options": ["Al puerto USB del encendedor de cigarrillos", "A la batería constante (VCC), a accesorios (ACC) y a Tierra (GND)", "Directamente a las luces del vehículo", "Solo al cable de ACC"],
        "correct_option_index": 1,
        "difficulty": "medium"
    },
    {
        "specialization": "camera_installation",
        "question_text": "¿Qué hace la función de 'corte de bajo voltaje' (Low Voltage Cut-off) en un kit de instalación de dashcam?",
        "options": ["Mejora la resolución de la cámara de noche", "Corta la energía a la cámara si la batería del vehículo baja de cierto nivel (ej. 11.8V) para que pueda encender", "Apaga el motor si el voltaje baja", "Reduce el tamaño del archivo de video"],
        "correct_option_index": 1,
        "difficulty": "easy"
    },
    {
        "specialization": "camera_installation",
        "question_text": "Al instalar la cámara trasera de una dashcam, el cable rojo pequeño adicional generalmente se conecta a:",
        "options": ["La batería principal", "La luz de reversa, para activar la vista de asistencia de parqueo", "El sensor de la alarma", "Las luces de freno"],
        "correct_option_index": 1,
        "difficulty": "medium"
    },
    {
        "specialization": "camera_installation",
        "question_text": "¿Dónde es el lugar óptimo para instalar la dashcam principal (frontal)?",
        "options": ["En el tablero frente al conductor", "Cerca o detrás del espejo retrovisor interior, para no obstruir la vista del conductor", "En el parabrisas lado del pasajero cerca de la guantera", "Afuera del vehículo"],
        "correct_option_index": 1,
        "difficulty": "easy"
    },
    {
        "specialization": "camera_installation",
        "question_text": "Si se usan herramientas de palanca de plástico (trim tools) para esconder el cableado, ¿cuál es el objetivo principal?",
        "options": ["Cortar el cableado sobrante", "Esconder el cable detrás de los plásticos y el techo sin dañar el interior ni interferir con los airbags de cortina", "Atornillar la cámara más fuerte", "Mejorar la conexión a tierra"],
        "correct_option_index": 1,
        "difficulty": "easy"
    }
]


def seed_quiz_questions(session: Session):
    """Puebla la tabla de QuizQuestion con el banco de preguntas si está vacía."""
    count = session.exec(select(QuizQuestion)).all()
    if len(count) > 0:
        logger.info(f"Quiz questions already seeded ({len(count)} questions).")
        return

    logger.info("Seeding quiz questions...")
    for q_data in QUIZ_QUESTIONS:
        question = QuizQuestion(**q_data)
        session.add(question)
    
    session.commit()
    logger.info("Quiz questions seeded successfully.")
