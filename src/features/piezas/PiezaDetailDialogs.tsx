/**
 * Diálogos de consulta de una pieza: su detalle con materiales e historial, y
 * el detalle de un evento concreto del historial.
 */
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFecha, formatFechaHora } from '@/lib/dates';
import { calcularCostoPieza, calcularPesoTeoricoPieza, calcularSubtotalMaterial } from '@/lib/domain-utils';
import type {
  Pieza,
  PiezaHistorial,
  PiezaHistorialDetalle,
  PiezaHistorialMaterialChange,
  PiezaHistorialSnapshot,
  Usuario,
} from '@/lib/types';
import {
  formatMaterialCantidad,
  historialFieldLabels,
  materialChangeLabels,
  useHistorialFormatter,
  type HistorialValueFormatter,
} from './useHistorialFormatter';

const EMPTY = '—';

const getUsuarioLabel = (usuario?: Usuario) =>
  usuario ? `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() : 'Usuario no disponible';

const getAccionLabel = (accion: PiezaHistorial['accion']) => (accion === 'creacion' ? 'Creación' : 'Edición');

/** Texto del botón que abre un evento: depende de cuánto detalle guardó ese evento. */
function getHistorialButtonLabel(item: PiezaHistorial) {
  if (item.detalle?.legacy) return 'Ver resumen';
  return item.accion === 'edicion' ? 'Ver cambios' : 'Ver detalle';
}

function Fact({ label, children, valueClassName = 'font-medium' }: { label: string; children: ReactNode; valueClassName?: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={valueClassName}>{children}</p>
    </div>
  );
}

function HistorialList({ historial, onSelect }: { historial: PiezaHistorial[]; onSelect: (item: PiezaHistorial) => void }) {
  if (historial.length === 0) {
    return <p className="text-sm text-muted-foreground">Esta pieza todavía no tiene historial registrado.</p>;
  }

  // Del evento más reciente al más antiguo.
  const sorted = [...historial].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-3">
      {sorted.map(item => (
        <div key={item.id} className="rounded-lg bg-muted/40 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={item.accion === 'creacion' ? 'default' : 'secondary'}>{getAccionLabel(item.accion)}</Badge>
                <span className="text-sm font-medium text-foreground">{getUsuarioLabel(item.usuario)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.descripcion}</p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="text-sm text-muted-foreground">{formatFechaHora(item.fecha)}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => onSelect(item)}>
                {getHistorialButtonLabel(item)}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PiezaDetailDialogProps {
  /** Pieza a mostrar; `null` mantiene el diálogo cerrado. */
  pieza: Pieza | null;
  onClose: () => void;
  onSelectHistorial: (item: PiezaHistorial) => void;
}

export function PiezaDetailDialog({ pieza, onClose, onSelectHistorial }: PiezaDetailDialogProps) {
  return (
    <Dialog open={!!pieza} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-primary">{pieza?.trace_id}</span>
            <span>— {pieza?.nombre}</span>
          </DialogTitle>
        </DialogHeader>

        {pieza && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <Fact label="Proyecto">{pieza.orden?.proyecto?.nombre || EMPTY}</Fact>
              <Fact label="Orden" valueClassName="font-medium font-mono">
                {pieza.orden?.codigo_orden || EMPTY}
              </Fact>
              <Fact label="Fecha Gelcoat">{formatFecha(pieza.fecha_gelcoat)}</Fact>
              <Fact label="Fecha QC">{formatFecha(pieza.fecha_qc)}</Fact>
              <Fact label="Peso Real">{pieza.peso_real ? `${pieza.peso_real} kg` : EMPTY}</Fact>
              <Fact label="Peso Teórico">{`${calcularPesoTeoricoPieza(pieza).toFixed(2)} kg`}</Fact>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Materias Primas Utilizadas</h3>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Cant. Teórica</TableHead>
                    <TableHead className="text-right">Cant. Real</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pieza.materias_primas?.map(material => (
                    <TableRow key={material.id}>
                      <TableCell>{material.materia_prima?.nombre}</TableCell>
                      <TableCell className="text-right">{material.cantidad_teorica}</TableCell>
                      <TableCell className="text-right">{material.cantidad_real ?? EMPTY}</TableCell>
                      <TableCell className="text-right">${(material.materia_prima?.costo ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${calcularSubtotalMaterial(material).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-3 text-right">
                <span className="text-lg font-bold text-primary">Total: ${calcularCostoPieza(pieza).toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm">Historial de cambios</h3>
                  <p className="text-sm text-muted-foreground">
                    Aquí se registra quién creó o editó esta pieza y cuándo lo hizo.
                  </p>
                </div>
              </div>

              <HistorialList historial={pieza.historial ?? []} onSelect={onSelectHistorial} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MaterialChangeCard({ change }: { change: PiezaHistorialMaterialChange }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{change.materia_prima_nombre || 'Materia prima no disponible'}</p>
          <p className="text-sm text-muted-foreground">{materialChangeLabels[change.change_type]}</p>
        </div>
        <Badge variant="secondary">{change.materia_prima_id ? `ID ${change.materia_prima_id}` : 'Sin ID'}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        {[
          { title: 'Antes', state: change.before },
          { title: 'Después', state: change.after },
        ].map(({ title, state }) => (
          <div key={title} className="rounded-md border border-border/70 bg-background p-3">
            <p className="mb-2 font-medium text-foreground">{title}</p>
            <p className="text-muted-foreground">Cant. teórica: {formatMaterialCantidad(state?.cantidad_teorica)}</p>
            <p className="text-muted-foreground">Cant. real: {formatMaterialCantidad(state?.cantidad_real)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Campos del estado inicial que se muestran al consultar el evento de creación. */
const INITIAL_STATE_FIELDS: Array<keyof Omit<PiezaHistorialSnapshot, 'materias_primas' | 'peso_real'>> = [
  'trace_id',
  'nombre',
  'orden_id',
  'usuario_id',
  'fecha_gelcoat',
  'fecha_qc',
];

function HistorialChanges({ detalle, formatValue }: { detalle: PiezaHistorialDetalle; formatValue: HistorialValueFormatter }) {
  const fieldChanges = detalle.field_changes ?? [];
  const materialChanges = detalle.material_changes ?? [];

  return (
    <>
      {fieldChanges.length > 0 ? (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Campos modificados</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead>Antes</TableHead>
                <TableHead>Después</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldChanges.map(change => (
                <TableRow key={change.field}>
                  <TableCell className="font-medium">
                    {change.label || historialFieldLabels[change.field] || change.field}
                  </TableCell>
                  <TableCell>{formatValue(change.field, change.before)}</TableCell>
                  <TableCell>{formatValue(change.field, change.after)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {materialChanges.length > 0 ? (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Cambios en materias primas</h3>
          <div className="space-y-3">
            {materialChanges.map((change, index) => (
              <MaterialChangeCard key={`${change.materia_prima_id ?? 'sin-id'}-${index}`} change={change} />
            ))}
          </div>
        </div>
      ) : null}

      {detalle.accion === 'creacion' && detalle.initial ? (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Estado inicial de la pieza</h3>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            {INITIAL_STATE_FIELDS.map(field => (
              <Fact key={field} label={historialFieldLabels[field]}>
                {formatValue(field, detalle.initial?.[field])}
              </Fact>
            ))}
          </div>
        </div>
      ) : null}

      {detalle.accion === 'edicion' && fieldChanges.length === 0 && materialChanges.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se detectaron cambios en los campos principales ni en las materias primas para esta edición.
        </p>
      ) : null}
    </>
  );
}

interface HistorialDetailDialogProps {
  /** Evento a mostrar; `null` mantiene el diálogo cerrado. */
  item: PiezaHistorial | null;
  onClose: () => void;
}

export function HistorialDetailDialog({ item, onClose }: HistorialDetailDialogProps) {
  const formatValue = useHistorialFormatter();

  return (
    <Dialog open={!!item} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del cambio</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 text-sm md:grid-cols-3">
              <Fact label="Acción">{getAccionLabel(item.accion)}</Fact>
              <Fact label="Usuario">{getUsuarioLabel(item.usuario)}</Fact>
              <Fact label="Fecha">{formatFechaHora(item.fecha)}</Fact>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Resumen</p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.descripcion}</p>
            </div>

            {!item.detalle ? (
              <p className="text-sm text-muted-foreground">No hay detalle disponible para este registro de historial.</p>
            ) : item.detalle.legacy ? (
              <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-900">Resumen histórico</h3>
                <p className="mt-1 text-sm text-amber-900/90">
                  Este evento se registró antes de habilitar la comparación detallada por campos.
                  Desde esta versión, los nuevos cambios ya mostrarán el antes y después completo.
                </p>
              </div>
            ) : (
              <HistorialChanges detalle={item.detalle} formatValue={formatValue} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
