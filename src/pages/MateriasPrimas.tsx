import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { materiasPrimas, getStockLevel } from '@/lib/mock-data';
import { Search, Package, Plus, Pencil, Trash2 } from 'lucide-react';

export default function MateriasPrimas() {
  const [search, setSearch] = useState('');
  const [openCreate, setOpenCreate] = useState(false);

  const filtered = materiasPrimas.filter(mp =>
    mp.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (materia: (typeof materiasPrimas)[number]) => {
    console.log('Editar materia prima:', materia.id);
  };

  const handleDelete = (materia: (typeof materiasPrimas)[number]) => {
    console.log('Eliminar materia prima:', materia.id);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Materias Primas
          </h1>
          <p className="text-muted-foreground mt-1">Catálogo de materiales y costos</p>
        </div>

        <Button type="button" onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo registro
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar material..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Costo Unitario</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(mp => {
                const stock = getStockLevel(mp.id);

                return (
                  <TableRow key={mp.id}>
                    <TableCell className="font-medium">{mp.nombre}</TableCell>

                    <TableCell className="text-muted-foreground">
                      {mp.unidad_medida?.nombre} ({mp.unidad_medida?.abreviatura})
                    </TableCell>

                    <TableCell className="text-right font-semibold">
                      ${mp.costo.toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right">
                      <span className={stock < 20 ? 'text-destructive font-semibold' : ''}>
                        {stock.toFixed(1)} {mp.unidad_medida?.abreviatura}
                      </span>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {mp.fecha_actualizacion}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(mp)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(mp)}
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
            <DialogTitle>Nueva materia prima</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aquí irá el formulario para crear una nueva materia prima.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button type="button">
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}