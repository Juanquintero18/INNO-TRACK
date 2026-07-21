"""Vistas REST del módulo de producción.

Gestiona proyectos, órdenes, piezas, materiales de pieza e historial.
"""

from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import ValidationError

from apps.accounts.permissions import AdminOrTrabajadorWritePermission, AdminWritePermission
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
    """Base de permisos para endpoints de producción."""

    permission_classes = [AdminOrTrabajadorWritePermission]


class ProyectoViewSet(BaseProductionViewSet):
    """CRUD de proyectos con restricción de borrado por dependencias."""

    permission_classes = [AdminWritePermission]
    queryset = Proyecto.objects.all()
    serializer_class = ProyectoSerializer

    def perform_destroy(self, instance):
        """Bloquea borrado si existen órdenes asociadas al proyecto."""
        total_ordenes = instance.ordenes.count()
        if total_ordenes > 0:
            raise ValidationError(
                {
                    "detail": (
                        "No se puede eliminar este proyecto porque tiene "
                        f"{total_ordenes} orden(es) asociada(s)."
                    )
                }
            )
        instance.delete()


class OrdenViewSet(BaseProductionViewSet):
    """CRUD de órdenes con validación de integridad al eliminar."""

    permission_classes = [AdminWritePermission]
    queryset = Orden.objects.select_related("proyecto").all()
    serializer_class = OrdenSerializer

    def perform_destroy(self, instance):
        """Bloquea borrado si la orden tiene piezas relacionadas."""
        total_piezas = instance.piezas.count()
        if total_piezas > 0:
            raise ValidationError(
                {
                    "detail": (
                        "No se puede eliminar esta orden porque tiene "
                        f"{total_piezas} pieza(s) asociada(s)."
                    )
                }
            )
        instance.delete()


class PiezaViewSet(BaseProductionViewSet):
    """CRUD de piezas con prefetch para trazabilidad y materiales."""

    queryset = Pieza.objects.select_related("orden", "orden__proyecto", "usuario").prefetch_related(
        "materias_primas__materia_prima__unidad_medida",
        "historial__usuario",
    ).all()
    serializer_class = PiezaSerializer

    def perform_destroy(self, instance):
        """Audita eliminación y limpia relaciones hijas antes de borrar."""
        create_audit_log(instance, self.request.user)
        instance.materias_primas.all().delete()
        instance.historial.all().delete()
        instance.delete()


class PiezaMateriaPrimaViewSet(BaseProductionViewSet):
    """CRUD de la relación pieza-materia prima."""

    queryset = PiezaMateriaPrima.objects.select_related("pieza").all()
    serializer_class = PiezaMateriaPrimaSerializer


class PiezaHistorialViewSet(BaseProductionViewSet):
    """Consulta y mantenimiento de historial de cambios de piezas."""

    queryset = PiezaHistorial.objects.select_related("pieza").all()
    serializer_class = PiezaHistorialSerializer