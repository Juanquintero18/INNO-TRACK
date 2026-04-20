from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import AdminWritePermission
from apps.audit.services import create_audit_log
from apps.inventory.models import MateriaPrima, MovimientoInventario, Proveedor, TrabajadorProduccion, UnidadMedida
from apps.inventory.serializers import (
    MateriaPrimaSerializer,
    MovimientoInventarioSerializer,
    ProveedorSerializer,
    TrabajadorProduccionSerializer,
    UnidadMedidaSerializer,
)


class BaseInventoryViewSet(ModelViewSet):
    permission_classes = [AdminWritePermission]

    def perform_destroy(self, instance):
        create_audit_log(instance, self.request.user)
        instance.delete()


class UnidadMedidaViewSet(BaseInventoryViewSet):
    queryset = UnidadMedida.objects.all()
    serializer_class = UnidadMedidaSerializer


class ProveedorViewSet(BaseInventoryViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer


class TrabajadorProduccionViewSet(BaseInventoryViewSet):
    queryset = TrabajadorProduccion.objects.all()
    serializer_class = TrabajadorProduccionSerializer


class MateriaPrimaViewSet(BaseInventoryViewSet):
    queryset = MateriaPrima.objects.select_related("unidad_medida").all()
    serializer_class = MateriaPrimaSerializer


class MovimientoInventarioViewSet(BaseInventoryViewSet):
    queryset = MovimientoInventario.objects.select_related(
        "materia_prima",
        "proveedor",
        "usuario",
        "trabajador_produccion",
    ).all()
    serializer_class = MovimientoInventarioSerializer

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    def perform_update(self, serializer):
        serializer.save(usuario=self.request.user)