"""Modelos del dominio de producción y trazabilidad de piezas."""

from django.db import models


class Proyecto(models.Model):
    """Proyecto productivo que agrupa múltiples órdenes."""

    nombre = models.CharField(max_length=100)
    codigo = models.CharField(max_length=50, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_fin = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "proyecto"
        ordering = ["id"]


class Orden(models.Model):
    """Orden de producción asociada opcionalmente a un proyecto."""

    proyecto = models.ForeignKey(
        Proyecto,
        on_delete=models.DO_NOTHING,
        related_name="ordenes",
        blank=True,
        null=True,
    )
    codigo_orden = models.CharField(max_length=50, blank=True, null=True)
    fecha_creacion = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "orden"
        ordering = ["id"]


class Pieza(models.Model):
    """Entidad fabricada con datos de trazabilidad y control de calidad."""

    orden = models.ForeignKey(
        Orden,
        on_delete=models.DO_NOTHING,
        related_name="piezas",
        blank=True,
        null=True,
    )
    usuario = models.ForeignKey(
        "accounts.AppUser",
        on_delete=models.DO_NOTHING,
        related_name="piezas",
        blank=True,
        null=True,
    )
    trace_id = models.CharField(max_length=100, blank=True, null=True)
    nombre = models.CharField(max_length=100, blank=True, null=True)
    fecha_gelcoat = models.DateField(blank=True, null=True)
    fecha_qc = models.DateField(blank=True, null=True)
    peso_real = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "pieza"
        ordering = ["id"]


class PiezaMateriaPrima(models.Model):
    """Relación de consumo teórico/real de materias por pieza."""

    pieza = models.ForeignKey(
        Pieza,
        on_delete=models.DO_NOTHING,
        related_name="materias_primas",
        blank=True,
        null=True,
    )
    materia_prima = models.ForeignKey(
        "inventory.MateriaPrima",
        on_delete=models.DO_NOTHING,
        related_name="piezas_materia_prima",
        blank=True,
        null=True,
    )
    cantidad_teorica = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cantidad_real = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "pieza_materia_prima"
        ordering = ["id"]


class PiezaHistorial(models.Model):
    """Bitácora histórica de eventos de creación/edición en piezas."""

    pieza = models.ForeignKey(
        Pieza,
        on_delete=models.DO_NOTHING,
        related_name="historial",
    )
    usuario = models.ForeignKey(
        "accounts.AppUser",
        on_delete=models.DO_NOTHING,
        related_name="historial_piezas",
        blank=True,
        null=True,
    )
    accion = models.CharField(max_length=50)
    fecha = models.DateTimeField()
    descripcion = models.TextField()

    class Meta:
        managed = False
        db_table = "pieza_historial"
        ordering = ["-fecha", "-id"]