from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import AppUser
from apps.accounts.serializers import AppUserSerializer
from apps.inventory.models import MateriaPrima
from apps.inventory.serializers import MateriaPrimaSerializer
from apps.production.models import Orden, Pieza, PiezaHistorial, PiezaMateriaPrima, Proyecto


class ProyectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proyecto
        fields = "__all__"


class OrdenSerializer(serializers.ModelSerializer):
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
    usuario = AppUserSerializer(read_only=True)
    usuario_id = serializers.IntegerField(source="usuario.id", read_only=True)

    class Meta:
        model = PiezaHistorial
        fields = ["id", "accion", "fecha", "descripcion", "usuario", "usuario_id"]


class PiezaSerializer(serializers.ModelSerializer):
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

    def _sync_materials(self, pieza: Pieza, materiales_data: list[dict]) -> None:
        pieza.materias_primas.all().delete()

        for material_data in materiales_data:
            PiezaMateriaPrima.objects.create(pieza=pieza, **material_data)

    def _append_historial(self, pieza: Pieza, accion: str) -> None:
        request = self.context.get("request")
        actor = None

        if request is not None and getattr(request, "user", None) is not None and getattr(request.user, "is_authenticated", False):
            actor = request.user

        PiezaHistorial.objects.create(
            pieza=pieza,
            usuario=actor,
            accion=accion,
            descripcion=(
                "Pieza creada desde la API."
                if accion == "creacion"
                else "Pieza actualizada desde la API."
            ),
            fecha=timezone.now(),
        )

    def create(self, validated_data):
        materiales_data = validated_data.pop("materias_primas", [])
        pieza = Pieza.objects.create(**validated_data)
        self._sync_materials(pieza, materiales_data)
        self._append_historial(pieza, "creacion")
        return pieza

    def update(self, instance, validated_data):
        materiales_data = validated_data.pop("materias_primas", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if materiales_data is not None:
            self._sync_materials(instance, materiales_data)

        self._append_historial(instance, "edicion")

        return instance