from django.db import models


class AppUser(models.Model):
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
        return f"{self.nombre} {self.apellido or ''}".strip() or f"Usuario #{self.pk}"

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False