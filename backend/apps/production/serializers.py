"""Serializers del dominio de producción.

Incluye proyectos/órdenes/piezas y la lógica de historial detallado para
trazabilidad de cambios en piezas y materiales asociados.
"""

import json
from datetime import timezone as datetime_timezone
from zoneinfo import ZoneInfo

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import AppUser
from apps.accounts.serializers import AppUserSerializer
from apps.inventory.models import MateriaPrima, MateriaPrimaPiezaConfig
from apps.inventory.serializers import MateriaPrimaSerializer
from apps.production.models import Orden, Pieza, PiezaHistorial, PiezaMateriaPrima, Proyecto


PIEZA_HISTORIAL_SCHEMA = "pieza_historial_v1"
BOGOTA_TIMEZONE = ZoneInfo("America/Bogota")
TRACKED_PIEZA_FIELDS = (
    "trace_id",
    "nombre",
    "orden_id",
    "usuario_id",
    "fecha_gelcoat",
    "fecha_qc",
    "peso_real",
)
PIEZA_FIELD_LABELS = {
    "trace_id": "Trace ID",
    "nombre": "Nombre",
    "orden_id": "Orden",
    "usuario_id": "Usuario responsable",
    "fecha_gelcoat": "Fecha gelcoat",
    "fecha_qc": "Fecha QC",
    "peso_real": "Peso real",
}


class ProyectoSerializer(serializers.ModelSerializer):
    """Serializer CRUD de proyectos."""

    class Meta:
        model = Proyecto
        fields = "__all__"


