from rest_framework.routers import DefaultRouter

from apps.production.views import (
    OrdenViewSet,
    PiezaHistorialViewSet,
    PiezaMateriaPrimaViewSet,
    PiezaViewSet,
    ProyectoViewSet,
)


router = DefaultRouter()
router.register("proyectos", ProyectoViewSet, basename="proyecto")
router.register("ordenes", OrdenViewSet, basename="orden")
router.register("piezas", PiezaViewSet, basename="pieza")
router.register("pieza-materias-primas", PiezaMateriaPrimaViewSet, basename="pieza-materia-prima")
router.register("pieza-historial", PiezaHistorialViewSet, basename="pieza-historial")

urlpatterns = router.urls