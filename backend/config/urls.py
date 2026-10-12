"""Ruteo principal de la API y endpoints globales del backend."""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from apps.accounts.views import (
    CurrentUserView,
    LoginView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RefreshTokenView,
)


def healthcheck(_request):
    """Endpoint liviano para verificar disponibilidad del servicio."""
    return JsonResponse({"status": "ok", "service": "backend"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck, name="healthcheck"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("api/auth/password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("api/auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("api/me/", CurrentUserView.as_view(), name="current_user"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/production/", include("apps.production.urls")),
]