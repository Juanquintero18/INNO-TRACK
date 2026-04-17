import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { piezas, calcularCostoPieza } from '@/lib/mock-data';
import { Search, Eye, Puzzle } from 'lucide-react';
import type { Pieza } from '@/lib/mock-data';

export default function Piezas() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pieza | null>(null);

  const filtered = piezas.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.trace_id.toLowerCase().includes(search.toLowerCase())
  );

// Componente principal de la página de piezas, que muestra una tabla con las piezas registradas, permite buscar por nombre o trace ID, y muestra un diálogo con detalles al hacer clic en una pieza

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-primary" /> Piezas
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de piezas y control de costos</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o trace ID..."
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
                <TableHead>Fecha Gelcoat</TableHead>
                <TableHead>Fecha QC</TableHead>
                <TableHead>Peso Real</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(pieza => {
                const costo = calcularCostoPieza(pieza);
                return (
                  <TableRow key={pieza.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">{pieza.trace_id}</TableCell>
                    <TableCell className="font-medium">{pieza.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{pieza.fecha_gelcoat || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{pieza.fecha_qc || '—'}</TableCell>
                    <TableCell>{pieza.peso_real ? `${pieza.peso_real} kg` : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">${costo.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={pieza.fecha_qc ? 'default' : 'secondary'}>
                        {pieza.fecha_qc ? 'Completada' : 'En proceso'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelected(pieza)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
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
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha Gelcoat</p>
                  <p className="font-medium">{selected.fecha_gelcoat || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha QC</p>
                  <p className="font-medium">{selected.fecha_qc || '—'}</p>
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
                      const cant = pmp.cantidad_real ?? pmp.cantidad_teorica;
                      const subtotal = cant * (pmp.materia_prima?.costo ?? 0);
                      return (
                        <TableRow key={pmp.id}>
                          <TableCell>{pmp.materia_prima?.nombre}</TableCell>
                          <TableCell className="text-right">{pmp.cantidad_teorica}</TableCell>
                          <TableCell className="text-right">{pmp.cantidad_real ?? '—'}</TableCell>
                          <TableCell className="text-right">${pmp.materia_prima?.costo.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">${subtotal.toFixed(2)}</TableCell>
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
