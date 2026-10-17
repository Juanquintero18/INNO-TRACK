/**
 * Gráficos del dashboard de un proyecto.
 *
 * Paleta validada para lectura con daltonismo: azul oscuro para "Completadas"
 * (y para las series únicas) y azul claro para "En proceso".
 */
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OrdenResumen, QcMensual } from './proyecto-dashboard';

const SERIE_PRINCIPAL = '#1D5DB4';
const SERIE_SECUNDARIA = '#5FA2F0';
const SUPERFICIE = '#FFFFFF';
const TEXTO_EJES = 'hsl(var(--muted-foreground))';
const GRILLA = 'hsl(var(--border))';
const ALTURA = 240;

const axisProps = { tick: { fontSize: 11, fill: TEXTO_EJES }, tickLine: false, axisLine: false } as const;
const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

function SinDatos({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground" style={{ height: ALTURA }}>
      {children}
    </div>
  );
}

/** Piezas de cada orden, separando las que ya pasaron control de calidad. */
export function PiezasPorOrdenChart({ ordenes }: { ordenes: OrdenResumen[] }) {
  if (!ordenes.some(orden => orden.piezas > 0)) return <SinDatos>Las órdenes de este proyecto aún no tienen piezas.</SinDatos>;

  return (
    <ResponsiveContainer width="100%" height={ALTURA}>
      <BarChart data={ordenes} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={GRILLA} />
        <XAxis dataKey="codigo" {...axisProps} interval={0} />
        <YAxis {...axisProps} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="completadas" name="Completadas" stackId="piezas" fill={SERIE_PRINCIPAL} stroke={SUPERFICIE} strokeWidth={2} />
        <Bar dataKey="enProceso" name="En proceso" stackId="piezas" fill={SERIE_SECUNDARIA} stroke={SUPERFICIE} strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Costo acumulado de las piezas de cada orden. */
export function CostoPorOrdenChart({ ordenes }: { ordenes: OrdenResumen[] }) {
  if (!ordenes.some(orden => orden.costo > 0)) return <SinDatos>Todavía no hay costos registrados en las piezas.</SinDatos>;

  return (
    <ResponsiveContainer width="100%" height={ALTURA}>
      <BarChart data={ordenes} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={GRILLA} />
        <XAxis dataKey="codigo" {...axisProps} interval={0} />
        <YAxis {...axisProps} width={56} tickFormatter={(value: number) => `$${value}`} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => [formatMoney(value), 'Costo']} />
        <Bar dataKey="costo" name="Costo" fill={SERIE_PRINCIPAL} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Piezas que pasaron control de calidad en cada mes. */
export function QcPorMesChart({ meses }: { meses: QcMensual[] }) {
  if (meses.length === 0) return <SinDatos>Ninguna pieza de este proyecto ha pasado control de calidad.</SinDatos>;

  return (
    <ResponsiveContainer width="100%" height={ALTURA}>
      <BarChart data={meses} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={GRILLA} />
        <XAxis dataKey="etiqueta" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => [value, 'Piezas con QC']} />
        <Bar dataKey="piezas" name="Piezas con QC" fill={SERIE_PRINCIPAL} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
