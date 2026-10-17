/**
 * Dashboard del proyecto seleccionado: avance, costos, piezas por orden,
 * consumo de materias primas y piezas pendientes de control de calidad.
 *
 * Sin proyecto seleccionado solo invita a elegir uno.
 */
import type { ReactNode } from 'react';
import { LayoutDashboard, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFecha } from '@/lib/dates';
import type { Orden, Pieza, Proyecto } from '@/lib/types';
import { buildProyectoDashboard, type ProyectoDashboardData } from './proyecto-dashboard';
import { ChartCard, CostoPorOrdenChart, PiezasPorOrdenChart, QcPorMesChart } from './ProyectoDashboardCharts';
import { formatStatusLabel } from './proyectos-utils';

const EMPTY = '—';
const formatMoney = (value: number) => `$${value.toFixed(2)}`;
const formatCantidad = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));
const formatPercent = (fraction: number) => `${Math.round(fraction * 100)}%`;

function Kpi({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

function ProyectoHeader({ proyecto, onClear }: { proyecto: Proyecto; onClear: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-foreground">{proyecto.nombre}</p>
          <Badge variant="secondary">{formatStatusLabel(proyecto.estado)}</Badge>
          <span className="font-mono text-sm text-muted-foreground">{proyecto.codigo || 'Sin código'}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Inicio: {formatFecha(proyecto.fecha_inicio)} · Fin: {formatFecha(proyecto.fecha_fin)}
        </p>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {proyecto.descripcion || 'Sin descripción registrada.'}
        </p>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onClear} className="shrink-0">
        <X className="mr-2 h-4 w-4" />
        Quitar selección
      </Button>
    </div>
  );
}

function Indicadores({ data }: { data: ProyectoDashboardData }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        label="Avance"
        value={`${data.avance}%`}
        detail={
          <div className="space-y-1">
            <Progress value={data.avance} aria-label="Avance del proyecto" className="h-2" />
            <span>
              {data.completadas} de {data.totalPiezas} piezas con control de calidad
            </span>
          </div>
        }
      />
      <Kpi
        label="Órdenes"
        value={data.totalOrdenes}
        detail={
          data.ordenesPorEstado.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {data.ordenesPorEstado.map(([estado, total]) => (
                <Badge key={estado} variant="outline">
                  {formatStatusLabel(estado)}: {total}
                </Badge>
              ))}
            </div>
          ) : (
            'Sin órdenes registradas'
          )
        }
      />
      <Kpi
        label="Costo total"
        value={formatMoney(data.costoTotal)}
        detail={`Promedio por pieza: ${formatMoney(data.costoPromedio)}`}
      />
      <Kpi
        label="Peso real"
        value={`${formatCantidad(data.pesoReal)} kg`}
        detail={`${data.piezasConPeso} de ${data.totalPiezas} piezas pesadas · teórico ${formatCantidad(data.pesoTeorico)} kg`}
      />
    </div>
  );
}

function ConsumoTable({ data }: { data: ProyectoDashboardData }) {
  if (data.consumo.length === 0) {
    return <p className="text-sm text-muted-foreground">Las piezas de este proyecto no tienen materias primas registradas.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Materia prima</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Costo</TableHead>
            <TableHead className="w-[30%]">Del costo total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.consumo.map(item => (
            <TableRow key={`${item.materiaPrimaId ?? item.nombre}`}>
              <TableCell className="font-medium">{item.nombre}</TableCell>
              <TableCell className="text-right">
                {formatCantidad(item.cantidad)} {item.unidad}
              </TableCell>
              <TableCell className="text-right font-semibold">{formatMoney(item.costo)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: formatPercent(item.participacion) }} />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground">{formatPercent(item.participacion)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrdenesTable({ data }: { data: ProyectoDashboardData }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Fecha creación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Piezas</TableHead>
            <TableHead className="text-right">Completadas</TableHead>
            <TableHead className="text-right">Costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.ordenes.length > 0 ? (
            // La tabla muestra primero las órdenes más recientes.
            [...data.ordenes].reverse().map(orden => (
              <TableRow key={orden.id}>
                <TableCell className="font-mono text-primary font-medium">{orden.codigo}</TableCell>
                <TableCell className="text-muted-foreground">{formatFecha(orden.fecha)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{formatStatusLabel(orden.estado)}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">{orden.piezas}</TableCell>
                <TableCell className="text-right">{orden.completadas}</TableCell>
                <TableCell className="text-right">{formatMoney(orden.costo)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Este proyecto no tiene órdenes registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function PendientesQc({ piezas }: { piezas: Pieza[] }) {
  if (piezas.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay piezas pendientes de control de calidad.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trace ID</TableHead>
            <TableHead>Pieza</TableHead>
            <TableHead>Orden</TableHead>
            <TableHead>Fecha gelcoat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {piezas.map(pieza => (
            <TableRow key={pieza.id}>
              <TableCell className="font-mono text-sm text-primary">{pieza.trace_id || EMPTY}</TableCell>
              <TableCell>{pieza.nombre || EMPTY}</TableCell>
              <TableCell className="font-mono text-muted-foreground">{pieza.orden?.codigo_orden || EMPTY}</TableCell>
              <TableCell className="text-muted-foreground">{formatFecha(pieza.fecha_gelcoat)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ProyectoDashboardProps {
  proyecto: Proyecto | null;
  /** Todas las órdenes del proyecto, sin los filtros de la tabla de órdenes. */
  ordenes: Orden[];
  piezas: Pieza[];
  onClearSelection: () => void;
}

export function ProyectoDashboard({ proyecto, ordenes, piezas, onClearSelection }: ProyectoDashboardProps) {
  const data = proyecto ? buildProyectoDashboard(ordenes, piezas) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            Dashboard del proyecto
          </p>
          <p className="text-sm text-muted-foreground">
            Avance, costos y consumo de materiales del proyecto seleccionado.
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {!proyecto || !data ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            Selecciona un proyecto en la tabla de proyectos para ver su dashboard.
          </div>
        ) : (
          <div className="space-y-6">
            <ProyectoHeader proyecto={proyecto} onClear={onClearSelection} />
            <Indicadores data={data} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Piezas por orden" description="Completadas (con QC) y en proceso.">
                <PiezasPorOrdenChart ordenes={data.ordenes} />
              </ChartCard>
              <ChartCard title="Costo por orden" description="Suma del costo de materiales de sus piezas.">
                <CostoPorOrdenChart ordenes={data.ordenes} />
              </ChartCard>
              <ChartCard title="Control de calidad por mes" description="Piezas que pasaron QC cada mes.">
                <QcPorMesChart meses={data.qcPorMes} />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Section title="Consumo de materias primas">
                <ConsumoTable data={data} />
              </Section>
              <Section title={`Piezas pendientes de control de calidad (${data.pendientesQc.length})`}>
                <PendientesQc piezas={data.pendientesQc} />
              </Section>
            </div>

            <Section title="Órdenes del proyecto">
              <OrdenesTable data={data} />
            </Section>

            <p className="text-xs text-muted-foreground">
              Primera orden: {formatFecha(data.primeraOrden)} · Última orden: {formatFecha(data.ultimaOrden)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
