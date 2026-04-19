import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trabajadoresProduccion } from '@/lib/mock-data';
import { HardHat, Plus, Pencil, Trash2, Search } from 'lucide-react';

type Trabajador = (typeof trabajadoresProduccion)[number];

export default function Trabajadores() {
  const [search, setSearch] = useState('');
  const [trabajadores, setTrabajadores] = useState(trabajadoresProduccion);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState<Trabajador | null>(null);
  const [formData, setFormData] = useState({
    codigo_trabajador: '',
    nombre: '',
  });
  const [formError, setFormError] = useState('');

  const filtered = trabajadores.filter(t =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.codigo_trabajador.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ codigo_trabajador: '', nombre: '' });
    setFormError('');
    setEditingTrabajador(null);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const codigoTrabajador = formData.codigo_trabajador.trim();
    const nombreTrabajador = formData.nombre.trim();

    if (!codigoTrabajador || !nombreTrabajador) {
      setFormError('Completa el código y el nombre del trabajador.');
      return;
    }

    const codigoExiste = trabajadores.some(
      trabajador =>
        trabajador.codigo_trabajador.toLowerCase() === codigoTrabajador.toLowerCase() &&
        trabajador.id !== editingTrabajador?.id
    );

    if (codigoExiste) {
      setFormError('Ese código de trabajador ya existe.');
      return;
    }

    if (editingTrabajador) {
      setTrabajadores(prev =>
        prev.map(trabajador =>
          trabajador.id === editingTrabajador.id
            ? {
                ...trabajador,
                codigo_trabajador: codigoTrabajador,
                nombre: nombreTrabajador,
              }
            : trabajador
        )
      );
      resetForm();
      setOpenCreate(false);
      return;
    }

    const nextId = trabajadores.length
      ? Math.max(...trabajadores.map(trabajador => trabajador.id)) + 1
      : 1;

    setTrabajadores(prev => [
      ...prev,
      {
        id: nextId,
        codigo_trabajador: codigoTrabajador,
        nombre: nombreTrabajador,
      },
    ]);
    resetForm();
    setOpenCreate(false);
  };

  const handleEdit = (trabajador: Trabajador) => {
    setEditingTrabajador(trabajador);
    setFormData({
      codigo_trabajador: trabajador.codigo_trabajador,
      nombre: trabajador.nombre,
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = (trabajador: Trabajador) => {
    console.log('Eliminar trabajador:', trabajador.id);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="w-6 h-6 text-primary" /> Trabajadores de Producción
          </h1>
          <p className="text-muted-foreground mt-1">Personal asignado a la línea de producción</p>
        </div>

        <Button type="button" onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo trabajador
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
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
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-primary font-medium">
                    {t.codigo_trabajador}
                  </TableCell>

                  <TableCell className="font-medium">{t.nombre}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(t)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(t)}
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

      <Dialog
        open={openCreate}
        onOpenChange={open => {
          setOpenCreate(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTrabajador ? 'Editar trabajador' : 'Nuevo trabajador'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo_trabajador">Código del trabajador</Label>
              <Input
                id="codigo_trabajador"
                placeholder="TRB-006"
                value={formData.codigo_trabajador}
                onChange={e => {
                  setFormData(prev => ({ ...prev, codigo_trabajador: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Ej. Laura Gómez"
                value={formData.nombre}
                onChange={e => {
                  setFormData(prev => ({ ...prev, nombre: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            {formError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingTrabajador ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}