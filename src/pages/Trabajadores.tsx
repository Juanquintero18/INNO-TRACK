import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { HardHat, Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';

type Trabajador = { id: number; codigo_trabajador: string | null; nombre: string | null };

export default function Trabajadores() {
  const { canEditModule } = useAuth();
  const { trabajadoresList: trabajadores, setTrabajadoresList: setTrabajadores, deleteEntity } = useAppData();
  const canManage = canEditModule('trabajadores');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'codigo_trabajador' | 'nombre'>('codigo_trabajador');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState<Trabajador | null>(null);
  const [formData, setFormData] = useState({
    codigo_trabajador: '',
    nombre: '',
  });
  const [formError, setFormError] = useState('');

  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Trabajadores.');
  };

  const filtered = trabajadores.filter(t =>
    (t.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (t.codigo_trabajador ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((left, right) => {
    const leftValue = (left[sortField] ?? '').toString().toLowerCase();
    const rightValue = (right[sortField] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'codigo_trabajador' | 'nombre') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (label: string, field: 'codigo_trabajador' | 'nombre') => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary"
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      {sortField === field && (
        <span className="text-xs text-primary">{sortDirection === 'asc' ? 'ASC' : 'DESC'}</span>
      )}
    </button>
  );

  const resetForm = () => {
    setFormData({ codigo_trabajador: '', nombre: '' });
    setFormError('');
    setEditingTrabajador(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const codigoTrabajador = formData.codigo_trabajador.trim();
    const nombreTrabajador = formData.nombre.trim();

    if (!codigoTrabajador || !nombreTrabajador) {
      setFormError('Completa el código y el nombre del trabajador.');
      return;
    }

    const codigoExiste = trabajadores.some(
      trabajador =>
        (trabajador.codigo_trabajador ?? '').toLowerCase() === codigoTrabajador.toLowerCase() &&
        trabajador.id !== editingTrabajador?.id
    );

    if (codigoExiste) {
      setFormError('Ese código de trabajador ya existe.');
      return;
    }

    try {
      const payload = { codigo_trabajador: codigoTrabajador, nombre: nombreTrabajador };

      if (editingTrabajador) {
        const updatedTrabajador = await apiRequest<Trabajador>(`/api/inventory/trabajadores/${editingTrabajador.id}/`, {
          method: 'PUT',
          json: payload,
        });
        setTrabajadores(prev => prev.map(trabajador => trabajador.id === editingTrabajador.id ? updatedTrabajador : trabajador));
      } else {
        const createdTrabajador = await apiRequest<Trabajador>('/api/inventory/trabajadores/', {
          method: 'POST',
          json: payload,
        });
        setTrabajadores(prev => [createdTrabajador, ...prev]);
      }

      resetForm();
      setOpenCreate(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el trabajador.');
    }
  };

  const handleEdit = (trabajador: Trabajador) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingTrabajador(trabajador);
    setFormData({
      codigo_trabajador: trabajador.codigo_trabajador ?? '',
      nombre: trabajador.nombre ?? '',
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = async (trabajador: Trabajador) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar al trabajador ${trabajador.nombre}?`)) return;

    try {
      await deleteEntity('trabajador', trabajador);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar el trabajador.');
    }
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

        {canManage && (
          <Button type="button" onClick={() => setOpenCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo trabajador
          </Button>
        )}
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
                <TableHead>{renderSortableHeader('Código', 'codigo_trabajador')}</TableHead>
                <TableHead>{renderSortableHeader('Nombre', 'nombre')}</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-primary font-medium">
                    {t.codigo_trabajador}
                  </TableCell>

                  <TableCell className="font-medium">{t.nombre}</TableCell>

                  {canManage && (
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
                  )}
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
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label htmlFor="codigo_trabajador">Código del trabajador <span className="text-primary">*</span></Label>
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
              <Label htmlFor="nombre">Nombre completo <span className="text-primary">*</span></Label>
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