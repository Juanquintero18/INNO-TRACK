"""Utilidades compartidas por las pruebas de la API.

Las pruebas de caracterización comparan cada respuesta con un archivo "golden"
en `backend/tests_golden/`. La primera ejecución lo crea; las siguientes fallan
si la respuesta cambia. Para regrabar a propósito un comportamiento nuevo, se
borra el archivo correspondiente y se vuelve a ejecutar la prueba.
"""

import json
import os
from datetime import date, datetime, timezone as datetime_timezone
from decimal import Decimal
from pathlib import Path
from unittest import mock

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder
from rest_framework.test import APITestCase

from apps.accounts.authentication import build_access_token
from apps.accounts.models import AppUser
from apps.inventory.models import (
    MateriaPrima,
    MateriaPrimaPiezaConfig,
    MateriaPrimaStabilityThreshold,
    MovimientoInventario,
    Proveedor,
    TrabajadorProduccion,
    UnidadMedida,
)
from apps.production.models import Orden, Pieza, PiezaHistorial, PiezaMateriaPrima, Proyecto


GOLDEN_DIR = Path(__file__).resolve().parent.parent / "tests_golden"
FIXED_NOW = datetime(2026, 3, 15, 15, 0, 0, tzinfo=datetime_timezone.utc)

# Valores que cambian en cada ejecución y no forman parte del comportamiento.
VOLATILE_KEYS = {"contrasena": "<hash>", "access": "<token>"}


