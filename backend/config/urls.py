from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from apps.accounts.views import CurrentUserView, LoginView, RefreshTokenView


def healthcheck(_request):
    return JsonResponse({"status": "ok", "service": "backend"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck, name="healthcheck"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("api/me/", CurrentUserView.as_view(), name="current_user"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/production/", include("apps.production.urls")),
]