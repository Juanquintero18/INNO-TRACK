"""Script diagnóstico para validar serialización de fecha en PiezaHistorial.

Uso: ejecutar desde backend para inspeccionar tipo SQL, valor crudo y salida
del serializer luego del ajuste de zona horaria.
"""

import os
import django
from django.conf import settings
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.production.models import PiezaHistorial
from apps.production.serializers import PiezaHistorialSerializer


def check():
    """Imprime diagnóstico completo de la columna fecha y su serialización."""

    # 1) Tipo de columna SQL
    with connection.cursor() as cursor:
        # Se toma el nombre de tabla desde el modelo para evitar hardcodear.
        table_name = PiezaHistorial._meta.db_table
        cursor.execute(f"""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = '{table_name}' AND column_name = 'fecha'
        """)
        col_info = cursor.fetchone()
        print(f"1) Info de columna SQL para {table_name}.fecha: {col_info}")

    # 2) Último registro persistido
    recent = PiezaHistorial.objects.order_by('-id').first()
    if not recent:
        print("No se encontraron registros en PiezaHistorial.")
        return

    fecha = recent.fecha
    print(f"2) Registro reciente (ID: {recent.id}):")
    print(f"   repr(fecha): {repr(fecha)}")
    print(f"   fecha.isoformat(): {fecha.isoformat()}")
    print(f"   fecha.tzinfo: {fecha.tzinfo}")

    # 3) Salida del serializer (valor enviado al frontend)
    serializer = PiezaHistorialSerializer(recent)
    serialized_fecha = serializer.data.get('fecha')
    print(f"3) Salida de PiezaHistorialSerializer para fecha: {serialized_fecha}")


if __name__ == "__main__":
    check()