def _scrub(value):
    """Reemplaza los valores volátiles para que el golden sea reproducible."""

    if isinstance(value, dict):
        return {key: VOLATILE_KEYS[key] if key in VOLATILE_KEYS else _scrub(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_scrub(item) for item in value]
    return value


class ApiTestCase(APITestCase):
    """Base con datos de ejemplo de todo el dominio, sesión por rol y goldens."""

    maxDiff = None

    @classmethod
    def setUpTestData(cls):
        password = make_password("clave-de-prueba")
        cls.admin = AppUser.objects.create(nombre="Juan", apellido="Administrador", email="admin@innolution.test", contrasena=password, rol="administrador")
        cls.almacenista = AppUser.objects.create(nombre="Carla", apellido="Mejía", email="almacen@innolution.test", contrasena=password, rol="almacenista")
        cls.trabajador = AppUser.objects.create(nombre="Carlos", apellido=None, email="carlos@innolution.test", contrasena=password, rol="trabajador")

        kg = UnidadMedida.objects.create(nombre="Kilogramo", abreviatura="kg")
        litro = UnidadMedida.objects.create(nombre="Litro", abreviatura="L")

        cls.quimica = Proveedor.objects.create(nombre="Química Industrial S.A.", telefono="+57 300 111 2233", email="ventas@quimica.test", direccion="Zona Industrial, Barranquilla")
        cls.fibramax = Proveedor.objects.create(nombre="FibraMax", telefono=None, email=None, direccion=None)

        cls.pedro = TrabajadorProduccion.objects.create(codigo_trabajador="TRB-001", nombre="Pedro Gómez")
        cls.laura = TrabajadorProduccion.objects.create(codigo_trabajador="TRB-002", nombre="Laura Ríos")

        cls.resina = MateriaPrima.objects.create(unidad_medida=kg, nombre="Resina poliéster", costo=Decimal("12.50"), fecha_actualizacion=date(2026, 2, 10))
        cls.fibra = MateriaPrima.objects.create(unidad_medida=kg, nombre="Fibra de vidrio", costo=Decimal("8.75"), fecha_actualizacion=date(2026, 1, 20))
        cls.gelcoat = MateriaPrima.objects.create(unidad_medida=litro, nombre="Gelcoat blanco", costo=Decimal("22.00"), fecha_actualizacion=None)
        cls.catalizador = MateriaPrima.objects.create(unidad_medida=None, nombre="Catalizador MEKP", costo=None, fecha_actualizacion=None)

        MateriaPrimaStabilityThreshold.objects.create(materia_prima=cls.fibra, stock_critico_max=Decimal("30"), stock_bajo_max=Decimal("80"))
        MateriaPrimaPiezaConfig.objects.create(materia_prima=cls.catalizador, enabled_for_piezas=False)

        movimientos = [
            (cls.resina, cls.quimica, cls.admin, None, "entrada", "100.00", date(2026, 1, 5), "Compra mensual", "OC-1001"),
            (cls.resina, None, cls.almacenista, cls.pedro, "salida", "30.00", date(2026, 1, 12), "Consumo producción", "PRD-0007"),
            (cls.resina, None, cls.admin, None, "ajuste", "-5.00", date(2026, 2, 1), "Ajuste por conteo", None),
            (cls.fibra, cls.fibramax, cls.almacenista, None, "entrada", "60.00", date(2026, 1, 8), None, "OC-1002"),
            (cls.gelcoat, cls.quimica, cls.admin, None, "entrada", "8.00", date(2026, 3, 1), "Compra urgente", "OC-1040"),
        ]
        for materia, proveedor, usuario, trabajador, tipo, cantidad, fecha, motivo, referencia in movimientos:
            MovimientoInventario.objects.create(
                materia_prima=materia,
                proveedor=proveedor,
                usuario=usuario,
                trabajador_produccion=trabajador,
                tipo=tipo,
                cantidad=Decimal(cantidad),
                fecha=fecha,
                motivo=motivo,
                referencia=referencia,
            )

        cls.aquaventura = Proyecto.objects.create(nombre="Aquaventura", codigo="AQ-01", descripcion="Toboganes del parque.", fecha_inicio=date(2026, 1, 10), fecha_fin=None, estado="activo")
        cls.sin_ordenes = Proyecto.objects.create(nombre="Sin órdenes", codigo=None, descripcion=None, fecha_inicio=None, fecha_fin=None, estado="pausado")

        cls.orden_1 = Orden.objects.create(proyecto=cls.aquaventura, codigo_orden="ORD-001", fecha_creacion=date(2026, 1, 15), estado="abierta")
        cls.orden_vacia = Orden.objects.create(proyecto=cls.aquaventura, codigo_orden="ORD-002", fecha_creacion=date(2026, 2, 3), estado="en_proceso")

        cls.pieza = Pieza.objects.create(orden=cls.orden_1, usuario=cls.trabajador, trace_id="TR-0001", nombre="Tobogán curva A", fecha_gelcoat=date(2026, 1, 20), fecha_qc=date(2026, 1, 28), peso_real=Decimal("45.50"))
        PiezaMateriaPrima.objects.create(pieza=cls.pieza, materia_prima=cls.resina, cantidad_teorica=Decimal("20.00"), cantidad_real=Decimal("21.50"))
        PiezaMateriaPrima.objects.create(pieza=cls.pieza, materia_prima=cls.catalizador, cantidad_teorica=Decimal("1.00"), cantidad_real=None)
        # Evento antiguo, guardado como texto libre antes de existir el historial estructurado.
        PiezaHistorial.objects.create(pieza=cls.pieza, usuario=None, accion="creacion", fecha=datetime(2026, 1, 20, 14, 15, tzinfo=datetime_timezone.utc), descripcion="Pieza creada desde la API.")
        PiezaHistorial.objects.create(pieza=cls.pieza, usuario=cls.admin, accion="edicion", fecha=datetime(2026, 1, 28, 21, 40, tzinfo=datetime_timezone.utc), descripcion="Se corrigió el peso a mano.")

    def setUp(self):
        cache.clear()
        patcher = mock.patch("django.utils.timezone.now", return_value=FIXED_NOW)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.login_as(self.admin)

    def login_as(self, user):
        """Autentica las siguientes peticiones como el usuario dado; `None` cierra la sesión."""
        if user is None:
            self.client.credentials()
        else:
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {build_access_token(user)}")

    def assert_golden(self, name, response):
        """Compara estado y cuerpo de una respuesta con su archivo golden."""
        body = response.json() if response.content and "json" in response.get("Content-Type", "") else None
        self.assert_golden_data(name, {"status": response.status_code, "body": body})

    def assert_golden_data(self, name, data):
        """Compara un dato cualquiera con su archivo golden, creándolo si no existe."""
        actual = json.loads(json.dumps(_scrub(data), cls=DjangoJSONEncoder))
        path = GOLDEN_DIR / f"{type(self).__name__}.{self._testMethodName}.{name}.json"

        if not path.exists():
            if os.environ.get("CI"):
                self.fail(f"Falta el golden {path.name}; no se crean goldens nuevos en CI.")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(actual, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
            return

        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), actual, f"La respuesta ya no coincide con {path.name}")
