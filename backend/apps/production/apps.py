"""Configuración Django de la app production."""

from django.apps import AppConfig


class ProductionConfig(AppConfig):
    """Metadatos de inicialización para el dominio de producción."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.production"
    verbose_name = "Production"