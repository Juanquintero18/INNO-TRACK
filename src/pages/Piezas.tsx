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
import { calcularCostoPieza } from '@/lib/domain-utils';
import { useAppData } from '@/contexts/AppDataContext';
import { apiRequest } from '@/lib/api';
import { Search, Eye, Puzzle, Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import type { Pieza, PiezaHistorial, PiezaMateriaPrima } from '@/lib/types';

export default function Piezas() {
  const { user } = useAuth();
  const { piezasList, setPiezasList, materiasList, usuariosList, proyectosList, ordenesList, deleteEntity, refreshProductionData } = useAppData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pieza | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openMaterialsModal, setOpenMaterialsModal] = useState(false);
  const [editingPieza, setEditingPieza] = useState<Pieza | null>(null);
  const [sortField, setSortField] = useState<'trace_id' | 'nombre' | 'proyecto' | 'orden' | 'fecha_gelcoat' | 'fecha_qc' | 'peso_real' | 'costo' | 'estado'>('trace_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [formData, setFormData] = useState({
    trace_id: '',
    nombre: '',
    proyecto_id: '',
    orden_id: '',
    usuario_id: '',
    fecha_gelcoat: '',
    fecha_qc: '',
    peso_real: '',
  });
  const [formError, setFormError] = useState('');
  const [materialesForm, setMaterialesForm] = useState<PiezaMateriaPrima[]>([]);
  const [materialFormData, setMaterialFormData] = useState({
    materia_prima_id: '',
    cantidad: '',
  });
  const [materialFormError, setMaterialFormError] = useState('');

  const formatFechaHora = (fecha?: string | null) => {
    if (!fecha) return '—';

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return fecha;

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '—';

    const [year, month, day] = fecha.split('-');

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  };

  const term = search.toLowerCase();

  const filtered = piezasList.filter(p => {
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

  const sorted = [...filtered].sort((left, right) => {
    const leftCosto = calcularCostoPieza(left);
    const rightCosto = calcularCostoPieza(right);

    const leftValue =
      sortField === 'proyecto'
        ? (left.orden?.proyecto?.nombre ?? '').toLowerCase()
        : sortField === 'orden'
          ? (left.orden?.codigo_orden ?? '').toLowerCase()
          : sortField === 'peso_real'
            ? left.peso_real ?? 0
            : sortField === 'costo'
              ? leftCosto
              : sortField === 'estado'
                ? (left.fecha_qc ? 'completada' : 'en proceso')
                : sortField === 'fecha_gelcoat'
                  ? left.fecha_gelcoat ?? ''
                  : sortField === 'fecha_qc'
                    ? left.fecha_qc ?? ''
                    : (left[sortField] ?? '').toString().toLowerCase();

    const rightValue =
      sortField === 'proyecto'
        ? (right.orden?.proyecto?.nombre ?? '').toLowerCase()
        : sortField === 'orden'
          ? (right.orden?.codigo_orden ?? '').toLowerCase()
          : sortField === 'peso_real'
            ? right.peso_real ?? 0
            : sortField === 'costo'
              ? rightCosto
              : sortField === 'estado'
                ? (right.fecha_qc ? 'completada' : 'en proceso')
                : sortField === 'fecha_gelcoat'
                  ? right.fecha_gelcoat ?? ''
                  : sortField === 'fecha_qc'
                    ? right.fecha_qc ?? ''
                    : (right[sortField] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'trace_id' | 'nombre' | 'proyecto' | 'orden' | 'fecha_gelcoat' | 'fecha_qc' | 'peso_real' | 'costo' | 'estado') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (
    label: string,
    field: 'trace_id' | 'nombre' | 'proyecto' | 'orden' | 'fecha_gelcoat' | 'fecha_qc' | 'peso_real' | 'costo' | 'estado',
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
      trace_id: '',
      nombre: '',
      proyecto_id: '',
      orden_id: '',
      usuario_id: '',
      fecha_gelcoat: '',
      fecha_qc: '',
      peso_real: '',
    });
    setFormError('');
    setMaterialesForm([]);
    setMaterialFormData({ materia_prima_id: '', cantidad: '' });
    setMaterialFormError('');
    setOpenMaterialsModal(false);
    setEditingPieza(null);
  };

  const ordenesProyectoSeleccionado = formData.proyecto_id
    ? ordenesList.filter(orden => orden.proyecto_id === Number(formData.proyecto_id))
    : [];

  const calcularCostoFormulario = () =>
    materialesForm.reduce((total, material) => {
      const cantidad = material.cantidad_real ?? material.cantidad_teorica ?? 0;
      const costo = material.materia_prima?.costo ?? 0;
      return total + cantidad * costo;
    }, 0);

  const handleAddMaterial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const materiaPrimaId = Number(materialFormData.materia_prima_id);
    const cantidad = Number(materialFormData.cantidad);

    if (!materiaPrimaId || Number.isNaN(cantidad)) {
      setMaterialFormError('Selecciona una materia prima y una cantidad válida.');
      return;
    }

    if (cantidad <= 0) {
      setMaterialFormError('La cantidad debe ser mayor que cero.');
      return;
    }

    const materiaPrima = materiasList.find(item => item.id === materiaPrimaId);

    if (!materiaPrima) {
      setMaterialFormError('Selecciona una materia prima válida.');
      return;
    }

    const materialExistente = materialesForm.some(
      material => material.materia_prima_id === materiaPrimaId
    );

    if (materialExistente) {
      setMaterialFormError('Ese material ya fue agregado a la pieza.');
      return;
    }

    const nextMaterialId = materialesForm.length
      ? Math.max(...materialesForm.map(material => material.id)) + 1
      : 1;

    setMaterialesForm(prev => [
      ...prev,
      {
        id: nextMaterialId,
        pieza_id: editingPieza?.id ?? null,
        materia_prima_id: materiaPrimaId,
        cantidad_teorica: cantidad,
        cantidad_real: cantidad,
        materia_prima: materiaPrima,
      },
    ]);
    setMaterialFormData({ materia_prima_id: '', cantidad: '' });
    setMaterialFormError('');
    setOpenMaterialsModal(false);
  };

  const handleRemoveMaterial = (materialId: number) => {
    setMaterialesForm(prev => prev.filter(material => material.id !== materialId));
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const traceId = formData.trace_id.trim();
    const nombre = formData.nombre.trim();
    const proyectoId = Number(formData.proyecto_id);
    const ordenId = Number(formData.orden_id);
    const usuarioId = Number(formData.usuario_id);
    const fechaGelcoat = formData.fecha_gelcoat;
    const fechaQc = formData.fecha_qc || null;
    const pesoReal = formData.peso_real ? Number(formData.peso_real) : null;

    if (!traceId || !nombre || !proyectoId || !ordenId || !usuarioId || !fechaGelcoat) {
      setFormError('Completa los campos principales de la pieza.');
      return;
    }

    if (formData.peso_real && (Number.isNaN(Number(formData.peso_real)) || Number(formData.peso_real) <= 0)) {
      setFormError('El peso real debe ser mayor que cero.');
      return;
    }

    const traceExiste = piezasList.some(
      pieza => pieza.trace_id?.toLowerCase() === traceId.toLowerCase() && pieza.id !== editingPieza?.id
    );

    if (traceExiste) {
      setFormError('Ese trace ID ya existe.');
      return;
    }

    const orden = ordenesList.find(item => item.id === ordenId);
    const usuario = usuariosList.find(item => item.id === usuarioId);

    if (!orden || !usuario || orden.proyecto_id !== proyectoId) {
      setFormError('Selecciona un proyecto, una orden y un usuario válidos.');
      return;
    }

    const payload = {
      orden_id: ordenId,
      usuario_id: usuarioId,
      trace_id: traceId,
      nombre,
      fecha_gelcoat: fechaGelcoat,
      fecha_qc: fechaQc,
      peso_real: pesoReal,
      materias_primas: materialesForm.map(material => ({
        id: material.id,
        materia_prima_id: material.materia_prima_id,
        cantidad_teorica: material.cantidad_teorica,
        cantidad_real: material.cantidad_real,
      })),
    };

    try {
      if (editingPieza) {
        const updatedPieza = await apiRequest<Pieza>(`/api/production/piezas/${editingPieza.id}/`, {
          method: 'PUT',
          json: payload,
        });
        setPiezasList(prev => prev.map(pieza => pieza.id === editingPieza.id ? updatedPieza : pieza));
        if (selected?.id === editingPieza.id) setSelected(updatedPieza);
      } else {
        const createdPieza = await apiRequest<Pieza>('/api/production/piezas/', {
          method: 'POST',
          json: payload,
        });
        setPiezasList(prev => [createdPieza, ...prev]);
      }

      await refreshProductionData();
      resetForm();
      setOpenCreate(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la pieza.');
    }
  };

  const handleEdit = (pieza: Pieza) => {
    setEditingPieza(pieza);
    setFormData({
      trace_id: pieza.trace_id ?? '',
      nombre: pieza.nombre ?? '',
      proyecto_id: String(pieza.orden?.proyecto_id ?? ''),
      orden_id: String(pieza.orden_id ?? ''),
      usuario_id: String(pieza.usuario_id ?? ''),
      fecha_gelcoat: pieza.fecha_gelcoat ?? '',
      fecha_qc: pieza.fecha_qc ?? '',
      peso_real: pieza.peso_real != null ? String(pieza.peso_real) : '',
    });
    setMaterialesForm(pieza.materias_primas ?? []);
    setMaterialFormData({ materia_prima_id: '', cantidad: '' });
    setMaterialFormError('');
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = async (pieza: Pieza) => {
    if (!window.confirm(`¿Eliminar la pieza ${pieza.trace_id || pieza.nombre || pieza.id}?`)) return;

    try {
      await deleteEntity('pieza', pieza);
      if (selected?.id === pieza.id) {
        setSelected(null);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar la pieza.');
    }
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
                <TableHead>{renderSortableHeader('Trace ID', 'trace_id')}</TableHead>
                <TableHead>{renderSortableHeader('Nombre', 'nombre')}</TableHead>
                <TableHead>{renderSortableHeader('Proyecto', 'proyecto')}</TableHead>
                <TableHead>{renderSortableHeader('Orden', 'orden')}</TableHead>
                <TableHead>{renderSortableHeader('Fecha Gelcoat', 'fecha_gelcoat')}</TableHead>
                <TableHead className="text-primary">{renderSortableHeader('Fecha QC', 'fecha_qc')}</TableHead>
                <TableHead>{renderSortableHeader('Peso Real', 'peso_real')}</TableHead>
                <TableHead className="text-right">{renderSortableHeader('Costo Total', 'costo', true)}</TableHead>
                <TableHead>{renderSortableHeader('Estado', 'estado')}</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(pieza => {
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

      <Dialog
        open={openCreate}
        onOpenChange={open => {
          setOpenCreate(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPieza ? 'Editar pieza' : 'Nueva pieza'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pr-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label htmlFor="trace_id">Trace ID <span className="text-primary">*</span></Label>
              <Input
                id="trace_id"
                placeholder="846999"
                value={formData.trace_id}
                onChange={e => {
                  setFormData(prev => ({ ...prev, trace_id: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la pieza <span className="text-primary">*</span></Label>
              <Input
                id="nombre"
                placeholder="Ej. SM20-SLK"
                value={formData.nombre}
                onChange={e => {
                  setFormData(prev => ({ ...prev, nombre: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Proyecto <span className="text-primary">*</span></Label>
                <Select
                  value={formData.proyecto_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, proyecto_id: value, orden_id: '' }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectosList.map(proyecto => (
                      <SelectItem key={proyecto.id} value={String(proyecto.id)}>
                        {proyecto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orden <span className="text-primary">*</span></Label>
                <Select
                  value={formData.orden_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, orden_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una orden" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordenesProyectoSeleccionado.map(orden => (
                      <SelectItem key={orden.id} value={String(orden.id)}>
                        {orden.codigo_orden}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Usuario responsable <span className="text-primary">*</span></Label>
                <Select
                  value={formData.usuario_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, usuario_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosList.map(usuario => (
                      <SelectItem key={usuario.id} value={String(usuario.id)}>
                        {usuario.nombre} {usuario.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fecha_gelcoat">Fecha gelcoat <span className="text-primary">*</span></Label>
                <Input
                  id="fecha_gelcoat"
                  type="date"
                  value={formData.fecha_gelcoat}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, fecha_gelcoat: e.target.value }));
                    if (formError) setFormError('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_qc">Fecha QC</Label>
                <Input
                  id="fecha_qc"
                  type="date"
                  value={formData.fecha_qc}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, fecha_qc: e.target.value }));
                    if (formError) setFormError('');
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso_real">Peso real</Label>
              <Input
                id="peso_real"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.peso_real}
                onChange={e => {
                  setFormData(prev => ({ ...prev, peso_real: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Materias primas de la pieza</p>
                  <p className="text-sm text-muted-foreground">
                    Agrega los materiales y la cantidad para calcular el costo total.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setOpenMaterialsModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir materiales
                </Button>
              </div>

              {materialesForm.length > 0 ? (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialesForm.map(material => {
                        const cantidad = material.cantidad_real ?? material.cantidad_teorica ?? 0;
                        const costoUnitario = material.materia_prima?.costo ?? 0;
                        const subtotal = cantidad * costoUnitario;

                        return (
                          <TableRow key={material.id}>
                            <TableCell>{material.materia_prima?.nombre}</TableCell>
                            <TableCell className="text-right">
                              {cantidad} {material.materia_prima?.unidad_medida?.abreviatura}
                            </TableCell>
                            <TableCell className="text-right">${costoUnitario.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">${subtotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMaterial(material.id)}
                              >
                                Quitar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Todavía no has agregado materias primas a esta pieza.
                </p>
              )}

              <div className="text-right text-sm font-semibold text-primary">
                Costo total estimado: ${calcularCostoFormulario().toFixed(2)}
              </div>
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
              <Button type="submit">{editingPieza ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openMaterialsModal}
        onOpenChange={open => {
          setOpenMaterialsModal(open);
          if (!open) {
            setMaterialFormData({ materia_prima_id: '', cantidad: '' });
            setMaterialFormError('');
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir materiales</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMaterial} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label>Materia prima <span className="text-primary">*</span></Label>
              <Select
                value={materialFormData.materia_prima_id}
                onValueChange={value => {
                  setMaterialFormData(prev => ({ ...prev, materia_prima_id: value }));
                  if (materialFormError) setMaterialFormError('');
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

            <div className="space-y-2">
              <Label htmlFor="cantidad_material">Cantidad <span className="text-primary">*</span></Label>
              <Input
                id="cantidad_material"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={materialFormData.cantidad}
                onChange={e => {
                  setMaterialFormData(prev => ({ ...prev, cantidad: e.target.value }));
                  if (materialFormError) setMaterialFormError('');
                }}
              />
            </div>

            {materialFormError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {materialFormError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenMaterialsModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Agregar material</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">
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

              <div className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm">Historial de cambios</h3>
                    <p className="text-sm text-muted-foreground">
                      Aquí se registra quién creó o editó esta pieza y cuándo lo hizo.
                    </p>
                  </div>
                </div>

                {selected.historial && selected.historial.length > 0 ? (
                  <div className="space-y-3">
                    {[...selected.historial].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(item => (
                      <div key={item.id} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={item.accion === 'creacion' ? 'default' : 'secondary'}>
                                {item.accion === 'creacion' ? 'Creación' : 'Edición'}
                              </Badge>
                              <span className="text-sm font-medium text-foreground">
                                {item.usuario ? `${item.usuario.nombre} ${item.usuario.apellido ?? ''}`.trim() : 'Usuario no disponible'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                          </div>

                          <span className="text-sm text-muted-foreground">
                            {formatFechaHora(item.fecha)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta pieza todavía no tiene historial registrado.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}