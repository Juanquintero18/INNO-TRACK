"""Configuración Django de la app accounts."""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Metadatos de inicialización para el módulo de cuentas."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Accounts"