from rest_framework import serializers

from apps.inventory.models import MateriaPrima, MovimientoInventario, Proveedor, TrabajadorProduccion, UnidadMedida
from apps.accounts.serializers import AppUserSerializer


class UnidadMedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadMedida
        fields = "__all__"


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = "__all__"


class TrabajadorProduccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrabajadorProduccion
        fields = "__all__"


class MateriaPrimaSerializer(serializers.ModelSerializer):
    unidad_medida = UnidadMedidaSerializer(read_only=True)
    unidad_medida_id = serializers.PrimaryKeyRelatedField(
        source="unidad_medida",
        queryset=UnidadMedida.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = MateriaPrima
        fields = ["id", "unidad_medida", "unidad_medida_id", "nombre", "costo", "fecha_actualizacion"]


class MovimientoInventarioSerializer(serializers.ModelSerializer):
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