import os
import django
from django.conf import settings
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.production.models import PiezaHistorial
from apps.production.serializers import PiezaHistorialSerializer

def check():
    # 1) SQL Column type
    with connection.cursor() as cursor:
        # We need to know the exact table name. Let's find it from the model.
        table_name = PiezaHistorial._meta.db_table
        cursor.execute(f"""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = '{table_name}' AND column_name = 'fecha'
        """)
        col_info = cursor.fetchone()
        print(f"1) SQL Column info for {table_name}.fecha: {col_info}")

    # 2) Recent record
    recent = PiezaHistorial.objects.order_by('-id').first()
    if not recent:
        print("No records found in PiezaHistorial.")
        return

    fecha = recent.fecha
    print(f"2) Recent record (ID: {recent.id}):")
    print(f"   repr(fecha): {repr(fecha)}")
    print(f"   fecha.isoformat(): {fecha.isoformat()}")
    print(f"   fecha.tzinfo: {fecha.tzinfo}")

    # 3) Serializer output
    serializer = PiezaHistorialSerializer(recent)
    serialized_fecha = serializer.data.get('fecha')
    print(f"3) PiezaHistorialSerializer output for fecha: {serialized_fecha}")

if __name__ == "__main__":
    check()
