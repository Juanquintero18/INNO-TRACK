"""Rutas del módulo inventory para CRUD e importación de movimientos."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.inventory.views import (
    MateriaPrimaViewSet,
    MovimientoInventarioImportCommitView,
    MovimientoInventarioImportPreviewView,
    MovimientoInventarioImportTemplateView,
    MovimientoInventarioViewSet,
    ProveedorViewSet,
    TrabajadorProduccionViewSet,
    UnidadMedidaViewSet,
)


router = DefaultRouter()
router.register("unidades-medida", UnidadMedidaViewSet, basename="unidad-medida")
router.register("proveedores", ProveedorViewSet, basename="proveedor")
router.register("trabajadores", TrabajadorProduccionViewSet, basename="trabajador")
router.register("materias-primas", MateriaPrimaViewSet, basename="materia-prima")
router.register("movimientos", MovimientoInventarioViewSet, basename="movimiento")

urlpatterns = [
    path("movimientos/import/template/", MovimientoInventarioImportTemplateView.as_view(), name="movimiento-import-template"),
    path("movimientos/import/preview/", MovimientoInventarioImportPreviewView.as_view(), name="movimiento-import-preview"),
    path("movimientos/import/commit/", MovimientoInventarioImportCommitView.as_view(), name="movimiento-import-commit"),
]

urlpatterns += router.urls