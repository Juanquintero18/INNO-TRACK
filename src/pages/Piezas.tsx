import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { piezas, calcularCostoPieza } from '@/lib/mock-data';
import { Search, Eye, Puzzle, Plus, Pencil, Trash2 } from 'lucide-react';

import type { Pieza } from '@/lib/mock-data';

export default function Piezas() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pieza | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '—';

    const [year, month, day] = fecha.split('-');

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  };

  const term = search.toLowerCase();

  const filtered = piezas.filter(p => {
    const matchSearch =
      (p.nombre ?? '').toLowerCase().includes(term) ||
      (p.trace_id ?? '').toLowerCase().includes(term) ||
      (p.orden?.codigo_orden ?? '').toLowerCase().includes(term) ||
      (p.orden?.proyecto?.nombre ?? '').toLowerCase().includes(term);

    const fechaFiltro = p.fecha_qc;

const matchFechas =
  !fechaInicio && !fechaFin
    ? true
    : Boolean(fechaFiltro) &&
      (!fechaInicio || fechaFiltro >= fechaInicio) &&
      (!fechaFin || fechaFiltro <= fechaFin);

    return matchSearch && matchFechas;
  });

  const handleEdit = (pieza: Pieza) => {
    console.log('Editar pieza:', pieza.id);
  };

  const handleDelete = (pieza: Pieza) => {
    console.log('Eliminar pieza:', pieza.id);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-primary" /> Piezas
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de piezas y control de costos</p>
        </div>

        <div className="flex flex-col gap-2 lg:min-w-[220px] lg:self-center">
          <div className="space-y-1">
            <label htmlFor="fecha-inicio" className="text-sm font-medium text-foreground">
              Fecha inicio
            </label>
            <Input
              id="fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="fecha-fin" className="text-sm font-medium text-foreground">
              Fecha fin
            </label>
            <Input
              id="fecha-fin"
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              min={fechaInicio || undefined}
              className="bg-background"
            />
          </div>
        </div>

        <Button type="button" onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva pieza
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, trace ID, orden o proyecto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trace ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Fecha Gelcoat</TableHead>
                <TableHead className="text-primary">Fecha QC</TableHead>
                <TableHead>Peso Real</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(pieza => {
                const costo = calcularCostoPieza(pieza);

                return (
                  <TableRow key={pieza.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      {pieza.trace_id || '—'}
                    </TableCell>

                    <TableCell className="font-medium">{pieza.nombre || '—'}</TableCell>

                    <TableCell className="text-muted-foreground">
                      {pieza.orden?.proyecto?.nombre || '—'}
                    </TableCell>

                    <TableCell className="font-mono text-muted-foreground">
                      {pieza.orden?.codigo_orden || '—'}
                    </TableCell>

                    <TableCell className="text-muted-foreground">{formatFecha(pieza.fecha_gelcoat)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatFecha(pieza.fecha_qc)}</TableCell>
                    <TableCell>{pieza.peso_real ? `${pieza.peso_real} kg` : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">${costo.toFixed(2)}</TableCell>

                    <TableCell>
                      <Badge variant={pieza.fecha_qc ? 'default' : 'secondary'}>
                        {pieza.fecha_qc ? 'Completada' : 'En proceso'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelected(pieza)}
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(pieza)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(pieza)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva pieza</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aquí irá el formulario para crear una nueva pieza.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button type="button">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-primary">{selected?.trace_id}</span>
              <span>— {selected?.nombre}</span>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Proyecto</p>
                  <p className="font-medium">{selected.orden?.proyecto?.nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Orden</p>
                  <p className="font-medium font-mono">{selected.orden?.codigo_orden || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha Gelcoat</p>
                  <p className="font-medium">{formatFecha(selected.fecha_gelcoat)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha QC</p>
                  <p className="font-medium">{formatFecha(selected.fecha_qc)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peso Real</p>
                  <p className="font-medium">{selected.peso_real ? `${selected.peso_real} kg` : '—'}</p>
                </div>
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
                    {selected.materias_primas?.map(pmp => {
                      const cant = pmp.cantidad_real ?? pmp.cantidad_teorica ?? 0;
                      const subtotal = cant * (pmp.materia_prima?.costo ?? 0);

                      return (
                        <TableRow key={pmp.id}>
                          <TableCell>{pmp.materia_prima?.nombre}</TableCell>
                          <TableCell className="text-right">{pmp.cantidad_teorica}</TableCell>
                          <TableCell className="text-right">{pmp.cantidad_real ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            ${(pmp.materia_prima?.costo ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${subtotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="mt-3 text-right">
                  <span className="text-lg font-bold text-primary">
                    Total: ${calcularCostoPieza(selected).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}