class OrdenSerializer(serializers.ModelSerializer):
    """Serializer de órdenes con referencia expandida al proyecto."""

    proyecto = ProyectoSerializer(read_only=True)
    proyecto_id = serializers.PrimaryKeyRelatedField(
        source="proyecto",
        queryset=Proyecto.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Orden
        fields = ["id", "proyecto", "proyecto_id", "codigo_orden", "fecha_creacion", "estado"]


class PiezaMateriaPrimaSerializer(serializers.ModelSerializer):
    """Serializa relación pieza-materia prima con cantidades teórica/real."""

    materia_prima = MateriaPrimaSerializer(read_only=True)
    pieza_id = serializers.IntegerField(source="pieza.id", read_only=True)
    materia_prima_id = serializers.PrimaryKeyRelatedField(
        source="materia_prima",
        queryset=MateriaPrima.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = PiezaMateriaPrima
        fields = [
            "id",
            "pieza_id",
            "materia_prima",
            "materia_prima_id",
            "cantidad_teorica",
            "cantidad_real",
        ]


class PiezaHistorialSerializer(serializers.ModelSerializer):
    """Expone historial de piezas con compatibilidad entre esquemas legacy/v1."""

    descripcion = serializers.SerializerMethodField()
    detalle = serializers.SerializerMethodField()
    fecha = serializers.SerializerMethodField()
    usuario = AppUserSerializer(read_only=True)
    usuario_id = serializers.IntegerField(source="usuario.id", read_only=True)

    class Meta:
        model = PiezaHistorial
        fields = ["id", "accion", "fecha", "descripcion", "detalle", "usuario", "usuario_id"]

    def _get_payload(self, obj: PiezaHistorial) -> dict | None:
        """Lee y cachea payload estructurado cuando existe en descripcion."""
        cache_attr = "_historial_payload_cache"

        if hasattr(obj, cache_attr):
            return getattr(obj, cache_attr)

        payload = None

        if obj.descripcion:
            try:
                parsed = json.loads(obj.descripcion)
                if isinstance(parsed, dict) and parsed.get("schema") == PIEZA_HISTORIAL_SCHEMA:
                    payload = parsed
            except (TypeError, ValueError):
                payload = None

        setattr(obj, cache_attr, payload)
        return payload

    def get_fecha(self, obj: PiezaHistorial) -> str | None:
        """Normaliza fecha histórica y la serializa en zona horaria de Bogotá."""
        fecha = obj.fecha

        if fecha is None:
            return None

        # La columna legacy "pieza_historial.fecha" es timestamp sin zona.
        # Se guardaba con hora UTC y al serializar se interpretaba como local,
        # provocando un desfase de +5h en Colombia.
        if timezone.is_naive(fecha):
            fecha = fecha.replace(tzinfo=datetime_timezone.utc)

        return fecha.astimezone(BOGOTA_TIMEZONE).isoformat()

    def _build_legacy_payload(self, obj: PiezaHistorial) -> dict:
        """Construye estructura v1 para registros antiguos sin diff detallado."""
        raw_description = (obj.descripcion or "").strip()
        default_summary = (
            "Creación registrada en una versión anterior del historial. "
            "En ese momento aún no se almacenaba comparación campo a campo."
            if obj.accion == "creacion"
            else "Edición registrada en una versión anterior del historial. "
            "En ese momento aún no se almacenaba comparación campo a campo."
        )

        if raw_description.casefold() in {
            "pieza creada desde la api.",
            "pieza actualizada desde la api.",
        }:
            summary = default_summary
        else:
            summary = raw_description or default_summary

        return {
            "schema": PIEZA_HISTORIAL_SCHEMA,
            "accion": obj.accion,
            "summary": summary,
            "legacy": True,
            "field_changes": [],
            "material_changes": [],
        }

    def get_descripcion(self, obj: PiezaHistorial) -> str:
        """Entrega resumen legible del evento de historial."""
        payload = self.get_detalle(obj)

        if payload and isinstance(payload.get("summary"), str):
            return payload["summary"]

        return obj.descripcion

    def get_detalle(self, obj: PiezaHistorial):
        """Retorna payload estructurado, o reconstrucción legacy si aplica."""
        payload = self._get_payload(obj)
        if payload is not None:
            return payload
        return self._build_legacy_payload(obj)


class PiezaSerializer(serializers.ModelSerializer):
    """Serializer principal de pieza con sincronización y trazabilidad."""

    orden = OrdenSerializer(read_only=True)
    orden_id = serializers.PrimaryKeyRelatedField(
        source="orden",
        queryset=Orden.objects.all(),
        required=False,
        allow_null=True,
    )
    usuario = AppUserSerializer(read_only=True)
    usuario_id = serializers.PrimaryKeyRelatedField(
        source="usuario",
        queryset=AppUser.objects.all(),
        required=False,
        allow_null=True,
    )
    materias_primas = PiezaMateriaPrimaSerializer(many=True, required=False)
    historial = PiezaHistorialSerializer(many=True, read_only=True)

    class Meta:
        model = Pieza
        fields = [
            "id",
            "orden",
            "orden_id",
            "usuario",
            "usuario_id",
            "trace_id",
            "nombre",
            "fecha_gelcoat",
            "fecha_qc",
            "peso_real",
            "materias_primas",
            "historial",
        ]

    def _is_enabled_for_piezas(self, materia_prima: MateriaPrima) -> bool:
        """Indica si una materia puede agregarse a nuevas piezas."""
        try:
            config = materia_prima.pieza_config
        except MateriaPrimaPiezaConfig.DoesNotExist:
            return True

        return bool(config.enabled_for_piezas)

    def _validate_materials_for_piece(self, pieza: Pieza | None, materiales_data: list[dict] | None) -> None:
        """Evita asociar materias deshabilitadas en nuevas asignaciones."""
        if materiales_data is None:
            return

        current_material_ids = set()
        if pieza is not None and pieza.pk:
            current_material_ids = set(pieza.materias_primas.values_list("materia_prima_id", flat=True))

        blocked_materials: list[str] = []

        for material_data in materiales_data:
            materia_prima = material_data.get("materia_prima")

            if materia_prima is None:
                continue

            if self._is_enabled_for_piezas(materia_prima):
                continue

            # Se permite conservar materiales históricos ya asociados a la pieza.
            if materia_prima.id in current_material_ids:
                continue

            blocked_materials.append(materia_prima.nombre or f"Materia prima #{materia_prima.id}")

        if blocked_materials:
            blocked_text = ", ".join(sorted(set(blocked_materials)))
            raise serializers.ValidationError(
                {
                    "materias_primas": [
                        "Estas materias primas no están habilitadas para nuevos registros en piezas: "
                        f"{blocked_text}. Configúralas desde el módulo de Piezas."
                    ]
                }
            )

    def _sync_materials(self, pieza: Pieza, materiales_data: list[dict]) -> None:
        """Reemplaza materiales de una pieza con el estado enviado por cliente."""
        pieza.materias_primas.all().delete()

        for material_data in materiales_data:
            PiezaMateriaPrima.objects.create(pieza=pieza, **material_data)

    def _serialize_material_value(self, value):
        """Normaliza valores numéricos para snapshots JSON."""
        if value is None:
            return None

        return str(value)

    def _build_materials_snapshot(self, pieza: Pieza) -> list[dict]:
        """Toma foto de materiales actuales para auditoría de cambios."""
        materials_snapshot: list[dict] = []

        for material in pieza.materias_primas.select_related("materia_prima").all().order_by("materia_prima_id", "id"):
            material_id = material.materia_prima_id
            material_name = (
                material.materia_prima.nombre
                if material.materia_prima is not None
                else (f"Materia prima #{material_id}" if material_id else "Materia prima sin referencia")
            )

            materials_snapshot.append(
                {
                    "materia_prima_id": material_id,
                    "materia_prima_nombre": material_name,
                    "cantidad_teorica": self._serialize_material_value(material.cantidad_teorica),
                    "cantidad_real": self._serialize_material_value(material.cantidad_real),
                }
            )

        return materials_snapshot

    def _build_pieza_snapshot(self, pieza: Pieza) -> dict:
        """Construye snapshot completo del estado funcional de la pieza."""
        return {
            "trace_id": pieza.trace_id,
            "nombre": pieza.nombre,
            "orden_id": pieza.orden_id,
            "usuario_id": pieza.usuario_id,
            "fecha_gelcoat": pieza.fecha_gelcoat.isoformat() if pieza.fecha_gelcoat else None,
            "fecha_qc": pieza.fecha_qc.isoformat() if pieza.fecha_qc else None,
            "peso_real": self._serialize_material_value(pieza.peso_real),
            "materias_primas": self._build_materials_snapshot(pieza),
        }

    def _build_field_changes(self, before_snapshot: dict, after_snapshot: dict) -> list[dict]:
        """Calcula diferencias campo a campo entre snapshots."""
        field_changes: list[dict] = []

        for field_name in TRACKED_PIEZA_FIELDS:
            before_value = before_snapshot.get(field_name)
            after_value = after_snapshot.get(field_name)

            if before_value == after_value:
                continue

            field_changes.append(
                {
                    "field": field_name,
                    "label": PIEZA_FIELD_LABELS.get(field_name, field_name),
                    "before": before_value,
                    "after": after_value,
                }
            )

        return field_changes

    def _build_material_changes(self, before_materials: list[dict], after_materials: list[dict]) -> list[dict]:
        """Detecta altas, bajas y actualizaciones en materias primas."""

        def material_key(material: dict) -> str:
            material_id = material.get("materia_prima_id")
            material_name = material.get("materia_prima_nombre") or ""
            # Mezcla ID y nombre para conservar rastreo incluso con datos legacy incompletos.
            return f"{material_id}|{material_name}"

        before_map = {material_key(item): item for item in before_materials}
        after_map = {material_key(item): item for item in after_materials}

        material_changes: list[dict] = []

        # Unión ordenada para detectar altas, bajas y cambios aunque cambie el orden original.
        for key in sorted(set(before_map) | set(after_map)):
            before_item = before_map.get(key)
            after_item = after_map.get(key)

            if before_item is None and after_item is not None:
                material_changes.append(
                    {
                        "change_type": "agregado",
                        "materia_prima_id": after_item.get("materia_prima_id"),
                        "materia_prima_nombre": after_item.get("materia_prima_nombre"),
                        "before": None,
                        "after": {
                            "cantidad_teorica": after_item.get("cantidad_teorica"),
                            "cantidad_real": after_item.get("cantidad_real"),
                        },
                    }
                )
                continue

            if after_item is None and before_item is not None:
                material_changes.append(
                    {
                        "change_type": "eliminado",
                        "materia_prima_id": before_item.get("materia_prima_id"),
                        "materia_prima_nombre": before_item.get("materia_prima_nombre"),
                        "before": {
                            "cantidad_teorica": before_item.get("cantidad_teorica"),
                            "cantidad_real": before_item.get("cantidad_real"),
                        },
                        "after": None,
                    }
                )
                continue

            if before_item is None or after_item is None:
                continue

            if (
                before_item.get("cantidad_teorica") == after_item.get("cantidad_teorica")
                and before_item.get("cantidad_real") == after_item.get("cantidad_real")
            ):
                continue

            material_changes.append(
                {
                    "change_type": "actualizado",
                    "materia_prima_id": after_item.get("materia_prima_id") or before_item.get("materia_prima_id"),
                    "materia_prima_nombre": after_item.get("materia_prima_nombre") or before_item.get("materia_prima_nombre"),
                    "before": {
                        "cantidad_teorica": before_item.get("cantidad_teorica"),
                        "cantidad_real": before_item.get("cantidad_real"),
                    },
                    "after": {
                        "cantidad_teorica": after_item.get("cantidad_teorica"),
                        "cantidad_real": after_item.get("cantidad_real"),
                    },
                }
            )

        return material_changes

    def _build_historial_payload(self, accion: str, before_snapshot: dict | None, after_snapshot: dict) -> dict:
        """Genera payload estructurado del evento de historial a persistir."""
        if accion == "creacion":
            material_count = len(after_snapshot.get("materias_primas", []))

            return {
                "schema": PIEZA_HISTORIAL_SCHEMA,
                "accion": accion,
                "summary": (
                    "Pieza creada desde la API con "
                    f"{material_count} materia(s) prima(s) asociada(s)."
                ),
                "initial": after_snapshot,
            }

        before_data = before_snapshot or {}
        field_changes = self._build_field_changes(before_data, after_snapshot)
        material_changes = self._build_material_changes(
            before_data.get("materias_primas", []),
            after_snapshot.get("materias_primas", []),
        )

        summary_parts: list[str] = []

        if field_changes:
            summary_parts.append(f"{len(field_changes)} campo(s)")
        if material_changes:
            summary_parts.append(f"{len(material_changes)} cambio(s) en materias primas")

        summary = (
            "Se guardó la edición de la pieza sin cambios detectados en campos principales."
            if not summary_parts
            else "Se actualizó la pieza desde la API: " + " y ".join(summary_parts) + "."
        )

        return {
            "schema": PIEZA_HISTORIAL_SCHEMA,
            "accion": accion,
            "summary": summary,
            "field_changes": field_changes,
            "material_changes": material_changes,
            "before": before_data,
            "after": after_snapshot,
        }

    def _append_historial(self, pieza: Pieza, accion: str, before_snapshot: dict | None = None, after_snapshot: dict | None = None) -> None:
        """Persiste evento de historial después de create/update exitoso."""
        request = self.context.get("request")
        actor = None

        if request is not None and getattr(request, "user", None) is not None and getattr(request.user, "is_authenticated", False):
            actor = request.user

        # Se guarda snapshot final para que el historial refleje el estado persistido.
        current_snapshot = after_snapshot or self._build_pieza_snapshot(pieza)
        payload = self._build_historial_payload(accion, before_snapshot=before_snapshot, after_snapshot=current_snapshot)

        PiezaHistorial.objects.create(
            pieza=pieza,
            usuario=actor,
            accion=accion,
            descripcion=json.dumps(payload, ensure_ascii=False, cls=DjangoJSONEncoder),
            fecha=timezone.now(),
        )

    def create(self, validated_data):
        """Crea pieza, sincroniza materiales y registra historial de creación."""
        # Create y update comparten validación + sincronización para mantener trazabilidad consistente.
        materiales_data = validated_data.pop("materias_primas", [])
        self._validate_materials_for_piece(None, materiales_data)
        pieza = Pieza.objects.create(**validated_data)
        self._sync_materials(pieza, materiales_data)
        pieza.refresh_from_db()
        self._append_historial(pieza, "creacion", after_snapshot=self._build_pieza_snapshot(pieza))
        return pieza

    def update(self, instance, validated_data):
        """Actualiza pieza, recalcula snapshot y registra historial de edición."""
        materiales_data = validated_data.pop("materias_primas", None)
        before_snapshot = self._build_pieza_snapshot(instance)

        self._validate_materials_for_piece(instance, materiales_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if materiales_data is not None:
            self._sync_materials(instance, materiales_data)

        instance.refresh_from_db()
        after_snapshot = self._build_pieza_snapshot(instance)
        self._append_historial(instance, "edicion", before_snapshot=before_snapshot, after_snapshot=after_snapshot)

        return instance