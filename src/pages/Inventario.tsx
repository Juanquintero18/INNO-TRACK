import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import type { MovimientoInventario } from '@/lib/types';
import { Search, ArrowLeftRight, Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';

type Movimiento = MovimientoInventario;

export default function Inventario() {
  const { user, canEditModule } = useAuth();
  const {
    materiasList,
    movimientosList,
    setMovimientosList,
    proveedoresList,
    trabajadoresList,
    deleteEntity,
    refreshInventoryData,
  } = useAppData();
  const canManage = canEditModule('inventario');
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [sortField, setSortField] = useState<'fecha' | 'tipo' | 'material' | 'cantidad' | 'responsable' | 'motivo' | 'referencia'>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [formData, setFormData] = useState({
    materia_prima_id: '',
    tipo: 'entrada',
    cantidad: '',
    fecha: '',
    proveedor_id: '',
    trabajador_produccion_id: '',
    motivo: '',
    referencia: '',
  });
  const [formError, setFormError] = useState('');

  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Inventario.');
  };

  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '—';

    const [year, month, day] = fecha.split('-');

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  };

  const filtered = movimientosList.filter(m => {
    const matchSearch =
      (m.materia_prima?.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.referencia ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.motivo ?? '').toLowerCase().includes(search.toLowerCase());

    const matchTipo = tipoFilter === 'todos' || m.tipo === tipoFilter;
    const fechaFiltro = m.fecha;
    const matchFechas =
      !fechaInicio && !fechaFin
        ? true
        : Boolean(fechaFiltro) &&
          (!fechaInicio || fechaFiltro >= fechaInicio) &&
          (!fechaFin || fechaFiltro <= fechaFin);

    return matchSearch && matchTipo && matchFechas;
  });

  const sorted = [...filtered].sort((left, right) => {
    const leftValue =
      sortField === 'material'
        ? (left.materia_prima?.nombre ?? '').toLowerCase()
        : sortField === 'cantidad'
          ? left.cantidad ?? 0
          : sortField === 'responsable'
            ? (left.proveedor?.nombre ?? left.trabajador?.nombre ?? '').toLowerCase()
            : sortField === 'motivo'
              ? (left.motivo ?? '').toLowerCase()
              : sortField === 'referencia'
                ? (left.referencia ?? '').toLowerCase()
                : sortField === 'tipo'
                  ? (left.tipo ?? '').toLowerCase()
                  : left.fecha ?? '';

    const rightValue =
      sortField === 'material'
        ? (right.materia_prima?.nombre ?? '').toLowerCase()
        : sortField === 'cantidad'
          ? right.cantidad ?? 0
          : sortField === 'responsable'
            ? (right.proveedor?.nombre ?? right.trabajador?.nombre ?? '').toLowerCase()
            : sortField === 'motivo'
              ? (right.motivo ?? '').toLowerCase()
              : sortField === 'referencia'
                ? (right.referencia ?? '').toLowerCase()
                : sortField === 'tipo'
                  ? (right.tipo ?? '').toLowerCase()
                  : right.fecha ?? '';

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'fecha' | 'tipo' | 'material' | 'cantidad' | 'responsable' | 'motivo' | 'referencia') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (
    label: string,
    field: 'fecha' | 'tipo' | 'material' | 'cantidad' | 'responsable' | 'motivo' | 'referencia',
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
      materia_prima_id: '',
      tipo: 'entrada',
      cantidad: '',
      fecha: '',
      proveedor_id: '',
      trabajador_produccion_id: '',
      motivo: '',
      referencia: '',
    });
    setFormError('');
    setEditingMovimiento(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const materiaPrimaId = Number(formData.materia_prima_id);
    const cantidad = Number(formData.cantidad);
    const fecha = formData.fecha;
    const motivo = formData.motivo.trim() || null;
    const referencia = formData.referencia.trim();
    const tipo = formData.tipo as Movimiento['tipo'];
    const proveedorId = formData.proveedor_id ? Number(formData.proveedor_id) : null;
    const trabajadorId = formData.trabajador_produccion_id
      ? Number(formData.trabajador_produccion_id)
      : null;

    if (!materiaPrimaId || !fecha || !referencia || Number.isNaN(cantidad)) {
      setFormError('Completa los campos obligatorios del movimiento.');
      return;
    }

    if ((tipo === 'entrada' || tipo === 'salida') && cantidad <= 0) {
      setFormError('La cantidad debe ser mayor que cero.');
      return;
    }

    if (tipo === 'ajuste' && cantidad === 0) {
      setFormError('El ajuste no puede ser cero.');
      return;
    }

    if (tipo === 'entrada' && !proveedorId) {
      setFormError('Selecciona un proveedor para las entradas.');
      return;
    }

    if (tipo === 'salida' && !trabajadorId) {
      setFormError('Selecciona un trabajador para las salidas.');
      return;
    }

    const materiaPrima = materiasList.find(materia => materia.id === materiaPrimaId);

    if (!materiaPrima) {
      setFormError('Selecciona una materia prima válida.');
      return;
    }

    const proveedor = tipo === 'entrada'
      ? proveedoresList.find(item => item.id === proveedorId)
      : undefined;
    const trabajador = tipo === 'salida'
      ? trabajadoresList.find(item => item.id === trabajadorId)
      : undefined;

    if (tipo === 'entrada' && !proveedor) {
      setFormError('Selecciona un proveedor válido.');
      return;
    }

    if (tipo === 'salida' && !trabajador) {
      setFormError('Selecciona un trabajador válido.');
      return;
    }

    const payload = {
      materia_prima_id: materiaPrimaId,
      proveedor_id: tipo === 'entrada' ? proveedorId : null,
      trabajador_produccion_id: tipo === 'salida' ? trabajadorId : null,
      tipo,
      cantidad,
      fecha,
      motivo,
      referencia,
    };

    try {
      if (editingMovimiento) {
        const updatedMovimiento = await apiRequest<MovimientoInventario>(`/api/inventory/movimientos/${editingMovimiento.id}/`, {
          method: 'PUT',
          json: payload,
        });
        setMovimientosList(prev => prev.map(movimiento => movimiento.id === editingMovimiento.id ? updatedMovimiento : movimiento));
      } else {
        const createdMovimiento = await apiRequest<MovimientoInventario>('/api/inventory/movimientos/', {
          method: 'POST',
          json: payload,
        });
        setMovimientosList(prev => [createdMovimiento, ...prev]);
      }

      await refreshInventoryData();
      resetForm();
      setOpenCreate(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.');
    }
  };

  const handleEdit = (movimiento: Movimiento) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingMovimiento(movimiento);
    setFormData({
      materia_prima_id: String(movimiento.materia_prima_id ?? ''),
      tipo: movimiento.tipo,
      cantidad: String(movimiento.cantidad),
      fecha: movimiento.fecha ?? '',
      proveedor_id: String(movimiento.proveedor_id ?? ''),
      trabajador_produccion_id: String(movimiento.trabajador_produccion_id ?? ''),
      motivo: movimiento.motivo ?? '',
      referencia: movimiento.referencia ?? '',
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = async (movimiento: Movimiento) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar el movimiento ${movimiento.referencia || movimiento.id}?`)) return;

    try {
      await deleteEntity('movimiento-inventario', movimiento);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar el movimiento.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" /> Movimientos de Inventario
          </h1>
          <p className="text-muted-foreground mt-1">Registro de entradas, salidas y ajustes</p>
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
                <TableHead>{renderSortableHeader('Fecha', 'fecha')}</TableHead>
                <TableHead>{renderSortableHeader('Tipo', 'tipo')}</TableHead>
                <TableHead>{renderSortableHeader('Material', 'material')}</TableHead>
                <TableHead className="text-right">{renderSortableHeader('Cantidad', 'cantidad', true)}</TableHead>
                <TableHead>{renderSortableHeader('Proveedor / Trabajador', 'responsable')}</TableHead>
                <TableHead>{renderSortableHeader('Motivo', 'motivo')}</TableHead>
                <TableHead>{renderSortableHeader('Referencia', 'referencia')}</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(mov => (
                <TableRow key={mov.id}>
                  <TableCell className="text-muted-foreground">{formatFecha(mov.fecha)}</TableCell>

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

                  {canManage && (
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
              {editingMovimiento ? 'Editar movimiento de inventario' : 'Nuevo movimiento de inventario'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label>Materia prima <span className="text-primary">*</span></Label>
              <Select
                value={formData.materia_prima_id}
                onValueChange={value => {
                  setFormData(prev => ({ ...prev, materia_prima_id: value }));
                  if (formError) setFormError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un material" />
                </SelectTrigger>
                <SelectContent>
                  {materiasList.map(materia => (
                    <SelectItem key={materia.id} value={String(materia.id)}>
                      {materia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo <span className="text-primary">*</span></Label>
                <Select
                  value={formData.tipo}
                  onValueChange={value => {
                    setFormData(prev => ({
                      ...prev,
                      tipo: value,
                      proveedor_id: value === 'entrada' ? prev.proveedor_id : '',
                      trabajador_produccion_id: value === 'salida' ? prev.trabajador_produccion_id : '',
                    }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad <span className="text-primary">*</span></Label>
                <Input
                  id="cantidad"
                  type="number"
                  step="0.01"
                  placeholder={formData.tipo === 'ajuste' ? 'Ej. -2.00 o 2.00' : '0.00'}
                  value={formData.cantidad}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, cantidad: e.target.value }));
                    if (formError) setFormError('');
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha <span className="text-primary">*</span></Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={e => {
                  setFormData(prev => ({ ...prev, fecha: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            {formData.tipo === 'entrada' && (
              <div className="space-y-2">
                <Label>Proveedor <span className="text-primary">*</span></Label>
                <Select
                  value={formData.proveedor_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, proveedor_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedoresList.map(proveedor => (
                      <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                        {proveedor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.tipo === 'salida' && (
              <div className="space-y-2">
                <Label>Trabajador <span className="text-primary">*</span></Label>
                <Select
                  value={formData.trabajador_produccion_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, trabajador_produccion_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {trabajadoresList.map(trabajador => (
                      <SelectItem key={trabajador.id} value={String(trabajador.id)}>
                        {trabajador.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                placeholder="Ej. Reposición mensual"
                value={formData.motivo}
                onChange={e => {
                  setFormData(prev => ({ ...prev, motivo: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia <span className="text-primary">*</span></Label>
              <Input
                id="referencia"
                placeholder="Ej. OC-2025-006"
                value={formData.referencia}
                onChange={e => {
                  setFormData(prev => ({ ...prev, referencia: e.target.value }));
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
              <Button type="submit">{editingMovimiento ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}