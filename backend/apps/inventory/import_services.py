"""Importaciones masivas del módulo de inventario.

Cada clase describe una importación para el motor de `apps.common.importing`:
columnas, alias de encabezados, plantilla de ejemplo y validación por fila.
"""

from __future__ import annotations

from dataclasses import dataclass

from apps.common.importing import (
    DuplicateTracker,
    CatalogLookup,
    ImportSpec,
    RowResult,
    flatten_serializer_errors,
    parse_date,
    parse_decimal,
)
from apps.inventory.models import MateriaPrima, Proveedor, TrabajadorProduccion
from apps.inventory.serializers import MovimientoInventarioSerializer, ProveedorSerializer, TrabajadorProduccionSerializer
from apps.inventory.services import TIPO_AJUSTE, TIPO_ENTRADA, TIPO_SALIDA, TIPOS_MOVIMIENTO


# --- Movimientos de inventario -----------------------------------------------------


@dataclass
class MovimientoCatalogs:
    """Catálogos de referencia que necesita la validación de cada movimiento."""

    materias: CatalogLookup
    proveedores: CatalogLookup
    trabajadores: CatalogLookup


class MovimientoImportSpec(ImportSpec):
    """Entradas, salidas y ajustes de stock."""

    headers = ["materia_prima", "tipo", "cantidad", "fecha", "proveedor", "trabajador", "motivo", "referencia"]
    # Acepta variaciones reales de encabezados para reducir rechazos por formato.
    aliases = {
        "materia_prima": "materia_prima",
        "materiaprima": "materia_prima",
        "materia prima": "materia_prima",
        "materia-prima": "materia_prima",
        "materia prima nombre": "materia_prima",
        "nombre materia prima": "materia_prima",
        "material": "materia_prima",
        "tipo": "tipo",
        "tipo movimiento": "tipo",
        "cantidad": "cantidad",
        "cantidad movimiento": "cantidad",
        "fecha": "fecha",
        "fecha movimiento": "fecha",
        "proveedor": "proveedor",
        "proveedor_nombre": "proveedor",
        "nombre proveedor": "proveedor",
        "trabajador": "trabajador",
        "trabajador produccion": "trabajador",
        "trabajador_produccion": "trabajador",
        "nombre trabajador": "trabajador",
        "trabajador_codigo": "trabajador",
        "codigo_trabajador": "trabajador",
        "responsable": "trabajador",
        "motivo": "motivo",
        "referencia": "referencia",
        "codigo referencia": "referencia",
    }
    sheet_title = "movimientos"
    template_file_name = "plantilla_movimientos_inventario.xlsx"
    example_rows = [
        ["Resina Poliester", "entrada", "120.5", "2026-05-02", "Proveedor Alfa", "", "Compra inicial de materia prima", "ENT-0001"],
        ["Resina Poliester", "salida", "25", "2026-05-03", "", "TR-001", "Consumo para orden de producción", "SAL-0001"],
        ["Catalizador MEKP", "ajuste", "-2", "2026-05-04", "", "", "Corrección por conteo físico", "AJU-0001"],
    ]

    def new_context(self) -> MovimientoCatalogs:
        """Precarga catálogos en memoria para validar cientos de filas sin consultar por fila."""
        catalogs = MovimientoCatalogs(
            materias=CatalogLookup("La materia prima no existe o no coincide con el catálogo."),
            proveedores=CatalogLookup("El proveedor indicado no existe o no coincide con el catálogo."),
            trabajadores=CatalogLookup("El trabajador indicado no existe o no coincide con el catálogo."),
        )

        for materia in MateriaPrima.objects.select_related("unidad_medida").all():
            if materia.nombre:
                catalogs.materias.register(materia.nombre, materia)

        for proveedor in Proveedor.objects.all():
            if proveedor.nombre:
                catalogs.proveedores.register(proveedor.nombre, proveedor)

        # Un trabajador puede indicarse por su código o por su nombre.
        for trabajador in TrabajadorProduccion.objects.all():
            if trabajador.codigo_trabajador:
                catalogs.trabajadores.register(trabajador.codigo_trabajador, trabajador)
            if trabajador.nombre:
                catalogs.trabajadores.register(trabajador.nombre, trabajador)

        return catalogs

    def validate_row(self, values, raw_row, catalogs: MovimientoCatalogs) -> RowResult:
        errors: list[str] = []

        materia_nombre = values["materia_prima"]
        tipo = values["tipo"].strip().lower()
        proveedor_nombre = values["proveedor"]
        trabajador_referencia = values["trabajador"]
        motivo = values["motivo"].strip() or None
        referencia = values["referencia"].strip()

        materia = catalogs.materias.find(materia_nombre)
        proveedor = catalogs.proveedores.find(proveedor_nombre) if proveedor_nombre else None
        trabajador = catalogs.trabajadores.find(trabajador_referencia) if trabajador_referencia else None

        if not materia:
            errors.append(catalogs.materias.not_found_error(materia_nombre))

        if proveedor_nombre and not proveedor:
            errors.append(catalogs.proveedores.not_found_error(proveedor_nombre))

        if trabajador_referencia and not trabajador:
            errors.append(catalogs.trabajadores.not_found_error(trabajador_referencia))

        if tipo not in TIPOS_MOVIMIENTO:
            errors.append("El tipo debe ser entrada, salida o ajuste.")

        try:
            cantidad = parse_decimal(raw_row.get("cantidad"))
        except ValueError as exc:
            cantidad = None
            errors.append(str(exc))

        try:
            fecha = parse_date(raw_row.get("fecha"))
        except ValueError as exc:
            fecha = None
            errors.append(str(exc))

        if not referencia:
            errors.append("La referencia es obligatoria.")

        if cantidad is not None:
            if tipo in {TIPO_ENTRADA, TIPO_SALIDA} and cantidad <= 0:
                errors.append("La cantidad debe ser mayor que cero para entradas y salidas.")
            if tipo == TIPO_AJUSTE and cantidad == 0:
                errors.append("El ajuste no puede ser cero.")

        payload = None
        if not errors:
            # El proveedor solo aplica a entradas y el trabajador solo a salidas.
            payload = {
                "materia_prima_id": materia.id,
                "proveedor_id": proveedor.id if tipo == TIPO_ENTRADA and proveedor else None,
                "trabajador_produccion_id": trabajador.id if tipo == TIPO_SALIDA and trabajador else None,
                "tipo": tipo,
                "cantidad": str(cantidad),
                "fecha": fecha,
                "motivo": motivo,
                "referencia": referencia,
            }
            # El serializer centraliza reglas de negocio (como el stock negativo) y evita duplicarlas aquí.
            serializer = MovimientoInventarioSerializer(data=payload)
            if not serializer.is_valid():
                errors.extend(flatten_serializer_errors(serializer.errors))

        return RowResult(
            errors=errors,
            payload=payload if not errors else None,
            resolved={
                "materia_prima": materia.nombre if materia else None,
                "proveedor": proveedor.nombre if proveedor else None,
                "trabajador": trabajador.nombre if trabajador else None,
            },
        )

    def save(self, payload, user):
        serializer = MovimientoInventarioSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return serializer.save(usuario=user)


