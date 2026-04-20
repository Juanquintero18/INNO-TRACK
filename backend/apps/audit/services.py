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


def _actor_name(user: AppUser | None) -> str:
    if user is None:
        return ""
    return f"{user.nombre} {user.apellido or ''}".strip() or user.email or f"Usuario #{user.pk}"


def _serialize_instance(instance) -> dict[str, Any]:
    data: dict[str, Any] = {}

    for field in instance._meta.concrete_fields:
        data[field.attname] = getattr(instance, field.attname)

    return json.loads(json.dumps(data, cls=DjangoJSONEncoder))


def _serialize_pieza(instance: Pieza) -> dict[str, Any]:
    pieza_data = _serialize_instance(instance)
    pieza_data["materias_primas"] = [_serialize_instance(item) for item in instance.materias_primas.all().order_by("id")]
    pieza_data["historial"] = [_serialize_instance(item) for item in instance.historial.all().order_by("id")]
    return pieza_data


def build_entity_snapshot(instance) -> tuple[str, dict[str, Any]]:
    if isinstance(instance, Pieza):
        return AuditLog.ENTITY_PIEZA, _serialize_pieza(instance)
    if isinstance(instance, MateriaPrima):
        return AuditLog.ENTITY_MATERIA_PRIMA, _serialize_instance(instance)
    if isinstance(instance, MovimientoInventario):
        return AuditLog.ENTITY_MOVIMIENTO, _serialize_instance(instance)
    if isinstance(instance, Proveedor):
        return AuditLog.ENTITY_PROVEEDOR, _serialize_instance(instance)
    if isinstance(instance, TrabajadorProduccion):
        return AuditLog.ENTITY_TRABAJADOR, _serialize_instance(instance)
    if isinstance(instance, AppUser):
        return AuditLog.ENTITY_USUARIO, _serialize_instance(instance)
    raise ValueError("Tipo de entidad no soportado para auditoria.")


def build_entity_label(entity_type: str, snapshot: dict[str, Any]) -> str:
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
    entity_type: str
    entity_id: int


def _restore_materia_prima(snapshot: dict[str, Any]) -> None:
    MateriaPrima.objects.create(**snapshot)


def _restore_movimiento(snapshot: dict[str, Any]) -> None:
    MovimientoInventario.objects.create(**snapshot)


def _restore_proveedor(snapshot: dict[str, Any]) -> None:
    Proveedor.objects.create(**snapshot)


def _restore_trabajador(snapshot: dict[str, Any]) -> None:
    TrabajadorProduccion.objects.create(**snapshot)


def _restore_usuario(snapshot: dict[str, Any]) -> None:
    AppUser.objects.create(**snapshot)


def _restore_pieza(snapshot: dict[str, Any]) -> None:
    materiales = snapshot.pop("materias_primas", [])
    historial = snapshot.pop("historial", [])
    Pieza.objects.create(**snapshot)

    for material in materiales:
        PiezaMateriaPrima.objects.create(**material)

    for historial_item in historial:
        PiezaHistorial.objects.create(**historial_item)


@transaction.atomic
def restore_audit_log(audit_log: AuditLog, user: AppUser | None) -> RestoreResult:
    if audit_log.restored_at is not None:
        raise ValueError("Este registro ya fue restaurado.")

    snapshot = json.loads(json.dumps(audit_log.snapshot))

    if audit_log.entity_type == AuditLog.ENTITY_PIEZA:
        _restore_pieza(snapshot)
    elif audit_log.entity_type == AuditLog.ENTITY_MATERIA_PRIMA:
        _restore_materia_prima(snapshot)
    elif audit_log.entity_type == AuditLog.ENTITY_MOVIMIENTO:
        _restore_movimiento(snapshot)
    elif audit_log.entity_type == AuditLog.ENTITY_PROVEEDOR:
        _restore_proveedor(snapshot)
    elif audit_log.entity_type == AuditLog.ENTITY_TRABAJADOR:
        _restore_trabajador(snapshot)
    elif audit_log.entity_type == AuditLog.ENTITY_USUARIO:
        _restore_usuario(snapshot)
    else:
        raise ValueError("Tipo de entidad no soportado para restauracion.")

    audit_log.restored_at = timezone.now()
    audit_log.restored_by_id = getattr(user, "pk", None)
    audit_log.restored_by_nombre = _actor_name(user)
    audit_log.save(update_fields=["restored_at", "restored_by_id", "restored_by_nombre"])

    return RestoreResult(entity_type=audit_log.entity_type, entity_id=audit_log.entity_id)