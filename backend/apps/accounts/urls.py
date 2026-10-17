"""Rutas del módulo accounts: CRUD e importación de usuarios y aceptación de políticas."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.accounts.import_services import USUARIOS_IMPORT
from apps.accounts.permissions import AdminWritePermission
from apps.accounts.views import AceptarPoliticaCookiesView, AppUserViewSet, PoliticasView
from apps.common.import_views import import_urls


router = DefaultRouter()
router.register("users", AppUserViewSet, basename="user")

urlpatterns = [
    path("politicas/", PoliticasView.as_view(), name="politicas"),
    path("politicas/cookies/aceptar/", AceptarPoliticaCookiesView.as_view(), name="aceptar_politica_cookies"),
    *import_urls("users", USUARIOS_IMPORT, AdminWritePermission, "user"),
    *router.urls,
]
