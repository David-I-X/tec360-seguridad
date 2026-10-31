"""
Tests unitarios para normalización y soporte de números de México (+52) y Colombia (+57)
"""
import pytest
from app.api.auth import normalize_phone


class TestPhoneNormalization:
    """Verifica las reglas de normalización telefónica internacional"""

    def test_colombia_standard(self):
        """Número colombiano estándar de 10 dígitos con prefijo +57"""
        assert normalize_phone("+573001234567") == "+573001234567"

    def test_colombia_without_plus(self):
        """Número colombiano de 12 dígitos que inicia en 57 sin +"""
        assert normalize_phone("573001234567") == "+573001234567"

    def test_colombia_local_10_digits(self):
        """Número colombiano de 10 dígitos sin prefijo nacional"""
        assert normalize_phone("3001234567") == "+573001234567"

    def test_colombia_formatted_with_spaces(self):
        """Número colombiano con espacios o guiones"""
        assert normalize_phone("+57 300 123-4567") == "+573001234567"

    def test_mexico_standard(self):
        """Número mexicano estándar de 10 dígitos con prefijo +52"""
        assert normalize_phone("+525512345678") == "+525512345678"

    def test_mexico_without_plus(self):
        """Número mexicano de 12 dígitos que inicia en 52 sin +"""
        assert normalize_phone("525512345678") == "+525512345678"

    def test_mexico_historical_mobile_with_one(self):
        """Número mexicano con el prefijo histórico '1' (+52 1 ...)"""
        # Formato que a veces reportaba Telcel/Twilio antes de la reforma
        assert normalize_phone("+5215512345678") == "+525512345678"
        assert normalize_phone("5215512345678") == "+525512345678"

    def test_mexico_formatted_with_spaces(self):
        """Número mexicano con espacios y guiones"""
        assert normalize_phone("+52 (55) 1234-5678") == "+525512345678"

    def test_mexico_explicit_country_context(self):
        """Número local de 10 dígitos cuando el contexto de país es México"""
        assert normalize_phone("5512345678", default_country="MX") == "+525512345678"
