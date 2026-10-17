"""Importaciones masivas del módulo de producción: proyectos, órdenes y piezas.

Cada clase describe una importación para el motor de `apps.common.importing`
con las mismas reglas de los formularios de las pantallas de Proyectos y Piezas.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from types import SimpleNamespace

from apps.accounts.models import AppUser
from apps.common.importing import (
    CatalogLookup,
    DuplicateTracker,
    ImportSpec,
    RowResult,
    normalize_lookup_key,
    normalize_text,
    parse_date,
    parse_decimal,
    parse_optional_date,
)
from apps.inventory.models import MateriaPrima
from apps.inventory.services import is_enabled_for_piezas
from apps.production.models import Orden, Pieza, Proyecto
from apps.production.serializers import OrdenSerializer, PiezaSerializer, ProyectoSerializer


ESTADOS_PROYECTO = ("planeacion", "activo", "pausado", "finalizado")
ESTADOS_ORDEN = ("abierta", "en_proceso", "cerrada", "cancelada")


def _parse_estado(texto: str, permitidos: tuple[str, ...], por_defecto: str, errors: list[str]) -> str:
    """Acepta "Planeación", "En proceso", "EN_PROCESO"...; vacío toma el estado inicial del formulario."""
    if not texto:
        return por_defecto

    estado = normalize_lookup_key(texto).replace(" ", "_")
    if estado not in permitidos:
        errors.append(f"El estado '{texto}' no existe. Usa {', '.join(permitidos[:-1])} o {permitidos[-1]}.")
    return estado


def _proyectos_lookup() -> CatalogLookup:
    """Proyectos por código o nombre; si un nombre coincide con el código de otro, gana el código."""
    proyectos_registrados = list(Proyecto.objects.all())
    proyectos = CatalogLookup("El proyecto no existe. Usa el código o el nombre de un proyecto registrado.")
    for proyecto in proyectos_registrados:
        if proyecto.codigo:
            proyectos.register(proyecto.codigo, proyecto)
    for proyecto in proyectos_registrados:
        proyectos.register(proyecto.nombre, proyecto)
    return proyectos


# --- Proyectos ---------------------------------------------------------------------


class ProyectoImportSpec(ImportSpec):
    """Proyectos. Solo el nombre es obligatorio; el código, si viene, no se repite."""

    headers = ["codigo", "nombre", "descripcion", "fecha_inicio", "fecha_fin", "estado"]
    aliases = {
        "codigo proyecto": "codigo",
        "codigo del proyecto": "codigo",
        "cod": "codigo",
        "proyecto": "nombre",
        "nombre proyecto": "nombre",
        "nombre del proyecto": "nombre",
        "detalle": "descripcion",
        "inicio": "fecha_inicio",
        "fecha de inicio": "fecha_inicio",
        "fin": "fecha_fin",
        "fecha de fin": "fecha_fin",
        "fecha final": "fecha_fin",
        "estado proyecto": "estado",
    }
    sheet_title = "proyectos"
    template_file_name = "plantilla_proyectos.xlsx"
    example_rows = [
        ["PRJ-010", "Parque Acuático Norte", "Toboganes y piscina de olas", "2026-06-01", "2026-12-15", "planeacion"],
        ["", "Mantenimiento Aquaventura", "", "2026-05-20", "", "activo"],
    ]

    def new_context(self) -> DuplicateTracker:
        return DuplicateTracker(Proyecto.objects.values_list("codigo", flat=True), "el código")

    def validate_row(self, values, raw_row, codigos: DuplicateTracker) -> RowResult:
        errors: list[str] = []
        nombre = values["nombre"].strip()
        codigo = values["codigo"].strip()

        if not nombre:
            errors.append("El nombre del proyecto es obligatorio.")

        if codigo and (error_codigo := codigos.check(codigo)):
            errors.append(error_codigo)

        fechas = {}
        for campo, label in (("fecha_inicio", "La fecha de inicio"), ("fecha_fin", "La fecha de fin")):
            try:
                fechas[campo] = parse_optional_date(raw_row.get(campo), label)
            except ValueError as exc:
                fechas[campo] = None
                errors.append(str(exc))

        if fechas["fecha_inicio"] and fechas["fecha_fin"] and fechas["fecha_fin"] < fechas["fecha_inicio"]:
            errors.append("La fecha fin no puede ser anterior a la fecha inicio.")

        estado = _parse_estado(values["estado"].strip(), ESTADOS_PROYECTO, "planeacion", errors)

        payload = None
        if not errors:
            # Como en el formulario, los opcionales vacíos se guardan como null.
            payload = {
                "nombre": nombre,
                "codigo": codigo or None,
                "descripcion": values["descripcion"].strip() or None,
                **fechas,
                "estado": estado,
            }

        return RowResult(errors=errors, payload=payload, resolved={"estado": estado})

    def save(self, payload, user):
        serializer = ProyectoSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return serializer.save()


PROYECTOS_IMPORT = ProyectoImportSpec()


# --- Órdenes -----------------------------------------------------------------------


@dataclass
class OrdenImportContext:
    proyectos: CatalogLookup
    # (proyecto_id, código normalizado) de las órdenes ya registradas y de las vistas en el archivo.
    existentes: set[tuple[int, str]]
    vistas: set[tuple[int, str]] = field(default_factory=set)


class OrdenImportSpec(ImportSpec):
    """Órdenes de producción. El proyecto se indica por código o nombre y el código no se repite dentro de él."""

    headers = ["proyecto", "codigo_orden", "fecha_creacion", "estado"]
    aliases = {
        "codigo proyecto": "proyecto",
        "nombre proyecto": "proyecto",
        "orden": "codigo_orden",
        "codigo": "codigo_orden",
        "codigo orden": "codigo_orden",
        "codigo de la orden": "codigo_orden",
        "numero orden": "codigo_orden",
        "fecha": "fecha_creacion",
        "fecha de creacion": "fecha_creacion",
        "estado orden": "estado",
    }
    sheet_title = "ordenes"
    template_file_name = "plantilla_ordenes.xlsx"
    example_rows = [
        ["PRJ-010", "ORD-100", "2026-06-03", "abierta"],
        ["Parque Acuático Norte", "ORD-101", "", "en_proceso"],
    ]

    def new_context(self) -> OrdenImportContext:
        existentes = {
            (proyecto_id, normalize_text(codigo))
            for proyecto_id, codigo in Orden.objects.values_list("proyecto_id", "codigo_orden")
            if proyecto_id and codigo
        }
        return OrdenImportContext(proyectos=_proyectos_lookup(), existentes=existentes)

    def validate_row(self, values, raw_row, context: OrdenImportContext) -> RowResult:
        errors: list[str] = []
        proyecto_texto = values["proyecto"].strip()
        codigo = values["codigo_orden"].strip()

        proyecto = context.proyectos.find(proyecto_texto) if proyecto_texto else None
        if not proyecto_texto:
            errors.append("El proyecto es obligatorio.")
        elif proyecto is None:
            errors.append(context.proyectos.not_found_error(proyecto_texto))

        if not codigo:
            errors.append("El código de la orden es obligatorio.")
        elif proyecto is not None:
            clave = (proyecto.id, normalize_text(codigo))
            if clave in context.existentes:
                errors.append(f"Ya existe la orden '{codigo}' en el proyecto '{proyecto.nombre}'.")
            elif clave in context.vistas:
                errors.append(f"La orden '{codigo}' está repetida en el archivo para el proyecto '{proyecto.nombre}'.")
            context.vistas.add(clave)

        try:
            fecha = parse_optional_date(raw_row.get("fecha_creacion"), "La fecha de creación")
        except ValueError as exc:
            fecha = None
            errors.append(str(exc))

        estado = _parse_estado(values["estado"].strip(), ESTADOS_ORDEN, "abierta", errors)

        payload = None
        if not errors:
            payload = {"proyecto_id": proyecto.id, "codigo_orden": codigo, "fecha_creacion": fecha, "estado": estado}

        return RowResult(
            errors=errors,
            payload=payload,
            resolved={"proyecto": proyecto.nombre if proyecto else None, "estado": estado},
        )

    def save(self, payload, user):
        serializer = OrdenSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return serializer.save()


ORDENES_IMPORT = OrdenImportSpec()


# --- Piezas ------------------------------------------------------------------------


@dataclass
class PiezaImportContext:
    proyectos: CatalogLookup
    # Órdenes por (proyecto_id, código normalizado): el código de orden solo es único dentro del proyecto.
    ordenes: dict[tuple[int, str], Orden]
    usuarios: CatalogLookup
    materias: CatalogLookup
    trace_ids: DuplicateTracker


class PiezaImportSpec(ImportSpec):
    """Piezas fabricadas, una por fila, con sus materiales en una sola celda.

    La columna `materiales` lleva pares "Material: cantidad" separados por punto y
    coma; la cantidad se toma como teórica y real, igual que al agregarla en el formulario.
    """

    headers = ["trace_id", "nombre", "proyecto", "orden", "usuario", "fecha_gelcoat", "fecha_qc", "peso_real", "materiales"]
    aliases = {
        "trace": "trace_id",
        "traceid": "trace_id",
        "trazabilidad": "trace_id",
        "codigo trazabilidad": "trace_id",
        "pieza": "nombre",
        "nombre pieza": "nombre",
        "nombre de la pieza": "nombre",
        "codigo proyecto": "proyecto",
        "codigo orden": "orden",
        "orden de produccion": "orden",
        "responsable": "usuario",
        "correo usuario": "usuario",
        "operario": "usuario",
        "gelcoat": "fecha_gelcoat",
        "fecha de gelcoat": "fecha_gelcoat",
        "qc": "fecha_qc",
        "fecha control calidad": "fecha_qc",
        "fecha de qc": "fecha_qc",
        "peso": "peso_real",
        "peso kg": "peso_real",
        "materias primas": "materiales",
        "materiales usados": "materiales",
    }
    sheet_title = "piezas"
    template_file_name = "plantilla_piezas.xlsx"
    example_rows = [
        [
            "TR-0100",
            "Tobogán curva C",
            "PRJ-010",
            "ORD-100",
            "carlos@innolution.com",
            "2026-06-05",
            "2026-06-12",
            "48.20",
            "Resina poliéster: 20; Fibra de vidrio: 10",
        ],
        ["TR-0101", "Tobogán recto D", "Parque Acuático Norte", "ORD-100", "Carlos Operador", "2026-06-06", "", "", ""],
    ]

    REQUIRED_MESSAGES = {
        "trace_id": "El trace ID es obligatorio.",
        "nombre": "El nombre de la pieza es obligatorio.",
        "proyecto": "El proyecto es obligatorio.",
        "orden": "La orden es obligatoria.",
        "usuario": "El usuario es obligatorio.",
    }

    def new_context(self) -> PiezaImportContext:
        ordenes = {
            (orden.proyecto_id, normalize_text(orden.codigo_orden)): orden
            for orden in Orden.objects.exclude(proyecto=None).exclude(codigo_orden=None)
        }

        usuarios = CatalogLookup("El usuario no existe. Usa el correo o el nombre completo de un usuario registrado.")
        for usuario in AppUser.objects.all():
            if usuario.email:
                usuarios.register(usuario.email, usuario)
            usuarios.register(_nombre_completo(usuario), usuario)

        materias = CatalogLookup("La materia prima '{valor}' no existe.")
        for materia in MateriaPrima.objects.select_related("pieza_config"):
            materias.register(materia.nombre, materia)

        return PiezaImportContext(
            proyectos=_proyectos_lookup(),
            ordenes=ordenes,
            usuarios=usuarios,
            materias=materias,
            trace_ids=DuplicateTracker(Pieza.objects.values_list("trace_id", flat=True), "el trace ID"),
        )

    def validate_row(self, values, raw_row, context: PiezaImportContext) -> RowResult:
        datos = {campo: values[campo].strip() for campo in self.headers}
        errors = [mensaje for campo, mensaje in self.REQUIRED_MESSAGES.items() if not datos[campo]]

        if datos["trace_id"] and (error_trace := context.trace_ids.check(datos["trace_id"])):
            errors.append(error_trace)

        proyecto = context.proyectos.find(datos["proyecto"]) if datos["proyecto"] else None
        if datos["proyecto"] and proyecto is None:
            errors.append(context.proyectos.not_found_error(datos["proyecto"]))

        orden = None
        if proyecto is not None and datos["orden"]:
            orden = context.ordenes.get((proyecto.id, normalize_text(datos["orden"])))
            if orden is None:
                errors.append(f"La orden '{datos['orden']}' no existe en el proyecto '{proyecto.nombre}'.")

        usuario = context.usuarios.find(datos["usuario"]) if datos["usuario"] else None
        if datos["usuario"] and usuario is None:
            errors.append(context.usuarios.not_found_error(datos["usuario"]))

        fechas = {}
        try:
            fechas["fecha_gelcoat"] = parse_date(raw_row.get("fecha_gelcoat"), "La fecha de gelcoat")
        except ValueError as exc:
            errors.append(str(exc))
        try:
            fechas["fecha_qc"] = parse_optional_date(raw_row.get("fecha_qc"), "La fecha de QC")
        except ValueError as exc:
            errors.append(str(exc))

        peso = None
        if datos["peso_real"]:
            try:
                peso = parse_decimal(raw_row.get("peso_real"), "El peso real", masculine=True)
                if peso <= 0:
                    errors.append("El peso real debe ser mayor que cero.")
            except ValueError as exc:
                errors.append(str(exc))

        materiales, resumen_materiales = self._parse_materiales(datos["materiales"], context.materias, errors)

        payload = None
        if not errors:
            payload = {
                "orden_id": orden.id,
                "usuario_id": usuario.id,
                "trace_id": datos["trace_id"],
                "nombre": datos["nombre"],
                **fechas,
                "peso_real": str(peso) if peso is not None else None,
                "materias_primas": materiales,
            }

        return RowResult(
            errors=errors,
            payload=payload,
            resolved={
                "proyecto": proyecto.nombre if proyecto else None,
                "orden": orden.codigo_orden if orden else None,
                "usuario": _nombre_completo(usuario) if usuario else None,
                "materiales": resumen_materiales,
            },
        )

    @staticmethod
    def _parse_materiales(texto: str, materias: CatalogLookup, errors: list[str]) -> tuple[list[dict], str | None]:
        """Convierte "Resina: 20; Fibra: 10" en materiales de la pieza, con las reglas del formulario."""
        if not texto:
            return [], None

        materiales: list[dict] = []
        resumen: list[str] = []
        vistos: set[int] = set()

        for parte in filter(None, (trozo.strip() for trozo in re.split(r"[;\n]", texto))):
            nombre, separador, cantidad_texto = parte.rpartition(":" if ":" in parte else "=")
            nombre = nombre.strip()
            if not separador or not nombre:
                errors.append(f"El material '{parte}' debe tener el formato 'Material: cantidad'.")
                continue

            materia = materias.find(nombre)
            if materia is None:
                errors.append(materias.not_found_error(nombre))
                continue

            try:
                cantidad = parse_decimal(cantidad_texto, f"La cantidad de '{materia.nombre}'")
            except ValueError as exc:
                errors.append(str(exc))
                continue

            if cantidad <= 0:
                errors.append(f"La cantidad de '{materia.nombre}' debe ser mayor que cero.")
            elif not is_enabled_for_piezas(materia):
                errors.append(f"La materia prima '{materia.nombre}' está deshabilitada para nuevas piezas.")
            elif materia.id in vistos:
                errors.append(f"La materia prima '{materia.nombre}' está repetida en la pieza.")
            else:
                vistos.add(materia.id)
                materiales.append(
                    {"materia_prima_id": materia.id, "cantidad_teorica": str(cantidad), "cantidad_real": str(cantidad)}
                )
                resumen.append(f"{materia.nombre}: {cantidad}")

        return materiales, "; ".join(resumen) or None

    def save(self, payload, user):
        # El historial de creación se atribuye a quien importa, como al crear desde el formulario.
        serializer = PiezaSerializer(data=payload, context={"request": SimpleNamespace(user=user)})
        serializer.is_valid(raise_exception=True)
        return serializer.save()


def _nombre_completo(usuario: AppUser) -> str:
    return f"{usuario.nombre} {usuario.apellido or ''}".strip()


PIEZAS_IMPORT = PiezaImportSpec()
