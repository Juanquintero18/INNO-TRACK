import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { unidadesMedida } from '@/lib/mock-data';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Package, Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';

type MateriaPrima = {
  id: number;
  unidad_medida_id: number | null;
  nombre: string;
  costo: number | null;
  fecha_actualizacion: string | null;
  unidad_medida?: { id: number; nombre: string; abreviatura: string | null };
};

export default function MateriasPrimas() {
  const { canEditModule } = useAuth();
  const { materiasList, setMateriasList, deleteEntity, getStockLevel } = useAppData();
  const canManage = canEditModule('materias-primas');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'nombre' | 'unidad' | 'costo' | 'stock' | 'fecha_actualizacion'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingMateria, setEditingMateria] = useState<MateriaPrima | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    unidad_medida_id: '',
    costo: '',
    fecha_actualizacion: '',
  });
  const [formError, setFormError] = useState('');

  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Materias Primas.');
  };

  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '—';

    const [year, month, day] = fecha.split('-');

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  };

  const filtered = materiasList.filter(mp => {
    const matchSearch = mp.nombre.toLowerCase().includes(search.toLowerCase());
    const fechaFiltro = mp.fecha_actualizacion;

    const matchFechas =
      !fechaInicio && !fechaFin
        ? true
        : Boolean(fechaFiltro) &&
          (!fechaInicio || fechaFiltro >= fechaInicio) &&
          (!fechaFin || fechaFiltro <= fechaFin);

    return matchSearch && matchFechas;
  });

  const sorted = [...filtered].sort((left, right) => {
    const leftValue =
      sortField === 'unidad'
        ? (left.unidad_medida?.nombre ?? '').toLowerCase()
        : sortField === 'stock'
          ? getStockLevel(left.id)
          : sortField === 'costo'
            ? left.costo ?? 0
            : sortField === 'fecha_actualizacion'
              ? left.fecha_actualizacion ?? ''
              : (left.nombre ?? '').toLowerCase();

    const rightValue =
      sortField === 'unidad'
        ? (right.unidad_medida?.nombre ?? '').toLowerCase()
        : sortField === 'stock'
          ? getStockLevel(right.id)
          : sortField === 'costo'
            ? right.costo ?? 0
            : sortField === 'fecha_actualizacion'
              ? right.fecha_actualizacion ?? ''
              : (right.nombre ?? '').toLowerCase();

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'nombre' | 'unidad' | 'costo' | 'stock' | 'fecha_actualizacion') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (
    label: string,
    field: 'nombre' | 'unidad' | 'costo' | 'stock' | 'fecha_actualizacion',
    alignRight = false,
  ) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={`inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary ${alignRight ? 'justify-end w-full' : ''}`}
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      {sortField === field && (
        <span className="text-xs text-primary">{sortDirection === 'asc' ? 'ASC' : 'DESC'}</span>
      )}
    </button>
  );

  const resetForm = () => {
    setFormData({
      nombre: '',
      unidad_medida_id: '',
      costo: '',
      fecha_actualizacion: '',
    });
    setFormError('');
    setEditingMateria(null);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = formData.nombre.trim();
    const unidadMedidaId = Number(formData.unidad_medida_id);
    const costo = Number(formData.costo);
    const fechaActualizacion = formData.fecha_actualizacion;

    if (!nombre || !unidadMedidaId || !fechaActualizacion || Number.isNaN(costo)) {
      setFormError('Completa todos los campos de la materia prima.');
      return;
    }

    if (costo <= 0) {
      setFormError('El costo unitario debe ser mayor que cero.');
      return;
    }

    const nombreExiste = materiasList.some(
      materia =>
        materia.nombre.toLowerCase() === nombre.toLowerCase() &&
        materia.id !== editingMateria?.id
    );

    if (nombreExiste) {
      setFormError('Ya existe una materia prima con ese nombre.');
      return;
    }

    const unidadMedida = unidadesMedida.find(unidad => unidad.id === unidadMedidaId);

    if (!unidadMedida) {
      setFormError('Selecciona una unidad de medida válida.');
      return;
    }

    if (editingMateria) {
      setMateriasList(prev =>
        prev.map(materia =>
          materia.id === editingMateria.id
            ? {
                ...materia,
                nombre,
                unidad_medida_id: unidadMedidaId,
                costo,
                fecha_actualizacion: fechaActualizacion,
                unidad_medida: unidadMedida,
              }
            : materia
        )
      );
      resetForm();
      setOpenCreate(false);
      return;
    }

    const nextId = materiasList.length
      ? Math.max(...materiasList.map(materia => materia.id)) + 1
      : 1;

    setMateriasList(prev => [
      ...prev,
      {
        id: nextId,
        nombre,
        unidad_medida_id: unidadMedidaId,
        costo,
        fecha_actualizacion: fechaActualizacion,
        unidad_medida: unidadMedida,
      },
    ]);
    resetForm();
    setOpenCreate(false);
  };

  const handleEdit = (materia: MateriaPrima) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingMateria(materia);
    setFormData({
      nombre: materia.nombre,
      unidad_medida_id: String(materia.unidad_medida_id ?? ''),
      costo: String(materia.costo ?? ''),
      fecha_actualizacion: materia.fecha_actualizacion ?? '',
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = (materia: MateriaPrima) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar la materia prima ${materia.nombre}?`)) return;
    deleteEntity('materia-prima', materia);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Materias Primas
          </h1>
          <p className="text-muted-foreground mt-1">Catálogo de materiales y costos</p>
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

        {canManage && (
          <Button type="button" onClick={() => setOpenCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo registro
          </Button>
        )}
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
                <TableHead>{renderSortableHeader('Material', 'nombre')}</TableHead>
                <TableHead>{renderSortableHeader('Unidad', 'unidad')}</TableHead>
                <TableHead className="text-right">{renderSortableHeader('Costo Unitario', 'costo', true)}</TableHead>
                <TableHead className="text-right">{renderSortableHeader('Stock Actual', 'stock', true)}</TableHead>
                <TableHead>{renderSortableHeader('Última Actualización', 'fecha_actualizacion')}</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(mp => {
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
                      {formatFecha(mp.fecha_actualizacion)}
                    </TableCell>

                    {canManage && (
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
                    )}
                  </TableRow>
                );
              })}
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
              {editingMateria ? 'Editar materia prima' : 'Nueva materia prima'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del material <span className="text-primary">*</span></Label>
              <Input
                id="nombre"
                placeholder="Ej. Resina viniléster"
                value={formData.nombre}
                onChange={e => {
                  setFormData(prev => ({ ...prev, nombre: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Unidad de medida <span className="text-primary">*</span></Label>
              <Select
                value={formData.unidad_medida_id}
                onValueChange={value => {
                  setFormData(prev => ({ ...prev, unidad_medida_id: value }));
                  if (formError) setFormError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una unidad" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesMedida.map(unidad => (
                    <SelectItem key={unidad.id} value={String(unidad.id)}>
                      {unidad.nombre} ({unidad.abreviatura})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo">Costo unitario <span className="text-primary">*</span></Label>
              <Input
                id="costo"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.costo}
                onChange={e => {
                  setFormData(prev => ({ ...prev, costo: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_actualizacion">Fecha de actualización <span className="text-primary">*</span></Label>
              <Input
                id="fecha_actualizacion"
                type="date"
                value={formData.fecha_actualizacion}
                onChange={e => {
                  setFormData(prev => ({ ...prev, fecha_actualizacion: e.target.value }));
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
              <Button type="submit">{editingMateria ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}