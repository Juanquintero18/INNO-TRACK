from django.db import models


DEFAULT_STOCK_CRITICO_MAX = 20
DEFAULT_STOCK_BAJO_MAX = 50


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


class MateriaPrimaStabilityThreshold(models.Model):
    materia_prima = models.OneToOneField(
        MateriaPrima,
        on_delete=models.CASCADE,
        related_name="stability_config",
        db_column="materia_prima_id",
    )
    stock_critico_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=DEFAULT_STOCK_CRITICO_MAX,
    )
    stock_bajo_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=DEFAULT_STOCK_BAJO_MAX,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "materia_prima_estabilidad"
        ordering = ["materia_prima_id"]


class MateriaPrimaPiezaConfig(models.Model):
    materia_prima = models.OneToOneField(
        MateriaPrima,
        on_delete=models.CASCADE,
        related_name="pieza_config",
        db_column="materia_prima_id",
    )
    enabled_for_piezas = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "materia_prima_pieza_config"
        ordering = ["materia_prima_id"]


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