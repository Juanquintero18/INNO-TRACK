"""Historial de cambios de piezas.

Cada creación o edición de una pieza guarda un evento con un resumen legible y,
desde el esquema `pieza_historial_v1`, el detalle de qué campos y materiales
cambiaron. Este módulo construye ese detalle y lo lee de vuelta, incluidos los
eventos antiguos que solo guardaron un texto libre.
"""

import json

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone

from apps.production.models import Pieza, PiezaHistorial


PIEZA_HISTORIAL_SCHEMA = "pieza_historial_v1"
ACCION_CREACION = "creacion"
ACCION_EDICION = "edicion"

PIEZA_FIELD_LABELS = {
    "trace_id": "Trace ID",
    "nombre": "Nombre",
    "orden_id": "Orden",
    "usuario_id": "Usuario responsable",
    "fecha_gelcoat": "Fecha gelcoat",
    "fecha_qc": "Fecha QC",
    "peso_real": "Peso real",
}
TRACKED_PIEZA_FIELDS = tuple(PIEZA_FIELD_LABELS)

# Textos que guardaban las versiones anteriores y que no aportan información.
_GENERIC_LEGACY_DESCRIPTIONS = {
    "pieza creada desde la api.",
    "pieza actualizada desde la api.",
}


def _decimal_to_text(value):
    """Normaliza valores numéricos para snapshots JSON."""
    return None if value is None else str(value)


def _material_state(material: dict) -> dict:
    """Cantidades de un material, tal como se comparan entre snapshots."""
    return {
        "cantidad_teorica": material.get("cantidad_teorica"),
        "cantidad_real": material.get("cantidad_real"),
    }


def build_materials_snapshot(pieza: Pieza) -> list[dict]:
    """Toma foto de materiales actuales para auditoría de cambios."""
    snapshot: list[dict] = []
    materiales = pieza.materias_primas.select_related("materia_prima").all().order_by("materia_prima_id", "id")

    for material in materiales:
        material_id = material.materia_prima_id

        if material.materia_prima is not None:
            material_name = material.materia_prima.nombre
        elif material_id:
            material_name = f"Materia prima #{material_id}"
        else:
            material_name = "Materia prima sin referencia"

        snapshot.append(
            {
                "materia_prima_id": material_id,
                "materia_prima_nombre": material_name,
                "cantidad_teorica": _decimal_to_text(material.cantidad_teorica),
                "cantidad_real": _decimal_to_text(material.cantidad_real),
            }
        )

    return snapshot


def build_pieza_snapshot(pieza: Pieza) -> dict:
    """Construye snapshot completo del estado funcional de la pieza."""
    return {
        "trace_id": pieza.trace_id,
        "nombre": pieza.nombre,
        "orden_id": pieza.orden_id,
        "usuario_id": pieza.usuario_id,
        "fecha_gelcoat": pieza.fecha_gelcoat.isoformat() if pieza.fecha_gelcoat else None,
        "fecha_qc": pieza.fecha_qc.isoformat() if pieza.fecha_qc else None,
        "peso_real": _decimal_to_text(pieza.peso_real),
        "materias_primas": build_materials_snapshot(pieza),
    }


def build_field_changes(before_snapshot: dict, after_snapshot: dict) -> list[dict]:
    """Calcula diferencias campo a campo entre snapshots."""
    return [
        {
            "field": field_name,
            "label": PIEZA_FIELD_LABELS[field_name],
            "before": before_snapshot.get(field_name),
            "after": after_snapshot.get(field_name),
        }
        for field_name in TRACKED_PIEZA_FIELDS
        if before_snapshot.get(field_name) != after_snapshot.get(field_name)
    ]


def _material_key(material: dict) -> str:
    # Mezcla ID y nombre para conservar rastreo incluso con datos legacy incompletos.
    return f"{material.get('materia_prima_id')}|{material.get('materia_prima_nombre') or ''}"


