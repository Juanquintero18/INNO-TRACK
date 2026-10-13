/**
 * Pantalla de trabajadores de produccion.
 *
 * Gestiona el catalogo de operarios usados luego en movimientos de inventario
 * y trazabilidad de las piezas fabricadas.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { HardHat, Plus } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { RowActions } from '@/components/data/RowActions';
import { SearchInput } from '@/components/data/SearchInput';
import { SortableHeader } from '@/components/data/SortableHeader';
import { FormDialog } from '@/components/form/FormDialog';
import { FormActions, FormError, RequiredFieldsHint, TextField } from '@/components/form/FormParts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppData } from '@/contexts/AppDataContext';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { useSort } from '@/hooks/useSort';
import { ENDPOINTS, saveResource } from '@/lib/api';
import { buildSheet } from '@/lib/excel-export';
import { sortRows, textSortValue } from '@/lib/sorting';
import type { TrabajadorProduccion } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

type SortField = 'codigo_trabajador' | 'nombre';

const EMPTY_FORM = { codigo_trabajador: '', nombre: '' };

/** Controla la vista, el formulario y las acciones CRUD de trabajadores. */
export default function Trabajadores() {
  const { trabajadoresList: trabajadores, setTrabajadoresList: setTrabajadores, deleteEntity } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('trabajadores');
  const [search, setSearch] = useState('');
  const { sortField, sortDirection, toggleSort } = useSort<SortField>('codigo_trabajador');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState<TrabajadorProduccion | null>(null);
  const form = useFormState(EMPTY_FORM);

  // Filtra por nombre o codigo para localizar rapidamente al operario.
  const term = search.toLowerCase();
  const filtered = trabajadores.filter(
    trabajador =>
      (trabajador.nombre ?? '').toLowerCase().includes(term) ||
      (trabajador.codigo_trabajador ?? '').toLowerCase().includes(term)
  );
  const sorted = sortRows(filtered, trabajador => textSortValue(trabajador[sortField]), sortDirection);

  /** Exporta el listado con el filtro y el orden que estan en pantalla. */
  const getExportSheets = () => [
    buildSheet({
      name: 'Trabajadores',
      rows: sorted,
      columns: [
        { header: 'Código', value: trabajador => trabajador.codigo_trabajador },
        { header: 'Nombre', value: trabajador => trabajador.nombre },
      ],
    }),
  ];

  const resetForm = () => {
    form.reset();
    setEditingTrabajador(null);
  };

  /** Valida duplicados y guarda el trabajador via API. */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const codigoTrabajador = form.values.codigo_trabajador.trim();
    const nombreTrabajador = form.values.nombre.trim();

    if (!codigoTrabajador || !nombreTrabajador) {
      form.setError('Completa el código y el nombre del trabajador.');
      return;
    }

    const codigoExiste = trabajadores.some(
      trabajador =>
        (trabajador.codigo_trabajador ?? '').toLowerCase() === codigoTrabajador.toLowerCase() &&
        trabajador.id !== editingTrabajador?.id
    );

    if (codigoExiste) {
      form.setError('Ese código de trabajador ya existe.');
      return;
    }

    try {
      const saved = await saveResource<TrabajadorProduccion>(ENDPOINTS.trabajadores, editingTrabajador?.id, {
        codigo_trabajador: codigoTrabajador,
        nombre: nombreTrabajador,
      });

      if (editingTrabajador) {
        setTrabajadores(prev => prev.map(trabajador => (trabajador.id === editingTrabajador.id ? saved : trabajador)));
      } else {
        setTrabajadores(prev => [saved, ...prev]);
      }

      resetForm();
      setOpenCreate(false);
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar el trabajador.'));
    }
  };

  const handleEdit = (trabajador: TrabajadorProduccion) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingTrabajador(trabajador);
    form.reset({
      codigo_trabajador: trabajador.codigo_trabajador ?? '',
      nombre: trabajador.nombre ?? '',
    });
    setOpenCreate(true);
  };

  const handleDelete = async (trabajador: TrabajadorProduccion) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar al trabajador ${trabajador.nombre}?`)) return;

    try {
      await deleteEntity('trabajador', trabajador);
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar el trabajador.'));
    }
  };

  const sortableHeader = (label: string, field: SortField) => (
    <SortableHeader
      label={label}
      active={sortField === field}
      direction={sortDirection}
      onSort={() => toggleSort(field)}
    />
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="w-6 h-6 text-primary" /> Trabajadores de Producción
          </h1>
          <p className="text-muted-foreground mt-1">Personal asignado a la línea de producción</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportExcelButton fileName="trabajadores" getSheets={getExportSheets} />

          {canManage && (
            <Button type="button" onClick={() => setOpenCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo trabajador
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <SearchInput
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={setSearch}
            className="max-w-sm"
          />
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sortableHeader('Código', 'codigo_trabajador')}</TableHead>
                <TableHead>{sortableHeader('Nombre', 'nombre')}</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(trabajador => (
                <TableRow key={trabajador.id}>
                  <TableCell className="font-mono text-primary font-medium">{trabajador.codigo_trabajador}</TableCell>

                  <TableCell className="font-medium">{trabajador.nombre}</TableCell>

                  {canManage && (
                    <TableCell className="text-right">
                      <RowActions onEdit={() => handleEdit(trabajador)} onDelete={() => handleDelete(trabajador)} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormDialog
        open={openCreate}
        onOpenChange={open => {
          setOpenCreate(open);
          if (!open) resetForm();
        }}
        title={editingTrabajador ? 'Editar trabajador' : 'Nuevo trabajador'}
        onSubmit={handleSubmit}
      >
        <RequiredFieldsHint />
        <TextField
          id="codigo_trabajador"
          label="Código del trabajador"
          required
          placeholder="TRB-006"
          value={form.values.codigo_trabajador}
          onValueChange={value => form.setField('codigo_trabajador', value)}
        />
        <TextField
          id="nombre"
          label="Nombre completo"
          required
          placeholder="Ej. Laura Gómez"
          value={form.values.nombre}
          onValueChange={value => form.setField('nombre', value)}
        />

        <FormError message={form.error} />
        <FormActions onCancel={() => setOpenCreate(false)} submitLabel={editingTrabajador ? 'Actualizar' : 'Guardar'} />
      </FormDialog>
    </motion.div>
  );
}
