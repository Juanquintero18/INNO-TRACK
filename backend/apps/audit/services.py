"""Servicios de auditoría para snapshot, borrado lógico y restauración.

Este módulo encapsula la lógica transversal que evita duplicar reglas de
auditoría dentro de cada ViewSet de dominio.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any

from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AppUser
from apps.audit.models import AuditLog
from apps.inventory.models import MateriaPrima, MovimientoInventario, Proveedor, TrabajadorProduccion
from apps.production.models import Pieza, PiezaHistorial, PiezaMateriaPrima


# Modelo de cada tipo de entidad que se audita al eliminarse.
AUDITED_MODELS = {
    AuditLog.ENTITY_PIEZA: Pieza,
    AuditLog.ENTITY_MATERIA_PRIMA: MateriaPrima,
    AuditLog.ENTITY_MOVIMIENTO: MovimientoInventario,
    AuditLog.ENTITY_PROVEEDOR: Proveedor,
    AuditLog.ENTITY_TRABAJADOR: TrabajadorProduccion,
    AuditLog.ENTITY_USUARIO: AppUser,
}


def _actor_name(user: AppUser | None) -> str:
    """Obtiene una etiqueta legible del usuario que ejecuta la acción."""

    if user is None:
        return ""
    return f"{user.nombre} {user.apellido or ''}".strip() or user.email or f"Usuario #{user.pk}"


def _serialize_instance(instance) -> dict[str, Any]:
    """Serializa campos concretos del modelo a un dict JSON-safe."""

    data = {field.attname: getattr(instance, field.attname) for field in instance._meta.concrete_fields}

    return json.loads(json.dumps(data, cls=DjangoJSONEncoder))


def _serialize_pieza(instance: Pieza) -> dict[str, Any]:
    """Serializa pieza con sus relaciones hijas para restauración completa."""

    pieza_data = _serialize_instance(instance)
    pieza_data["materias_primas"] = [_serialize_instance(item) for item in instance.materias_primas.all().order_by("id")]
    pieza_data["historial"] = [_serialize_instance(item) for item in instance.historial.all().order_by("id")]
    return pieza_data


def build_entity_snapshot(instance) -> tuple[str, dict[str, Any]]:
    """Normaliza tipo de entidad y snapshot según su modelo de origen."""

    for entity_type, model in AUDITED_MODELS.items():
        if isinstance(instance, model):
            serialize = _serialize_pieza if model is Pieza else _serialize_instance
            return entity_type, serialize(instance)

    raise ValueError("Tipo de entidad no soportado para auditoria.")


def build_entity_label(entity_type: str, snapshot: dict[str, Any]) -> str:
    """Construye una etiqueta amigable para mostrar en la bitácora."""

    if entity_type == AuditLog.ENTITY_PIEZA:
        return " - ".join(filter(None, [snapshot.get("trace_id"), snapshot.get("nombre")])) or f"Pieza #{snapshot['id']}"
    if entity_type == AuditLog.ENTITY_MATERIA_PRIMA:
        return snapshot.get("nombre") or f"Materia prima #{snapshot['id']}"
    if entity_type == AuditLog.ENTITY_MOVIMIENTO:
        return snapshot.get("referencia") or snapshot.get("motivo") or f"Movimiento #{snapshot['id']}"
    if entity_type == AuditLog.ENTITY_PROVEEDOR:
        return snapshot.get("nombre") or f"Proveedor #{snapshot['id']}"
    if entity_type == AuditLog.ENTITY_TRABAJADOR:
        return snapshot.get("nombre") or f"Trabajador #{snapshot['id']}"
    if entity_type == AuditLog.ENTITY_USUARIO:
        return (
            f"{snapshot.get('nombre', '')} {snapshot.get('apellido', '')}".strip()
            or snapshot.get("email")
            or f"Usuario #{snapshot['id']}"
        )
    return f"Registro #{snapshot['id']}"


def create_audit_log(instance, user: AppUser | None) -> AuditLog:
    """Crea un registro de auditoría al momento de eliminar una entidad."""

    entity_type, snapshot = build_entity_snapshot(instance)

    return AuditLog.objects.create(
        action=AuditLog.ACTION_DELETE,
        entity_type=entity_type,
        entity_id=instance.pk,
        entity_label=build_entity_label(entity_type, snapshot),
        snapshot=snapshot,
        deleted_by_id=getattr(user, "pk", None),
        deleted_by_nombre=_actor_name(user),
    )


@dataclass
class RestoreResult:
    """Respuesta mínima de restauración para la capa de API."""

    entity_type: str
    entity_id: int


def _restore_pieza(snapshot: dict[str, Any]) -> None:
    """Restaura pieza con sus materiales e historial asociados."""

    materiales = snapshot.pop("materias_primas", [])
    historial = snapshot.pop("historial", [])
    Pieza.objects.create(**snapshot)

    for material in materiales:
        PiezaMateriaPrima.objects.create(**material)

    for historial_item in historial:
        PiezaHistorial.objects.create(**historial_item)


def _restore_entity(entity_type: str, snapshot: dict[str, Any]) -> None:
    """Vuelve a crear el registro eliminado a partir de su snapshot."""

    model = AUDITED_MODELS.get(entity_type)

    if model is None:
        raise ValueError("Tipo de entidad no soportado para restauracion.")

    if model is Pieza:
        _restore_pieza(snapshot)
    else:
        model.objects.create(**snapshot)


@transaction.atomic
def restore_audit_log(audit_log: AuditLog, user: AppUser | None) -> RestoreResult:
    """Restaura una entidad auditada y marca el log como restaurado.

    La operación es atómica para evitar restauraciones parciales.
    """

    if audit_log.restored_at is not None:
        raise ValueError("Este registro ya fue restaurado.")

    # Copia profunda: la restauración consume el snapshot y el log debe quedar intacto.
    snapshot = json.loads(json.dumps(audit_log.snapshot))
    _restore_entity(audit_log.entity_type, snapshot)

    audit_log.restored_at = timezone.now()
    audit_log.restored_by_id = getattr(user, "pk", None)
    audit_log.restored_by_nombre = _actor_name(user)
    audit_log.save(update_fields=["restored_at", "restored_by_id", "restored_by_nombre"])

    return RestoreResult(entity_type=audit_log.entity_type, entity_id=audit_log.entity_id)
