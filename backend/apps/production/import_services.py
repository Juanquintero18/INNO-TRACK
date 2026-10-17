"""Importaciones masivas del módulo de producción: proyectos y órdenes.

Cada clase describe una importación para el motor de `apps.common.importing`
con las mismas reglas de los formularios de la pantalla de Proyectos.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from apps.common.importing import (
    CatalogLookup,
    DuplicateTracker,
    ImportSpec,
    RowResult,
    normalize_lookup_key,
    normalize_text,
    parse_optional_date,
)
from apps.production.models import Orden, Proyecto
from apps.production.serializers import OrdenSerializer, ProyectoSerializer


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
        proyectos_registrados = list(Proyecto.objects.all())
        proyectos = CatalogLookup("El proyecto no existe. Usa el código o el nombre de un proyecto registrado.")
        # Primero los códigos: si un nombre coincide con el código de otro proyecto, gana el código.
        for proyecto in proyectos_registrados:
            if proyecto.codigo:
                proyectos.register(proyecto.codigo, proyecto)
        for proyecto in proyectos_registrados:
            proyectos.register(proyecto.nombre, proyecto)

        existentes = {
            (proyecto_id, normalize_text(codigo))
            for proyecto_id, codigo in Orden.objects.values_list("proyecto_id", "codigo_orden")
            if proyecto_id and codigo
        }
        return OrdenImportContext(proyectos=proyectos, existentes=existentes)

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
