"""Rutas del módulo accounts: CRUD de usuarios y aceptación de políticas."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.accounts.views import AceptarPoliticaCookiesView, AppUserViewSet, PoliticasView


router = DefaultRouter()
router.register("users", AppUserViewSet, basename="user")

urlpatterns = [
    path("politicas/", PoliticasView.as_view(), name="politicas"),
    path("politicas/cookies/aceptar/", AceptarPoliticaCookiesView.as_view(), name="aceptar_politica_cookies"),
    *router.urls,
]
