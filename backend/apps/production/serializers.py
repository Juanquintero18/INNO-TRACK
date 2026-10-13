"""Serializers del dominio de producción.

Incluye proyectos/órdenes/piezas. La construcción del historial detallado de
cambios en piezas vive en `apps.production.historial`.
"""

from datetime import timezone as datetime_timezone
from zoneinfo import ZoneInfo

from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import AppUser
from apps.accounts.serializers import AppUserSerializer
from apps.inventory.models import MateriaPrima
from apps.inventory.serializers import MateriaPrimaSerializer
from apps.inventory.services import is_enabled_for_piezas
from apps.production.historial import (
    ACCION_CREACION,
    ACCION_EDICION,
    build_legacy_payload,
    build_pieza_snapshot,
    parse_historial_payload,
    record_historial,
)
from apps.production.models import Orden, Pieza, PiezaHistorial, PiezaMateriaPrima, Proyecto


BOGOTA_TIMEZONE = ZoneInfo("America/Bogota")


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

    def get_detalle(self, obj: PiezaHistorial) -> dict:
        """Retorna payload estructurado, o reconstrucción legacy si aplica."""
        # `descripcion` y `detalle` se derivan del mismo payload: se calcula una vez por evento.
        cache_attr = "_historial_detalle_cache"

        if not hasattr(obj, cache_attr):
            payload = parse_historial_payload(obj.descripcion) or build_legacy_payload(obj.accion, obj.descripcion)
            setattr(obj, cache_attr, payload)

        return getattr(obj, cache_attr)

    def get_descripcion(self, obj: PiezaHistorial) -> str:
        """Entrega resumen legible del evento de historial."""
        summary = self.get_detalle(obj).get("summary")

        return summary if isinstance(summary, str) else obj.descripcion


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

    def _validate_materials_for_piece(self, pieza: Pieza | None, materiales_data: list[dict] | None) -> None:
        """Evita asociar materias deshabilitadas en nuevas asignaciones."""
        if materiales_data is None:
            return

        # Se permite conservar materiales históricos ya asociados a la pieza.
        current_material_ids = set()
        if pieza is not None and pieza.pk:
            current_material_ids = set(pieza.materias_primas.values_list("materia_prima_id", flat=True))

        blocked_materials = {
            materia_prima.nombre or f"Materia prima #{materia_prima.id}"
            for materia_prima in (material_data.get("materia_prima") for material_data in materiales_data)
            if materia_prima is not None
            and not is_enabled_for_piezas(materia_prima)
            and materia_prima.id not in current_material_ids
        }

        if blocked_materials:
            blocked_text = ", ".join(sorted(blocked_materials))
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

    def _actor(self) -> AppUser | None:
        """Usuario autenticado de la petición, a quien se atribuye el cambio."""
        user = getattr(self.context.get("request"), "user", None)

        return user if getattr(user, "is_authenticated", False) else None

    def create(self, validated_data):
        """Crea pieza, sincroniza materiales y registra historial de creación."""
        materiales_data = validated_data.pop("materias_primas", [])
        self._validate_materials_for_piece(None, materiales_data)

        pieza = Pieza.objects.create(**validated_data)
        self._sync_materials(pieza, materiales_data)
        pieza.refresh_from_db()

        record_historial(pieza, ACCION_CREACION, self._actor(), before_snapshot=None, after_snapshot=build_pieza_snapshot(pieza))
        return pieza

    def update(self, instance, validated_data):
        """Actualiza pieza, recalcula snapshot y registra historial de edición."""
        # `None` significa que el cliente no envió materiales: se conservan los actuales.
        materiales_data = validated_data.pop("materias_primas", None)
        before_snapshot = build_pieza_snapshot(instance)

        self._validate_materials_for_piece(instance, materiales_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if materiales_data is not None:
            self._sync_materials(instance, materiales_data)

        instance.refresh_from_db()

        # Se guarda snapshot final para que el historial refleje el estado persistido.
        record_historial(instance, ACCION_EDICION, self._actor(), before_snapshot=before_snapshot, after_snapshot=build_pieza_snapshot(instance))
        return instance
