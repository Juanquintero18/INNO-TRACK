"""Registro de modelos de accounts en el admin de Django."""

from django.contrib import admin

from apps.accounts.models import AppUser


@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    """Configuración de listado y búsqueda para usuarios."""

    list_display = ("id", "nombre", "apellido", "email", "rol")
    search_fields = ("nombre", "apellido", "email")
    list_filter = ("rol",)
    ordering = ("id",)
