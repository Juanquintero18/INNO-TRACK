/**
 * Cifras del dashboard derivadas de piezas, materias primas y movimientos.
 *
 * Las mismas cifras alimentan las tarjetas, los gráficos, los listados y la
 * exportación a Excel.
 */
import { calcularCostoPieza, getStockStabilityMeta } from '@/lib/domain-utils';
import { buildSheet, EXCEL_FORMATS, toExcelDate } from '@/lib/excel-export';
import type { MateriaPrima, MovimientoInventario, Pieza } from '@/lib/types';

const CHART_COLORS = ['hsl(212, 99%, 25%)', 'hsl(212, 80%, 45%)', 'hsl(212, 60%, 60%)', 'hsl(0, 0%, 50%)', 'hsl(142, 71%, 45%)'];
const MATERIALES_EN_GRAFICO = 5;
const MOVIMIENTOS_RECIENTES = 5;
const NOMBRE_CORTO_MAX = 15;

const roundToCents = (value: number) => Math.round(value * 100) / 100;

function buildCostoPorPieza(piezas: Pieza[]) {
  return piezas.map(pieza => ({
    name: pieza.trace_id,
    fullName: pieza.nombre ?? 'Sin nombre',
    displayName: pieza.trace_id ? `${pieza.trace_id} - ${pieza.nombre ?? 'Sin nombre'}` : pieza.nombre ?? 'Sin nombre',
    costo: roundToCents(calcularCostoPieza(pieza)),
  }));
}

/** Materiales con su stock y estado, de más urgente a menos urgente. */
function buildMaterialesClasificados(materias: MateriaPrima[], getStockLevel: (materiaId: number) => number) {
  return materias
    .map(materia => {
      const stock = roundToCents(getStockLevel(materia.id));
      const stability = getStockStabilityMeta(materia, stock);

      return {
        id: materia.id,
        name: materia.nombre.length > NOMBRE_CORTO_MAX ? materia.nombre.slice(0, NOMBRE_CORTO_MAX) + '…' : materia.nombre,
        fullName: materia.nombre,
        stock,
        unit: materia.unidad_medida?.abreviatura ?? '',
        statusLabel: stability.label,
        statusClass: stability.toneClass,
        statusRank: stability.rank,
        helperText: stability.helperText,
      };
    })
    .sort((left, right) => {
      if (left.statusRank !== right.statusRank) return left.statusRank - right.statusRank;
      if (left.stock !== right.stock) return left.stock - right.stock;
      return left.fullName.localeCompare(right.fullName);
    });
}

export function buildDashboardSummary(
  piezas: Pieza[],
  materias: MateriaPrima[],
  movimientos: MovimientoInventario[],
  getStockLevel: (materiaId: number) => number
) {
  const totalPiezas = piezas.length;
  const materialesClasificados = buildMaterialesClasificados(materias, getStockLevel);

  return {
    totalPiezas,
    totalMaterias: materias.length,
    totalMovimientos: movimientos.length,
    costoPromedio:
      totalPiezas > 0 ? piezas.reduce((sum, pieza) => sum + calcularCostoPieza(pieza), 0) / totalPiezas : 0,
    costoPorPieza: buildCostoPorPieza(piezas),
    materialesClasificados,
    // Se limita la cantidad de materiales del grafico para mantenerlo legible.
    materialesGrafico: materialesClasificados.slice(0, MATERIALES_EN_GRAFICO).map((material, index) => ({
      ...material,
      color: CHART_COLORS[index % CHART_COLORS.length],
    })),
    actividadReciente: movimientos.slice(-MOVIMIENTOS_RECIENTES).reverse(),
  };
}

export type DashboardSummary = ReturnType<typeof buildDashboardSummary>;
export type MaterialClasificado = DashboardSummary['materialesClasificados'][number];
export type MaterialGrafico = DashboardSummary['materialesGrafico'][number];
export type CostoPieza = DashboardSummary['costoPorPieza'][number];

/** Exporta las mismas cifras que alimentan las tarjetas, graficos y listados. */
export function buildDashboardSheets(summary: DashboardSummary) {
  return [
    buildSheet({
      name: 'Resumen',
      rows: [
        { indicador: 'Piezas Registradas', valor: summary.totalPiezas },
        { indicador: 'Materias Primas', valor: summary.totalMaterias },
        { indicador: 'Movimientos', valor: summary.totalMovimientos },
        { indicador: 'Costo Promedio', valor: roundToCents(summary.costoPromedio) },
      ],
      columns: [
        { header: 'Indicador', value: row => row.indicador },
        { header: 'Valor', value: row => row.valor },
      ],
    }),
    buildSheet({
      name: 'Costo por pieza',
      rows: summary.costoPorPieza,
      columns: [
        { header: 'Trace ID', value: pieza => pieza.name },
        { header: 'Nombre', value: pieza => pieza.fullName },
        { header: 'Costo', value: pieza => pieza.costo, format: EXCEL_FORMATS.money },
      ],
    }),
    buildSheet({
      name: 'Estado del stock',
      rows: summary.materialesClasificados,
      columns: [
        { header: 'Material', value: material => material.fullName },
        { header: 'Stock actual', value: material => material.stock, format: EXCEL_FORMATS.decimal },
        { header: 'Unidad', value: material => material.unit },
        { header: 'Estado', value: material => material.statusLabel },
      ],
    }),
    buildSheet({
      name: 'Actividad reciente',
      rows: summary.actividadReciente,
      columns: [
        { header: 'Fecha', value: movimiento => toExcelDate(movimiento.fecha) },
        { header: 'Tipo', value: movimiento => movimiento.tipo },
        { header: 'Material', value: movimiento => movimiento.materia_prima?.nombre },
        { header: 'Cantidad', value: movimiento => movimiento.cantidad, format: EXCEL_FORMATS.decimal },
        { header: 'Unidad', value: movimiento => movimiento.materia_prima?.unidad_medida?.abreviatura },
      ],
    }),
  ];
}
