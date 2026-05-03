/**
 * Pantalla de gestion de materias primas.
 *
 * Reune consulta, ordenamiento, filtros por fecha y el formulario de creacion
 * o edicion de cada material del inventario.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import {
  formatThresholdValue,
  getMateriaPrimaStabilityThresholds,
  getStockStabilityMeta,
} from '@/lib/domain-utils';
import type { MateriaPrima } from '@/lib/types';
import { Search, Package, Plus, Pencil, Trash2, ArrowUpDown, Gauge, ShieldCheck, ShieldAlert, Activity } from 'lucide-react';

/** Administra el CRUD visual de materias primas y su lectura operativa. */
export default function MateriasPrimas() {
  const { canEditModule } = useAuth();
  const { materiasList, setMateriasList, unidadesList, deleteEntity, getStockLevel } = useAppData();
  const canManage = canEditModule('materias-primas');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'nombre' | 'unidad' | 'costo' | 'stock' | 'estabilidad' | 'fecha_actualizacion'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCreate, setOpenCreate] = useState(false);
  const [openStabilityConfig, setOpenStabilityConfig] = useState(false);
  const [editingMateria, setEditingMateria] = useState<MateriaPrima | null>(null);
  const [stabilityMateria, setStabilityMateria] = useState<MateriaPrima | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    unidad_medida_id: '',
    costo: '',
    fecha_actualizacion: '',
  });
  const [formError, setFormError] = useState('');
  const [stabilityFormData, setStabilityFormData] = useState({
    stock_critico_max: '',
    stock_bajo_max: '',
  });
  const [stabilityError, setStabilityError] = useState('');
  const [isSavingStability, setIsSavingStability] = useState(false);

  /** Mensaje comun cuando un usuario intenta editar sin permisos suficientes. */
  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Materias Primas.');
  };

  /** Formatea fechas ISO del backend para mostrarlas en formato local. */
  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '—';

    const [year, month, day] = fecha.split('-');

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  };

  // Aplica busqueda por nombre y rango opcional de fechas de actualizacion.
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

  // Resuelve el criterio de orden segun el campo actualmente seleccionado.
  const sorted = [...filtered].sort((left, right) => {
    const leftStock = getStockLevel(left.id);
    const rightStock = getStockLevel(right.id);
    const leftStability = getStockStabilityMeta(left, leftStock);
    const rightStability = getStockStabilityMeta(right, rightStock);

    const leftValue =
      sortField === 'unidad'
        ? (left.unidad_medida?.nombre ?? '').toLowerCase()
        : sortField === 'estabilidad'
          ? leftStability.rank
        : sortField === 'stock'
          ? leftStock
          : sortField === 'costo'
            ? left.costo ?? 0
            : sortField === 'fecha_actualizacion'
              ? left.fecha_actualizacion ?? ''
              : (left.nombre ?? '').toLowerCase();

    const rightValue =
      sortField === 'unidad'
        ? (right.unidad_medida?.nombre ?? '').toLowerCase()
        : sortField === 'estabilidad'
          ? rightStability.rank
        : sortField === 'stock'
          ? rightStock
          : sortField === 'costo'
            ? right.costo ?? 0
            : sortField === 'fecha_actualizacion'
              ? right.fecha_actualizacion ?? ''
              : (right.nombre ?? '').toLowerCase();

    if (sortField === 'estabilidad' && leftValue === rightValue) {
      if (leftStock !== rightStock) return sortDirection === 'asc' ? leftStock - rightStock : rightStock - leftStock;
      return sortDirection === 'asc'
        ? left.nombre.localeCompare(right.nombre)
        : right.nombre.localeCompare(left.nombre);
    }

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  /** Alterna el sentido de orden o activa un nuevo campo de ordenamiento. */
  const handleSort = (field: 'nombre' | 'unidad' | 'costo' | 'stock' | 'estabilidad' | 'fecha_actualizacion') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (
    label: string,
    field: 'nombre' | 'unidad' | 'costo' | 'stock' | 'estabilidad' | 'fecha_actualizacion',
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

  const resetStabilityForm = () => {
    setStabilityMateria(null);
    setStabilityFormData({
      stock_critico_max: '',
      stock_bajo_max: '',
    });
    setStabilityError('');
  };

  /** Valida el formulario y sincroniza el alta o la edicion con la API. */
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const unidadMedida = unidadesList.find(unidad => unidad.id === unidadMedidaId);

    if (!unidadMedida) {
      setFormError('Selecciona una unidad de medida válida.');
      return;
    }

    try {
      const payload = {
        nombre,
        unidad_medida_id: unidadMedidaId,
        costo,
        fecha_actualizacion: fechaActualizacion,
      };

      if (editingMateria) {
        const updatedMateria = await apiRequest<MateriaPrima>(`/api/inventory/materias-primas/${editingMateria.id}/`, {
          method: 'PUT',
          json: payload,
        });
        setMateriasList(prev => prev.map(materia => materia.id === editingMateria.id ? updatedMateria : materia));
      } else {
        const createdMateria = await apiRequest<MateriaPrima>('/api/inventory/materias-primas/', {
          method: 'POST',
          json: payload,
        });
        setMateriasList(prev => [createdMateria, ...prev]);
      }

      resetForm();
      setOpenCreate(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la materia prima.');
    }
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

  const handleDelete = async (materia: MateriaPrima) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar la materia prima ${materia.nombre}?`)) return;

    try {
      await deleteEntity('materia-prima', materia);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar la materia prima.');
    }
  };

  const getStabilityIcon = (state: 'critico' | 'bajo' | 'estable') => {
    if (state === 'critico') return ShieldAlert;
    if (state === 'bajo') return Activity;
    return ShieldCheck;
  };

  const handleOpenStabilityConfig = (materia: MateriaPrima) => {
    const thresholds = getMateriaPrimaStabilityThresholds(materia);
    setStabilityMateria(materia);
    setStabilityFormData({
      stock_critico_max: String(thresholds.stock_critico_max),
      stock_bajo_max: String(thresholds.stock_bajo_max),
    });
    setStabilityError('');
    setOpenStabilityConfig(true);
  };

  const handleStabilitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage || !stabilityMateria) {
      showPermissionDenied();
      return;
    }

    const critico = Number(stabilityFormData.stock_critico_max);
    const bajo = Number(stabilityFormData.stock_bajo_max);

    if (Number.isNaN(critico) || Number.isNaN(bajo)) {
      setStabilityError('Completa ambos umbrales de estabilidad.');
      return;
    }

    if (critico < 0) {
      setStabilityError('El límite crítico no puede ser negativo.');
      return;
    }

    if (bajo <= critico) {
      setStabilityError('El límite de stock bajo debe ser mayor que el crítico.');
      return;
    }

    setIsSavingStability(true);

    try {
      const updatedMateria = await apiRequest<MateriaPrima>(`/api/inventory/materias-primas/${stabilityMateria.id}/stability-thresholds/`, {
        method: 'PUT',
        json: {
          stock_critico_max: critico,
          stock_bajo_max: bajo,
        },
      });
      setMateriasList(prev => prev.map(materia => materia.id === updatedMateria.id ? updatedMateria : materia));
      setOpenStabilityConfig(false);
      resetStabilityForm();
    } catch (error) {
      setStabilityError(error instanceof Error ? error.message : 'No se pudo guardar la configuración de estabilidad.');
    } finally {
      setIsSavingStability(false);
    }
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar material..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Vista rápida:</span>
              <Button
                type="button"
                size="sm"
                variant={sortField === 'estabilidad' ? 'default' : 'outline'}
                onClick={() => {
                  setSortField('estabilidad');
                  setSortDirection('asc');
                }}
              >
                Priorizar críticos
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortField === 'nombre' ? 'default' : 'outline'}
                onClick={() => {
                  setSortField('nombre');
                  setSortDirection('asc');
                }}
              >
                Orden alfabético
              </Button>
            </div>
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
                <TableHead>{renderSortableHeader('Estabilidad', 'estabilidad')}</TableHead>
                <TableHead>{renderSortableHeader('Última Actualización', 'fecha_actualizacion')}</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(mp => {
                const stock = getStockLevel(mp.id);
                const stabilityMeta = getStockStabilityMeta(mp, stock);
                const StabilityIcon = getStabilityIcon(stabilityMeta.state);

                return (
                  <TableRow key={mp.id}>
                    <TableCell className="font-medium">{mp.nombre}</TableCell>

                    <TableCell className="text-muted-foreground">
                      {mp.unidad_medida?.nombre} ({mp.unidad_medida?.abreviatura})
                    </TableCell>

                    <TableCell className="text-right font-semibold">
                      ${(mp.costo ?? 0).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right">
                      <span className={stabilityMeta.state === 'critico' ? 'text-destructive font-semibold' : ''}>
                        {stock.toFixed(1)} {mp.unidad_medida?.abreviatura}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStabilityConfig(mp)}
                          disabled={!canManage}
                          className={`h-auto min-w-[170px] justify-start gap-3 px-3 py-2 ${stabilityMeta.buttonClass}`}
                        >
                          <StabilityIcon className="h-4 w-4" />
                          <span className="flex flex-col items-start leading-tight">
                            <span className="text-xs font-semibold uppercase tracking-wide">Semáforo</span>
                            <span className="text-sm font-semibold">{stabilityMeta.label}</span>
                          </span>
                        </Button>
                        <p className="text-xs text-muted-foreground">{stabilityMeta.helperText}</p>
                      </div>
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
        open={openStabilityConfig}
        onOpenChange={open => {
          setOpenStabilityConfig(open);
          if (!open) resetStabilityForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Configurar estabilidad de {stabilityMateria?.nombre}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleStabilitySubmit} className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              Define los límites para clasificar el stock de esta materia prima. El rango estable se calcula automáticamente por encima del límite de stock bajo.
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stock_critico_max">Crítico hasta</Label>
                <Input
                  id="stock_critico_max"
                  type="number"
                  min="0"
                  step="0.01"
                  value={stabilityFormData.stock_critico_max}
                  onChange={e => {
                    setStabilityFormData(prev => ({ ...prev, stock_critico_max: e.target.value }));
                    if (stabilityError) setStabilityError('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_bajo_max">Bajo hasta</Label>
                <Input
                  id="stock_bajo_max"
                  type="number"
                  min="0"
                  step="0.01"
                  value={stabilityFormData.stock_bajo_max}
                  onChange={e => {
                    setStabilityFormData(prev => ({ ...prev, stock_bajo_max: e.target.value }));
                    if (stabilityError) setStabilityError('');
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="font-medium text-destructive">Crítico</p>
                <p className="text-muted-foreground">Hasta {formatThresholdValue(Number(stabilityFormData.stock_critico_max || 0))}</p>
              </div>
              <div>
                <p className="font-medium text-warning">Bajo</p>
                <p className="text-muted-foreground">
                  Mayor que {formatThresholdValue(Number(stabilityFormData.stock_critico_max || 0))} y hasta {formatThresholdValue(Number(stabilityFormData.stock_bajo_max || 0))}
                </p>
              </div>
              <div>
                <p className="font-medium text-success">Estable</p>
                <p className="text-muted-foreground">Mayor que {formatThresholdValue(Number(stabilityFormData.stock_bajo_max || 0))}</p>
              </div>
            </div>

            {stabilityError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {stabilityError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpenStabilityConfig(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingStability}>
                <Gauge className="mr-2 h-4 w-4" />
                {isSavingStability ? 'Guardando...' : 'Guardar estabilidad'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                  {unidadesList.map(unidad => (
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