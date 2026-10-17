"""Rutas del módulo production: CRUD con router DRF e importación de proyectos, órdenes y piezas."""

from rest_framework.routers import DefaultRouter

from apps.accounts.permissions import AdminOrTrabajadorWritePermission, AdminWritePermission
from apps.common.import_views import import_urls
from apps.production.import_services import ORDENES_IMPORT, PIEZAS_IMPORT, PROYECTOS_IMPORT
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

urlpatterns = [
    *import_urls("proyectos", PROYECTOS_IMPORT, AdminWritePermission, "proyecto"),
    *import_urls("ordenes", ORDENES_IMPORT, AdminWritePermission, "orden"),
    *import_urls("piezas", PIEZAS_IMPORT, AdminOrTrabajadorWritePermission, "pieza"),
    *router.urls,
]