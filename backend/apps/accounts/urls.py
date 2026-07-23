"""Rutas del módulo accounts basadas en router de DRF."""

from rest_framework.routers import DefaultRouter

from apps.accounts.views import AppUserViewSet


router = DefaultRouter()
router.register("users", AppUserViewSet, basename="user")

urlpatterns = router.urls