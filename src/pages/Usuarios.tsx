/**
 * Pantalla administrativa de usuarios.
 *
 * Desde aqui se consultan, crean, editan y eliminan usuarios del sistema,
 * incluyendo la gestion de rol y credenciales iniciales.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { RowActions } from '@/components/data/RowActions';
import { SearchInput } from '@/components/data/SearchInput';
import { SortableHeader } from '@/components/data/SortableHeader';
import { FormDialog } from '@/components/form/FormDialog';
import {
  FormActions,
  FormError,
  RequiredFieldsHint,
  SelectField,
  TextField,
  type SelectOption,
} from '@/components/form/FormParts';
import { Badge } from '@/components/ui/badge';
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
import type { Usuario } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

type SortField = 'nombre' | 'apellido' | 'email' | 'rol';

const EMPTY_FORM = { nombre: '', apellido: '', email: '', contrasena: '', rol: '' };

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'almacenista', label: 'Almacenista' },
  { value: 'trabajador', label: 'Trabajador' },
];

/** Controla el CRUD de usuarios y sus reglas basicas de validacion. */
export default function Usuarios() {
  const { usuariosList, setUsuariosList, deleteEntity } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('usuarios');
  const [search, setSearch] = useState('');
  const { sortField, sortDirection, toggleSort } = useSort<SortField>('nombre');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const form = useFormState(EMPTY_FORM);

  // Filtra coincidencias por nombre, apellido, correo o rol.
  const term = search.toLowerCase();
  const filtered = usuariosList.filter(
    usuario =>
      usuario.nombre.toLowerCase().includes(term) ||
      (usuario.apellido ?? '').toLowerCase().includes(term) ||
      (usuario.email ?? '').toLowerCase().includes(term) ||
      (usuario.rol ?? '').toLowerCase().includes(term)
  );
  const sorted = sortRows(filtered, usuario => textSortValue(usuario[sortField]), sortDirection);

  /** Exporta los usuarios visibles. Nunca incluye contrasenas. */
  const getExportSheets = () => [
    buildSheet({
      name: 'Usuarios',
      rows: sorted,
      columns: [
        { header: 'Nombre', value: usuario => usuario.nombre },
        { header: 'Apellido', value: usuario => usuario.apellido },
        { header: 'Email', value: usuario => usuario.email },
        { header: 'Rol', value: usuario => usuario.rol },
      ],
    }),
  ];

  const resetForm = () => {
    form.reset();
    setEditingUsuario(null);
  };

  /** Valida la unicidad del correo y persiste el usuario en el backend. */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = form.values.nombre.trim();
    const apellido = form.values.apellido.trim();
    const email = form.values.email.trim();
    const contrasena = form.values.contrasena.trim();
    const rol = form.values.rol.trim();

    if (!nombre || !apellido || !email || !rol) {
      form.setError('Completa todos los campos del usuario.');
      return;
    }

    if (!editingUsuario && !contrasena) {
      form.setError('La contraseña es obligatoria para crear el usuario.');
      return;
    }

    const emailExiste = usuariosList.some(
      usuario => (usuario.email ?? '').toLowerCase() === email.toLowerCase() && usuario.id !== editingUsuario?.id
    );

    if (emailExiste) {
      form.setError('Ese correo de usuario ya existe.');
      return;
    }

    try {
      // La contraseña solo viaja cuando se escribe una nueva.
      const saved = await saveResource<Usuario>(ENDPOINTS.usuarios, editingUsuario?.id, {
        nombre,
        apellido,
        email,
        rol,
        ...(contrasena ? { contrasena } : {}),
      });

      if (editingUsuario) {
        setUsuariosList(prev => prev.map(usuario => (usuario.id === editingUsuario.id ? saved : usuario)));
      } else {
        setUsuariosList(prev => [saved, ...prev]);
      }

      resetForm();
      setOpenCreate(false);
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar el usuario.'));
    }
  };

  const handleEdit = (usuario: Usuario) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingUsuario(usuario);
    form.reset({
      nombre: usuario.nombre,
      apellido: usuario.apellido ?? '',
      email: usuario.email ?? '',
      contrasena: '',
      rol: usuario.rol ?? '',
    });
    setOpenCreate(true);
  };

  const handleDelete = async (usuario: Usuario) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar al usuario ${usuario.nombre} ${usuario.apellido ?? ''}?`)) return;

    try {
      await deleteEntity('usuario', usuario);
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar el usuario.'));
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
            <Users className="w-6 h-6 text-primary" /> Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de usuarios del sistema</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportExcelButton fileName="usuarios" getSheets={getExportSheets} />

          <Button type="button" onClick={() => (canManage ? setOpenCreate(true) : showPermissionDenied())}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <SearchInput
            placeholder="Buscar por nombre, apellido, email o rol..."
            value={search}
            onChange={setSearch}
            className="max-w-sm"
          />
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sortableHeader('Nombre', 'nombre')}</TableHead>
                <TableHead>{sortableHeader('Apellido', 'apellido')}</TableHead>
                <TableHead>{sortableHeader('Email', 'email')}</TableHead>
                <TableHead>{sortableHeader('Rol', 'rol')}</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(usuario => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nombre}</TableCell>
                  <TableCell>{usuario.apellido}</TableCell>
                  <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                  <TableCell>
                    <Badge variant={usuario.rol === 'administrador' ? 'default' : 'secondary'}>{usuario.rol}</Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <RowActions onEdit={() => handleEdit(usuario)} onDelete={() => handleDelete(usuario)} />
                  </TableCell>
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
        title={editingUsuario ? 'Editar usuario' : 'Nuevo usuario'}
        onSubmit={handleSubmit}
      >
        <RequiredFieldsHint />
        <TextField
          id="nombre"
          label="Nombre"
          required
          placeholder="Ej. Laura"
          value={form.values.nombre}
          onValueChange={value => form.setField('nombre', value)}
        />
        <TextField
          id="apellido"
          label="Apellido"
          required
          placeholder="Ej. Gómez"
          value={form.values.apellido}
          onValueChange={value => form.setField('apellido', value)}
        />
        <TextField
          id="email"
          label="Correo electrónico"
          required
          type="email"
          placeholder="usuario@innolution.com"
          value={form.values.email}
          onValueChange={value => form.setField('email', value)}
        />
        <TextField
          id="contrasena"
          label="Contraseña"
          required
          type="password"
          placeholder="••••••••"
          value={form.values.contrasena}
          onValueChange={value => form.setField('contrasena', value)}
        />
        <SelectField
          label="Rol"
          required
          placeholder="Selecciona un rol"
          options={ROLE_OPTIONS}
          value={form.values.rol}
          onValueChange={value => form.setField('rol', value)}
        />

        <FormError message={form.error} />
        <FormActions onCancel={() => setOpenCreate(false)} submitLabel={editingUsuario ? 'Actualizar' : 'Guardar'} />
      </FormDialog>
    </motion.div>
  );
}
