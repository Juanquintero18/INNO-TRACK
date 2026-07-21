"""Serializers del dominio de inventario.

Incluye reglas de validación de stock, serialización de catálogos y
configuraciones de estabilidad/materiales habilitados para piezas.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.inventory.models import (
    DEFAULT_STOCK_BAJO_MAX,
    DEFAULT_STOCK_CRITICO_MAX,
    MateriaPrima,
    MateriaPrimaPiezaConfig,
    MateriaPrimaStabilityThreshold,
    MovimientoInventario,
    Proveedor,
    TrabajadorProduccion,
    UnidadMedida,
)
from apps.accounts.serializers import AppUserSerializer


class UnidadMedidaSerializer(serializers.ModelSerializer):
    """Serializa unidad de medida tal como se persiste en base de datos."""

    class Meta:
        model = UnidadMedida
        fields = "__all__"


class ProveedorSerializer(serializers.ModelSerializer):
    """Serializer CRUD para proveedores."""

    class Meta:
        model = Proveedor
        fields = "__all__"


class TrabajadorProduccionSerializer(serializers.ModelSerializer):
    """Serializer CRUD para trabajadores de producción."""

    class Meta:
        model = TrabajadorProduccion
        fields = "__all__"


class MateriaPrimaSerializer(serializers.ModelSerializer):
    """Expone materia prima junto con configuración de estabilidad y uso."""

    stability_thresholds = serializers.SerializerMethodField()
    enabled_for_piezas = serializers.SerializerMethodField()
    piezas_usage_count = serializers.SerializerMethodField()
    unidad_medida = UnidadMedidaSerializer(read_only=True)
    unidad_medida_id = serializers.PrimaryKeyRelatedField(
        source="unidad_medida",
        queryset=UnidadMedida.objects.all(),
        required=False,
        allow_null=True,
    )

    def get_stability_thresholds(self, obj: MateriaPrima):
        """Retorna umbrales configurados o valores por defecto del dominio."""
        try:
            config = obj.stability_config
        except MateriaPrimaStabilityThreshold.DoesNotExist:
            config = None

        if config is None:
            return {
                "stock_critico_max": DEFAULT_STOCK_CRITICO_MAX,
                "stock_bajo_max": DEFAULT_STOCK_BAJO_MAX,
            }

        return MateriaPrimaStabilityThresholdSerializer(config).data

    def get_enabled_for_piezas(self, obj: MateriaPrima):
        """Indica si la materia está habilitada para nuevas piezas."""
        try:
            config = obj.pieza_config
        except MateriaPrimaPiezaConfig.DoesNotExist:
            return True

        return bool(config.enabled_for_piezas)

    def get_piezas_usage_count(self, obj: MateriaPrima):
        """Cuenta en cuántas piezas está referenciada la materia prima."""
        annotated_value = getattr(obj, "piezas_usage_count", None)
        if annotated_value is not None:
            return int(annotated_value)

        return obj.piezas_materia_prima.count()

    class Meta:
        model = MateriaPrima
        fields = [
            "id",
            "unidad_medida",
            "unidad_medida_id",
            "nombre",
            "costo",
            "fecha_actualizacion",
            "stability_thresholds",
            "enabled_for_piezas",
            "piezas_usage_count",
        ]


class MateriaPrimaStabilityThresholdSerializer(serializers.ModelSerializer):
    """Valida y serializa umbrales de estabilidad de inventario."""

    class Meta:
        model = MateriaPrimaStabilityThreshold
        fields = ["stock_critico_max", "stock_bajo_max"]

    def validate(self, attrs):
        """Asegura coherencia entre umbral crítico y umbral bajo."""
        critico = attrs.get("stock_critico_max", getattr(self.instance, "stock_critico_max", DEFAULT_STOCK_CRITICO_MAX))
        bajo = attrs.get("stock_bajo_max", getattr(self.instance, "stock_bajo_max", DEFAULT_STOCK_BAJO_MAX))

        if critico < 0:
            raise serializers.ValidationError({"stock_critico_max": "El límite crítico no puede ser negativo."})

        if bajo <= critico:
            raise serializers.ValidationError({"stock_bajo_max": "El límite de stock bajo debe ser mayor que el límite crítico."})

        return attrs


class MateriaPrimaPiezasMaterialesSerializer(serializers.Serializer):
    """Payload para actualizar el conjunto permitido de materias en piezas."""

    enabled_materia_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    """Serializa movimientos y aplica validación de stock proyectado."""

    materia_prima = MateriaPrimaSerializer(read_only=True)
    proveedor = ProveedorSerializer(read_only=True)
    trabajador = TrabajadorProduccionSerializer(source="trabajador_produccion", read_only=True)
    usuario = AppUserSerializer(read_only=True)
    materia_prima_id = serializers.PrimaryKeyRelatedField(
        source="materia_prima",
        queryset=MateriaPrima.objects.all(),
        required=False,
        allow_null=True,
    )
    proveedor_id = serializers.PrimaryKeyRelatedField(
        source="proveedor",
        queryset=Proveedor.objects.all(),
        required=False,
        allow_null=True,
    )
    trabajador_produccion_id = serializers.PrimaryKeyRelatedField(
        source="trabajador_produccion",
        queryset=TrabajadorProduccion.objects.all(),
        required=False,
        allow_null=True,
    )
    usuario_id = serializers.PrimaryKeyRelatedField(source="usuario", read_only=True)

    def _movement_delta(self, tipo: str | None, cantidad: Decimal | None) -> Decimal:
        """Convierte tipo de movimiento a delta aritmético sobre stock."""
        amount = cantidad or Decimal("0")

        if tipo == "entrada":
            return amount
        if tipo == "salida":
            return -amount
        if tipo == "ajuste":
            return amount
        return Decimal("0")

    def _current_stock_without_instance(self, materia_prima: MateriaPrima) -> Decimal:
        """Calcula stock acumulado excluyendo instancia en edición (si existe)."""
        movimientos = MovimientoInventario.objects.filter(materia_prima=materia_prima)

        if self.instance and self.instance.pk:
            movimientos = movimientos.exclude(pk=self.instance.pk)

        stock = Decimal("0")
        for movimiento in movimientos:
            stock += self._movement_delta(movimiento.tipo, movimiento.cantidad)

        return stock

    def validate(self, attrs):
        """Evita guardar movimientos que dejen el stock en negativo."""
        attrs = super().validate(attrs)

        materia_prima = attrs.get("materia_prima", getattr(self.instance, "materia_prima", None))
        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))
        cantidad = attrs.get("cantidad", getattr(self.instance, "cantidad", None))

        if materia_prima is None or tipo is None or cantidad is None:
            return attrs

        projected_stock = self._current_stock_without_instance(materia_prima) + self._movement_delta(tipo, cantidad)

        if projected_stock < 0:
            raise serializers.ValidationError(
                {
                    "cantidad": (
                        f"Este movimiento dejaría el stock de '{materia_prima.nombre}' en negativo "
                        f"({projected_stock:.2f})."
                    )
                }
            )

        return attrs

    class Meta:
        model = MovimientoInventario
        fields = [
            "id",
            "materia_prima",
            "materia_prima_id",
            "proveedor",
            "proveedor_id",
            "usuario",
            "usuario_id",
            "trabajador",
            "trabajador_produccion_id",
            "tipo",
            "cantidad",
            "fecha",
            "motivo",
            "referencia",
        ]