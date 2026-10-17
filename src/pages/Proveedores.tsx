/**
 * Pantalla de proveedores.
 *
 * Centraliza el directorio de empresas proveedoras y las operaciones CRUD que
 * alimentan los movimientos de entrada al inventario.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Mail, MapPin, Phone, Plus, Truck } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { DeleteButton, EditButton } from '@/components/data/RowActions';
import { SearchInput } from '@/components/data/SearchInput';
import { FormDialog } from '@/components/form/FormDialog';
import { FormActions, FormError, TextField } from '@/components/form/FormParts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/contexts/AppDataContext';
import { ImportExcelActions } from '@/features/importing/ImportExcelActions';
import { ImportExcelDialog, previewValue, type ImportPreviewColumn } from '@/features/importing/ImportExcelDialog';
import { useExcelImport } from '@/features/importing/useExcelImport';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { useSort } from '@/hooks/useSort';
import { ENDPOINTS, saveResource } from '@/lib/api';
import { buildSheet } from '@/lib/excel-export';
import { sortRows, textSortValue } from '@/lib/sorting';
import type { Proveedor } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

type SortField = 'nombre' | 'email' | 'telefono' | 'direccion';

const EMPTY_FORM = { nombre: '', telefono: '', email: '', direccion: '' };

const IMPORT_COLUMNS: ImportPreviewColumn[] = [
  { header: 'Nombre', value: row => previewValue(row, 'nombre') },
  { header: 'Teléfono', value: row => previewValue(row, 'telefono') },
  { header: 'Correo', value: row => previewValue(row, 'email') },
  { header: 'Dirección', value: row => previewValue(row, 'direccion') },
];

/** Administra proveedores con busqueda, orden y formulario modal. */
export default function Proveedores() {
  const { proveedoresList, setProveedoresList, deleteEntity, refreshInventoryData } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('proveedores');
  const [search, setSearch] = useState('');
  const { sortField, sortDirection, toggleSort, toggleDirection } = useSort<SortField>('nombre');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const form = useFormState(EMPTY_FORM);
  const importer = useExcelImport({
    resourcePath: ENDPOINTS.proveedores,
    templateFileName: 'plantilla_proveedores.xlsx',
    successMessage: count => `Se importaron ${count} proveedores correctamente.`,
    onImported: refreshInventoryData,
  });

  // Permite localizar proveedores por cualquier dato de contacto.
  const term = search.toLowerCase();
  const filtered = proveedoresList.filter(
    proveedor =>
      proveedor.nombre.toLowerCase().includes(term) ||
      (proveedor.email ?? '').toLowerCase().includes(term) ||
      (proveedor.telefono ?? '').toLowerCase().includes(term) ||
      (proveedor.direccion ?? '').toLowerCase().includes(term)
  );
  const sorted = sortRows(filtered, proveedor => textSortValue(proveedor[sortField]), sortDirection);

  /** Exporta el directorio con el filtro y el orden que estan en pantalla. */
  const getExportSheets = () => [
    buildSheet({
      name: 'Proveedores',
      rows: sorted,
      columns: [
        { header: 'Nombre', value: proveedor => proveedor.nombre },
        { header: 'Teléfono', value: proveedor => proveedor.telefono },
        { header: 'Correo', value: proveedor => proveedor.email },
        { header: 'Dirección', value: proveedor => proveedor.direccion },
      ],
    }),
  ];

  const resetForm = () => {
    form.reset();
    setEditingProveedor(null);
  };

  /** Valida datos obligatorios y persistencia del proveedor. */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = form.values.nombre.trim();
    const telefono = form.values.telefono.trim();
    const email = form.values.email.trim();
    const direccion = form.values.direccion.trim();

    if (!nombre || !telefono || !email || !direccion) {
      form.setError('Completa todos los campos del proveedor.');
      return;
    }

    const emailExiste = proveedoresList.some(
      proveedor =>
        (proveedor.email ?? '').toLowerCase() === email.toLowerCase() && proveedor.id !== editingProveedor?.id
    );

    if (emailExiste) {
      form.setError('Ese correo del proveedor ya existe.');
      return;
    }

    try {
      const saved = await saveResource<Proveedor>(ENDPOINTS.proveedores, editingProveedor?.id, {
        nombre,
        telefono,
        email,
        direccion,
      });

      if (editingProveedor) {
        setProveedoresList(prev => prev.map(proveedor => (proveedor.id === editingProveedor.id ? saved : proveedor)));
      } else {
        setProveedoresList(prev => [saved, ...prev]);
      }

      resetForm();
      setOpenCreate(false);
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar el proveedor.'));
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingProveedor(proveedor);
    form.reset({
      nombre: proveedor.nombre,
      telefono: proveedor.telefono ?? '',
      email: proveedor.email ?? '',
      direccion: proveedor.direccion ?? '',
    });
    setOpenCreate(true);
  };

  const handleDelete = async (proveedor: Proveedor) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar al proveedor ${proveedor.nombre}?`)) return;

    try {
      await deleteEntity('proveedor', proveedor);
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar el proveedor.'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Proveedores
          </h1>
          <p className="text-muted-foreground mt-1">Directorio de proveedores de materias primas</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportExcelButton fileName="proveedores" getSheets={getExportSheets} />

          {canManage && <ImportExcelActions onImport={importer.open} rowHint="una fila por proveedor" />}

          <Button type="button" onClick={() => (canManage ? setOpenCreate(true) : showPermissionDenied())}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo proveedor
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput
          placeholder="Buscar por nombre, correo, teléfono o dirección..."
          value={search}
          onChange={setSearch}
          className="w-full max-w-md"
        />

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortField} onValueChange={value => toggleSort(value as SortField)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nombre">Nombre</SelectItem>
              <SelectItem value="email">Correo</SelectItem>
              <SelectItem value="telefono">Teléfono</SelectItem>
              <SelectItem value="direccion">Dirección</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={toggleDirection}>
            {sortDirection === 'asc' ? 'ASC' : 'DESC'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map(proveedor => (
          <Card key={proveedor.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-foreground text-lg">{proveedor.nombre}</h3>

                <div className="flex gap-2">
                  <EditButton onClick={() => handleEdit(proveedor)} />
                  <DeleteButton onClick={() => handleDelete(proveedor)} />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> {proveedor.telefono}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> {proveedor.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {proveedor.direccion}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {sorted.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="p-8 text-center text-muted-foreground">
              No hay proveedores que coincidan con el filtro actual.
            </CardContent>
          </Card>
        )}
      </div>

      <FormDialog
        open={openCreate}
        onOpenChange={open => {
          setOpenCreate(open);
          if (!open) resetForm();
        }}
        title={editingProveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
        onSubmit={handleSubmit}
      >
        <TextField
          id="nombre"
          label="Nombre del proveedor"
          placeholder="Ej. Compuestos del Norte"
          value={form.values.nombre}
          onValueChange={value => form.setField('nombre', value)}
        />
        <TextField
          id="telefono"
          label="Teléfono"
          placeholder="+57 300 123 4567"
          value={form.values.telefono}
          onValueChange={value => form.setField('telefono', value)}
        />
        <TextField
          id="email"
          label="Correo electrónico"
          type="email"
          placeholder="proveedor@empresa.com"
          value={form.values.email}
          onValueChange={value => form.setField('email', value)}
        />
        <TextField
          id="direccion"
          label="Dirección"
          placeholder="Ej. Zona Industrial, Barranquilla"
          value={form.values.direccion}
          onValueChange={value => form.setField('direccion', value)}
        />

        <FormError message={form.error} />
        <FormActions onCancel={() => setOpenCreate(false)} submitLabel={editingProveedor ? 'Actualizar' : 'Guardar'} />
      </FormDialog>

      <ImportExcelDialog
        importer={importer}
        title="Importar Excel de proveedores"
        inputId="proveedores-import-file"
        columns={IMPORT_COLUMNS}
      />
    </motion.div>
  );
}
