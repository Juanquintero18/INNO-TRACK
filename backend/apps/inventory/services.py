"""Reglas de negocio de inventario compartidas por serializers y otros módulos."""

from decimal import Decimal

from apps.inventory.models import MateriaPrima, MateriaPrimaPiezaConfig, MovimientoInventario


TIPO_ENTRADA = "entrada"
TIPO_SALIDA = "salida"
TIPO_AJUSTE = "ajuste"
TIPOS_MOVIMIENTO = {TIPO_ENTRADA, TIPO_SALIDA, TIPO_AJUSTE}


def is_enabled_for_piezas(materia_prima: MateriaPrima) -> bool:
    """Indica si la materia puede agregarse a nuevas piezas.

    Solo se guarda configuración para las deshabilitadas: sin registro, está habilitada.
    """
    try:
        config = materia_prima.pieza_config
    except MateriaPrimaPiezaConfig.DoesNotExist:
        return True

    return bool(config.enabled_for_piezas)


def movement_delta(tipo: str | None, cantidad: Decimal | None) -> Decimal:
    """Efecto de un movimiento sobre el stock.

    Las salidas restan; las entradas y los ajustes suman su cantidad (un ajuste
    puede ser negativo). Un tipo desconocido no altera el stock.
    """
    amount = cantidad or Decimal("0")

    if tipo == TIPO_SALIDA:
        return -amount
    if tipo in (TIPO_ENTRADA, TIPO_AJUSTE):
        return amount
    return Decimal("0")


def current_stock(materia_prima: MateriaPrima, exclude_movimiento_id: int | None = None) -> Decimal:
    """Stock acumulado de una materia prima, opcionalmente sin contar un movimiento."""
    movimientos = MovimientoInventario.objects.filter(materia_prima=materia_prima)

    if exclude_movimiento_id:
        movimientos = movimientos.exclude(pk=exclude_movimiento_id)

    return sum(
        (movement_delta(movimiento.tipo, movimiento.cantidad) for movimiento in movimientos),
        Decimal("0"),
    )
