import type { Pieza } from '@/lib/types';

export function calcularCostoPieza(pieza: Pieza): number {
  if (!pieza.materias_primas) return 0;

  return pieza.materias_primas.reduce((total, material) => {
    const cantidad = material.cantidad_real ?? material.cantidad_teorica ?? 0;
    const costo = material.materia_prima?.costo ?? 0;
    return total + cantidad * costo;
  }, 0);
}