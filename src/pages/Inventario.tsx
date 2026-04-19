import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { movimientosInventario } from '@/lib/mock-data';
import { Search, ArrowLeftRight, Plus, Pencil, Trash2 } from 'lucide-react';

export default function Inventario() {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [openCreate, setOpenCreate] = useState(false);

  const filtered = movimientosInventario.filter(m => {
    const matchSearch =
      m.materia_prima?.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.referencia?.toLowerCase().includes(search.toLowerCase()) ||
      m.motivo?.toLowerCase().includes(search.toLowerCase());

    const matchTipo = tipoFilter === 'todos' || m.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const handleEdit = (movimiento: (typeof movimientosInventario)[number]) => {
    console.log('Editar movimiento:', movimiento.id);
  };

  const handleDelete = (movimiento: (typeof movimientosInventario)[number]) => {
    console.log('Eliminar movimiento:', movimiento.id);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" /> Movimientos de Inventario
          </h1>
          <p className="text-muted-foreground mt-1">Registro de entradas, salidas y ajustes</p>
        </div>

        <Button type="button" onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo registro
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por material, referencia..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Proveedor / Trabajador</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(mov => (
                <TableRow key={mov.id}>
                  <TableCell className="text-muted-foreground">{mov.fecha}</TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        mov.tipo === 'entrada'
                          ? 'default'
                          : mov.tipo === 'salida'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {mov.tipo}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-medium">{mov.materia_prima?.nombre}</TableCell>

                  <TableCell className="text-right font-semibold">
                    {mov.tipo === 'salida' ? '-' : ''}
                    {mov.cantidad} {mov.materia_prima?.unidad_medida?.abreviatura}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {mov.proveedor?.nombre || mov.trabajador?.nombre || '—'}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {mov.motivo || '—'}
                  </TableCell>

                  <TableCell className="font-mono text-xs">{mov.referencia || '—'}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(mov)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(mov)}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo movimiento de inventario</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aquí irá el formulario para crear un nuevo movimiento.
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
    </motion.div>
  );
}