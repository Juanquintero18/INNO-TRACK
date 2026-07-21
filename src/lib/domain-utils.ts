/**
 * Utilidades de dominio para cálculos de piezas y estado de inventario.
 *
 * Este módulo evita duplicar reglas de negocio en las distintas pantallas.
 */
import type { MateriaPrima, Pieza } from '@/lib/types';

export type StockStabilityState = 'critico' | 'bajo' | 'estable';

const DEFAULT_STOCK_CRITICO_MAX = 20;
const DEFAULT_STOCK_BAJO_MAX = 50;

export function calcularCostoPieza(pieza: Pieza): number {
  // El costo se deriva de cantidad consumida * costo unitario por material.
  if (!pieza.materias_primas) return 0;

  return pieza.materias_primas.reduce((total, material) => {
    const cantidad = material.cantidad_real ?? material.cantidad_teorica ?? 0;
    const costo = material.materia_prima?.costo ?? 0;
    return total + cantidad * costo;
  }, 0);
}

export function calcularPesoTeoricoPieza(pieza: Pieza): number {
  // Suma cantidades para mostrar un peso teórico de referencia.
  if (!pieza.materias_primas) return 0;

  return pieza.materias_primas.reduce((total, material) => {
    const cantidad = material.cantidad_real ?? material.cantidad_teorica ?? 0;
    return total + cantidad;
  }, 0);
}

export function getMateriaPrimaStabilityThresholds(materiaPrima: MateriaPrima) {
  // Fallback de seguridad cuando backend aún no envía configuración explícita.
  return materiaPrima.stability_thresholds ?? {
    stock_critico_max: DEFAULT_STOCK_CRITICO_MAX,
    stock_bajo_max: DEFAULT_STOCK_BAJO_MAX,
  };
}

export function getStockStabilityState(materiaPrima: MateriaPrima, stock: number): StockStabilityState {
  // Clasificación por bandas: crítico <= bajo <= estable.
  const { stock_critico_max, stock_bajo_max } = getMateriaPrimaStabilityThresholds(materiaPrima);

  if (stock <= stock_critico_max) return 'critico';
  if (stock <= stock_bajo_max) return 'bajo';
  return 'estable';
}

export function getStockStabilityMeta(materiaPrima: MateriaPrima, stock: number) {
  // Devuelve metadatos visuales listos para renderizar badges, botones y ayudas.
  const state = getStockStabilityState(materiaPrima, stock);

  if (state === 'critico') {
    return {
      state,
      label: 'Crítico',
      toneClass: 'bg-destructive/10 text-destructive',
      borderClass: 'border-destructive/30',
      buttonClass: 'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10',
      helperText: 'Revisión inmediata',
      rank: 0,
    };
  }

  if (state === 'bajo') {
    return {
      state,
      label: 'Bajo',
      toneClass: 'bg-warning/10 text-warning',
      borderClass: 'border-warning/30',
      buttonClass: 'border-warning/40 bg-warning/5 text-warning hover:bg-warning/10',
      helperText: 'Seguimiento preventivo',
      rank: 1,
    };
  }

  return {
    state,
    label: 'Estable',
    toneClass: 'bg-success/10 text-success',
    borderClass: 'border-success/30',
    buttonClass: 'border-success/40 bg-success/5 text-success hover:bg-success/10',
    helperText: 'Nivel saludable',
    rank: 2,
  };
}

export function formatThresholdValue(value: number) {
  // Conserva formato entero cuando aplica para mejorar legibilidad en UI.
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatStabilityThresholdSummary(materiaPrima: MateriaPrima) {
  // Resumen compacto usado en tablas/listas con espacio reducido.
  const { stock_critico_max, stock_bajo_max } = getMateriaPrimaStabilityThresholds(materiaPrima);

  return `C<=${formatThresholdValue(stock_critico_max)} | B<=${formatThresholdValue(stock_bajo_max)} | E>${formatThresholdValue(stock_bajo_max)}`;
}