def build_material_changes(before_materials: list[dict], after_materials: list[dict]) -> list[dict]:
    """Detecta altas, bajas y actualizaciones en materias primas."""
    before_map = {_material_key(item): item for item in before_materials}
    after_map = {_material_key(item): item for item in after_materials}
    changes: list[dict] = []

    # Unión ordenada para detectar altas, bajas y cambios aunque cambie el orden original.
    for key in sorted(set(before_map) | set(after_map)):
        before_item = before_map.get(key)
        after_item = after_map.get(key)

        if before_item is None:
            change_type, identity = "agregado", after_item
        elif after_item is None:
            change_type, identity = "eliminado", before_item
        elif _material_state(before_item) != _material_state(after_item):
            change_type = "actualizado"
            # Se prefiere la identificación más reciente y se completa con la anterior.
            identity = {
                field: after_item.get(field) or before_item.get(field)
                for field in ("materia_prima_id", "materia_prima_nombre")
            }
        else:
            continue

        changes.append(
            {
                "change_type": change_type,
                "materia_prima_id": identity.get("materia_prima_id"),
                "materia_prima_nombre": identity.get("materia_prima_nombre"),
                "before": _material_state(before_item) if before_item is not None else None,
                "after": _material_state(after_item) if after_item is not None else None,
            }
        )

    return changes


def build_historial_payload(accion: str, before_snapshot: dict | None, after_snapshot: dict) -> dict:
    """Genera payload estructurado del evento de historial a persistir."""
    if accion == ACCION_CREACION:
        material_count = len(after_snapshot.get("materias_primas", []))

        return {
            "schema": PIEZA_HISTORIAL_SCHEMA,
            "accion": accion,
            "summary": f"Pieza creada desde la API con {material_count} materia(s) prima(s) asociada(s).",
            "initial": after_snapshot,
        }

    before_data = before_snapshot or {}
    field_changes = build_field_changes(before_data, after_snapshot)
    material_changes = build_material_changes(
        before_data.get("materias_primas", []),
        after_snapshot.get("materias_primas", []),
    )

    summary_parts: list[str] = []
    if field_changes:
        summary_parts.append(f"{len(field_changes)} campo(s)")
    if material_changes:
        summary_parts.append(f"{len(material_changes)} cambio(s) en materias primas")

    if summary_parts:
        summary = "Se actualizó la pieza desde la API: " + " y ".join(summary_parts) + "."
    else:
        summary = "Se guardó la edición de la pieza sin cambios detectados en campos principales."

    return {
        "schema": PIEZA_HISTORIAL_SCHEMA,
        "accion": accion,
        "summary": summary,
        "field_changes": field_changes,
        "material_changes": material_changes,
        "before": before_data,
        "after": after_snapshot,
    }


def record_historial(pieza: Pieza, accion: str, actor, before_snapshot: dict | None, after_snapshot: dict) -> PiezaHistorial:
    """Persiste el evento de historial de una creación o edición ya guardada."""
    payload = build_historial_payload(accion, before_snapshot=before_snapshot, after_snapshot=after_snapshot)

    return PiezaHistorial.objects.create(
        pieza=pieza,
        usuario=actor,
        accion=accion,
        descripcion=json.dumps(payload, ensure_ascii=False, cls=DjangoJSONEncoder),
        fecha=timezone.now(),
    )


def parse_historial_payload(descripcion: str | None) -> dict | None:
    """Lee el payload estructurado de un evento; `None` si es un evento antiguo."""
    if not descripcion:
        return None

    try:
        parsed = json.loads(descripcion)
    except (TypeError, ValueError):
        return None

    if isinstance(parsed, dict) and parsed.get("schema") == PIEZA_HISTORIAL_SCHEMA:
        return parsed

    return None


def build_legacy_payload(accion: str, descripcion: str | None) -> dict:
    """Construye estructura v1 para registros antiguos sin diff detallado."""
    raw_description = (descripcion or "").strip()
    tipo = "Creación" if accion == ACCION_CREACION else "Edición"
    default_summary = (
        f"{tipo} registrada en una versión anterior del historial. "
        "En ese momento aún no se almacenaba comparación campo a campo."
    )

    if raw_description.casefold() in _GENERIC_LEGACY_DESCRIPTIONS:
        summary = default_summary
    else:
        summary = raw_description or default_summary

    return {
        "schema": PIEZA_HISTORIAL_SCHEMA,
        "accion": accion,
        "summary": summary,
        "legacy": True,
        "field_changes": [],
        "material_changes": [],
    }
