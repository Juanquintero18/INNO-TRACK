from rest_framework.routers import DefaultRouter

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

urlpatterns = router.urls