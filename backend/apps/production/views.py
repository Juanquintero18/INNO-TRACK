from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import AdminWritePermission
from apps.audit.services import create_audit_log
from apps.production.models import Orden, Pieza, PiezaHistorial, PiezaMateriaPrima, Proyecto
from apps.production.serializers import (
    OrdenSerializer,
    PiezaHistorialSerializer,
    PiezaMateriaPrimaSerializer,
    PiezaSerializer,
    ProyectoSerializer,
)


class BaseProductionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]


class ProyectoViewSet(BaseProductionViewSet):
    permission_classes = [AdminWritePermission]
    queryset = Proyecto.objects.all()
    serializer_class = ProyectoSerializer


class OrdenViewSet(BaseProductionViewSet):
    permission_classes = [AdminWritePermission]
    queryset = Orden.objects.select_related("proyecto").all()
    serializer_class = OrdenSerializer


class PiezaViewSet(BaseProductionViewSet):
    queryset = Pieza.objects.select_related("orden", "orden__proyecto", "usuario").prefetch_related(
        "materias_primas__materia_prima__unidad_medida",
        "historial__usuario",
    ).all()
    serializer_class = PiezaSerializer

    def perform_destroy(self, instance):
        create_audit_log(instance, self.request.user)
        instance.materias_primas.all().delete()
        instance.historial.all().delete()
        instance.delete()


class PiezaMateriaPrimaViewSet(BaseProductionViewSet):
    queryset = PiezaMateriaPrima.objects.select_related("pieza").all()
    serializer_class = PiezaMateriaPrimaSerializer


class PiezaHistorialViewSet(BaseProductionViewSet):
    queryset = PiezaHistorial.objects.select_related("pieza").all()
    serializer_class = PiezaHistorialSerializer