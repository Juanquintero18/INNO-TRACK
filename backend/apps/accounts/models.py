"""Modelos del dominio de cuentas de usuario.

Se integra sobre la tabla legacy `usuario` existente en la base de datos.
"""

from django.db import models


class AppUser(models.Model):
    """Representa un usuario de aplicación autenticable por token."""

    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100, blank=True, null=True)
    email = models.CharField(unique=True, max_length=150, blank=True, null=True)
    contrasena = models.TextField()
    rol = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "usuario"
        ordering = ["id"]

    def __str__(self) -> str:
        """Etiqueta legible para admin/logs basada en nombre/apellido."""
        return f"{self.nombre} {self.apellido or ''}".strip() or f"Usuario #{self.pk}"

    @property
    def is_authenticated(self) -> bool:
        """Compatibilidad con el contrato de autenticación de Django/DRF."""
        return True

    @property
    def is_anonymous(self) -> bool:
        """Compatibilidad con el contrato de autenticación de Django/DRF."""
        return False