MOVIMIENTOS_IMPORT = MovimientoImportSpec()


def _validate_email(value: str) -> str | None:
    """Mensaje de error si el texto no parece un correo electrónico."""
    if "@" not in value or "." not in value.split("@")[-1] or " " in value:
        return f"El correo '{value}' no es válido."
    return None


# --- Proveedores -------------------------------------------------------------------


class ProveedorImportSpec(ImportSpec):
    """Directorio de proveedores. Las mismas reglas del formulario: todo es obligatorio y el correo no se repite."""

    headers = ["nombre", "telefono", "email", "direccion"]
    aliases = {
        "nombre proveedor": "nombre",
        "proveedor": "nombre",
        "razon social": "nombre",
        "empresa": "nombre",
        "telefono": "telefono",
        "tel": "telefono",
        "celular": "telefono",
        "telefono contacto": "telefono",
        "correo": "email",
        "correo electronico": "email",
        "e-mail": "email",
        "mail": "email",
        "direccion": "direccion",
        "domicilio": "direccion",
    }
    sheet_title = "proveedores"
    template_file_name = "plantilla_proveedores.xlsx"
    example_rows = [
        ["Compuestos del Norte", "+57 300 123 4567", "ventas@compuestosnorte.com", "Zona Industrial, Barranquilla"],
        ["Pinturas Andinas", "6045551212", "contacto@pinturasandinas.com", "Calle 10 # 43-20, Medellín"],
    ]

    def new_context(self) -> DuplicateTracker:
        return DuplicateTracker(Proveedor.objects.values_list("email", flat=True), "el correo")

    REQUIRED_MESSAGES = {
        "nombre": "El nombre es obligatorio.",
        "telefono": "El teléfono es obligatorio.",
        "email": "El correo es obligatorio.",
        "direccion": "La dirección es obligatoria.",
    }

    def validate_row(self, values, raw_row, emails: DuplicateTracker) -> RowResult:
        datos = {campo: values[campo].strip() for campo in self.headers}
        errors = [self.REQUIRED_MESSAGES[campo] for campo, valor in datos.items() if not valor]

        if datos["email"]:
            error_email = _validate_email(datos["email"]) or emails.check(datos["email"])
            if error_email:
                errors.append(error_email)

        return RowResult(errors=errors, payload=None if errors else datos)

    def save(self, payload, user):
        serializer = ProveedorSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return serializer.save()


PROVEEDORES_IMPORT = ProveedorImportSpec()


# --- Trabajadores de producción ----------------------------------------------------


class TrabajadorImportSpec(ImportSpec):
    """Catálogo de operarios. Código y nombre son obligatorios y el código no se repite."""

    headers = ["codigo_trabajador", "nombre"]
    aliases = {
        "codigo": "codigo_trabajador",
        "cod": "codigo_trabajador",
        "codigo trabajador": "codigo_trabajador",
        "codigo del trabajador": "codigo_trabajador",
        "nombre completo": "nombre",
        "trabajador": "nombre",
        "operario": "nombre",
    }
    sheet_title = "trabajadores"
    template_file_name = "plantilla_trabajadores.xlsx"
    example_rows = [
        ["TRB-006", "Laura Gómez"],
        ["TRB-007", "Andrés Pérez"],
    ]

    def new_context(self) -> DuplicateTracker:
        return DuplicateTracker(TrabajadorProduccion.objects.values_list("codigo_trabajador", flat=True), "el código")

    def validate_row(self, values, raw_row, codigos: DuplicateTracker) -> RowResult:
        datos = {campo: values[campo].strip() for campo in self.headers}
        errors = []

        if not datos["codigo_trabajador"]:
            errors.append("El código del trabajador es obligatorio.")
        elif error_codigo := codigos.check(datos["codigo_trabajador"]):
            errors.append(error_codigo)

        if not datos["nombre"]:
            errors.append("El nombre es obligatorio.")

        return RowResult(errors=errors, payload=None if errors else datos)

    def save(self, payload, user):
        serializer = TrabajadorProduccionSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return serializer.save()


TRABAJADORES_IMPORT = TrabajadorImportSpec()
