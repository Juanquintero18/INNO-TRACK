"""Rutas del módulo inventory: CRUD de catálogos y movimientos, e importaciones desde Excel."""

from rest_framework.routers import DefaultRouter

from apps.accounts.permissions import AdminOrAlmacenistaWritePermission, AdminWritePermission
from apps.common.import_views import import_urls
from apps.inventory.import_services import (
    MATERIAS_PRIMAS_IMPORT,
    MOVIMIENTOS_IMPORT,
    PROVEEDORES_IMPORT,
    TRABAJADORES_IMPORT,
)
from apps.inventory.views import (
    MateriaPrimaViewSet,
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

# Las importaciones van antes del router para que `import/` no se interprete como un ID.
urlpatterns = [
    *import_urls("movimientos", MOVIMIENTOS_IMPORT, AdminOrAlmacenistaWritePermission, "movimiento"),
    *import_urls("proveedores", PROVEEDORES_IMPORT, AdminOrAlmacenistaWritePermission, "proveedor"),
    *import_urls("trabajadores", TRABAJADORES_IMPORT, AdminWritePermission, "trabajador"),
    *import_urls("materias-primas", MATERIAS_PRIMAS_IMPORT, AdminOrAlmacenistaWritePermission, "materia-prima"),
    *router.urls,
]
