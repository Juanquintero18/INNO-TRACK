from django.db import models


class UnidadMedida(models.Model):
    nombre = models.CharField(max_length=50)
    abreviatura = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "unidad_medida"
        ordering = ["id"]


class Proveedor(models.Model):
    nombre = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.CharField(max_length=150, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "proveedor"
        ordering = ["id"]


class TrabajadorProduccion(models.Model):
    codigo_trabajador = models.CharField(max_length=50, blank=True, null=True)
    nombre = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "trabajador_produccion"
        ordering = ["id"]


class MateriaPrima(models.Model):
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.DO_NOTHING,
        related_name="materias_primas",
        blank=True,
        null=True,
    )
    nombre = models.CharField(max_length=100)
    costo = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    fecha_actualizacion = models.DateField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "materia_prima"
        ordering = ["id"]


class MovimientoInventario(models.Model):
    materia_prima = models.ForeignKey(
        MateriaPrima,
        on_delete=models.DO_NOTHING,
        related_name="movimientos",
        blank=True,
        null=True,
    )
    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.DO_NOTHING,
        related_name="movimientos",
        blank=True,
        null=True,
    )
    usuario = models.ForeignKey(
        "accounts.AppUser",
        on_delete=models.DO_NOTHING,
        related_name="movimientos_inventario",
        blank=True,
        null=True,
    )
    trabajador_produccion = models.ForeignKey(
        TrabajadorProduccion,
        on_delete=models.DO_NOTHING,
        related_name="movimientos",
        blank=True,
        null=True,
    )
    tipo = models.CharField(max_length=50, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    fecha = models.DateField(blank=True, null=True)
    motivo = models.TextField(blank=True, null=True)
    referencia = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "movimiento_inventario"
        ordering = ["-fecha", "-id"]