/**
 * Métricas del dashboard de un proyecto: avance, costos, piezas por orden,
 * consumo de materias primas y control de calidad por mes.
 *
 * Todo se calcula en el navegador con las listas que ya carga la aplicación.
 */
import { calcularCostoPieza, calcularPesoTeoricoPieza, calcularSubtotalMaterial, getCantidadConsumida } from '@/lib/domain-utils';
import type { Orden, Pieza } from '@/lib/types';
import { normalizeStatus, sortOrdenesByFechaDesc } from './proyectos-utils';

export interface OrdenResumen {
  id: number;
  codigo: string;
  fecha: string | null;
  estado: string | null;
  piezas: number;
  completadas: number;
  enProceso: number;
  costo: number;
}

export interface ConsumoMaterial {
  materiaPrimaId: number | null;
  nombre: string;
  unidad: string;
  cantidad: number;
  costo: number;
  /** Fracción del costo total del proyecto (0 a 1). */
  participacion: number;
}

export interface QcMensual {
  mes: string;
  etiqueta: string;
  piezas: number;
}

const MONTH_FORMAT = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "2026-03" -> "mar 2026". */
function formatMes(mes: string) {
  const [year, month] = mes.split('-').map(Number);
  return MONTH_FORMAT.format(new Date(Date.UTC(year, month - 1, 1)));
}

const estaCompletada = (pieza: Pieza) => Boolean(pieza.fecha_qc);

function buildOrdenes(ordenes: Orden[], piezas: Pieza[]): OrdenResumen[] {
  // En los gráficos las órdenes van de la más antigua a la más reciente.
  return [...sortOrdenesByFechaDesc(ordenes)].reverse().map(orden => {
    const piezasOrden = piezas.filter(pieza => pieza.orden_id === orden.id);
    const completadas = piezasOrden.filter(estaCompletada).length;

    return {
      id: orden.id,
      codigo: orden.codigo_orden || `Orden #${orden.id}`,
      fecha: orden.fecha_creacion,
      estado: orden.estado,
      piezas: piezasOrden.length,
      completadas,
      enProceso: piezasOrden.length - completadas,
      costo: piezasOrden.reduce((total, pieza) => total + calcularCostoPieza(pieza), 0),
    };
  });
}

function buildConsumo(piezas: Pieza[], costoTotal: number): ConsumoMaterial[] {
  const porMaterial = new Map<string, ConsumoMaterial>();

  for (const material of piezas.flatMap(pieza => pieza.materias_primas ?? [])) {
    const key = String(material.materia_prima_id ?? material.materia_prima?.nombre ?? 'sin-referencia');
    const actual = porMaterial.get(key) ?? {
      materiaPrimaId: material.materia_prima_id,
      nombre: material.materia_prima?.nombre ?? 'Materia prima sin referencia',
      unidad: material.materia_prima?.unidad_medida?.abreviatura ?? '',
      cantidad: 0,
      costo: 0,
      participacion: 0,
    };

    actual.cantidad += getCantidadConsumida(material);
    actual.costo += calcularSubtotalMaterial(material);
    porMaterial.set(key, actual);
  }

  return Array.from(porMaterial.values())
    .map(item => ({ ...item, participacion: costoTotal > 0 ? item.costo / costoTotal : 0 }))
    .sort((left, right) => right.costo - left.costo || left.nombre.localeCompare(right.nombre));
}

function buildQcPorMes(piezas: Pieza[]): QcMensual[] {
  const conteo = new Map<string, number>();

  for (const pieza of piezas) {
    if (!pieza.fecha_qc) continue;
    const mes = pieza.fecha_qc.slice(0, 7);
    conteo.set(mes, (conteo.get(mes) ?? 0) + 1);
  }

  return Array.from(conteo.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([mes, total]) => ({ mes, etiqueta: formatMes(mes), piezas: total }));
}

/** Piezas aún sin control de calidad, empezando por las de gelcoat más antiguo. */
function buildPendientes(piezas: Pieza[]) {
  return piezas
    .filter(pieza => !estaCompletada(pieza))
    .sort((left, right) => {
      if (!left.fecha_gelcoat) return right.fecha_gelcoat ? 1 : 0;
      if (!right.fecha_gelcoat) return -1;
      return left.fecha_gelcoat.localeCompare(right.fecha_gelcoat);
    });
}

/**
 * @param ordenes órdenes del proyecto (sin los filtros de la tabla de órdenes)
 * @param piezasList todas las piezas cargadas; se toman las de esas órdenes
 */
export function buildProyectoDashboard(ordenes: Orden[], piezasList: Pieza[]) {
  const ordenIds = new Set(ordenes.map(orden => orden.id));
  const piezas = piezasList.filter(pieza => pieza.orden_id != null && ordenIds.has(pieza.orden_id));
  const completadas = piezas.filter(estaCompletada).length;
  const costoTotal = piezas.reduce((total, pieza) => total + calcularCostoPieza(pieza), 0);
  const fechas = ordenes.map(orden => orden.fecha_creacion).filter((fecha): fecha is string => Boolean(fecha)).sort();

  const ordenesPorEstado = new Map<string, number>();
  for (const orden of ordenes) {
    const estado = normalizeStatus(orden.estado) || 'sin_estado';
    ordenesPorEstado.set(estado, (ordenesPorEstado.get(estado) ?? 0) + 1);
  }

  return {
    totalOrdenes: ordenes.length,
    ordenesPorEstado: Array.from(ordenesPorEstado.entries()),
    primeraOrden: fechas[0] ?? null,
    ultimaOrden: fechas[fechas.length - 1] ?? null,
    totalPiezas: piezas.length,
    completadas,
    enProceso: piezas.length - completadas,
    /** Porcentaje de piezas con control de calidad (0 a 100). */
    avance: piezas.length > 0 ? Math.round((completadas / piezas.length) * 100) : 0,
    costoTotal,
    costoPromedio: piezas.length > 0 ? costoTotal / piezas.length : 0,
    pesoReal: piezas.reduce((total, pieza) => total + (pieza.peso_real ?? 0), 0),
    piezasConPeso: piezas.filter(pieza => pieza.peso_real != null).length,
    pesoTeorico: piezas.reduce((total, pieza) => total + calcularPesoTeoricoPieza(pieza), 0),
    ordenes: buildOrdenes(ordenes, piezas),
    consumo: buildConsumo(piezas, costoTotal),
    qcPorMes: buildQcPorMes(piezas),
    pendientesQc: buildPendientes(piezas),
  };
}

export type ProyectoDashboardData = ReturnType<typeof buildProyectoDashboard>;
