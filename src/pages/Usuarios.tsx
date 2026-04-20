import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';

type Usuario = {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string | null;
  contrasena: string;
  rol: string | null;
};

export default function Usuarios() {
  const { canEditModule } = useAuth();
  const { usuariosList, setUsuariosList, deleteEntity } = useAppData();
  const canManage = canEditModule('usuarios');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'nombre' | 'apellido' | 'email' | 'rol'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    contrasena: '',
    rol: '',
  });
  const [formError, setFormError] = useState('');

  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Usuarios.');
  };

  const filtered = usuariosList.filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (u.apellido ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.rol ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((left, right) => {
    const leftValue = (left[sortField] ?? '').toString().toLowerCase();
    const rightValue = (right[sortField] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }

    return 0;
  });

  const handleSort = (field: 'nombre' | 'apellido' | 'email' | 'rol') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (label: string, field: 'nombre' | 'apellido' | 'email' | 'rol') => (
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
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      contrasena: '',
      rol: '',
    });
    setFormError('');
    setEditingUsuario(null);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = formData.nombre.trim();
    const apellido = formData.apellido.trim();
    const email = formData.email.trim();
    const contrasena = formData.contrasena.trim();
    const rol = formData.rol.trim();

    if (!nombre || !apellido || !email || !contrasena || !rol) {
      setFormError('Completa todos los campos del usuario.');
      return;
    }

    const emailExiste = usuariosList.some(
      usuario => usuario.email.toLowerCase() === email.toLowerCase() && usuario.id !== editingUsuario?.id
    );

    if (emailExiste) {
      setFormError('Ese correo de usuario ya existe.');
      return;
    }

    if (editingUsuario) {
      setUsuariosList(prev =>
        prev.map(usuario =>
          usuario.id === editingUsuario.id
            ? {
                ...usuario,
                nombre,
                apellido,
                email,
                contrasena,
                rol,
              }
            : usuario
        )
      );
      resetForm();
      setOpenCreate(false);
      return;
    }

    const nextId = usuariosList.length
      ? Math.max(...usuariosList.map(usuario => usuario.id)) + 1
      : 1;

    setUsuariosList(prev => [
      ...prev,
      {
        id: nextId,
        nombre,
        apellido,
        email,
        contrasena,
        rol,
      },
    ]);
    resetForm();
    setOpenCreate(false);
  };

  const handleEdit = (usuario: Usuario) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingUsuario(usuario);
    setFormData({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      contrasena: usuario.contrasena,
      rol: usuario.rol,
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = (usuario: Usuario) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar al usuario ${usuario.nombre} ${usuario.apellido ?? ''}?`)) return;
    deleteEntity('usuario', usuario);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de usuarios del sistema</p>
        </div>

        <Button type="button" onClick={() => (canManage ? setOpenCreate(true) : showPermissionDenied())}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, apellido, email o rol..."
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
                <TableHead>{renderSortableHeader('Nombre', 'nombre')}</TableHead>
                <TableHead>{renderSortableHeader('Apellido', 'apellido')}</TableHead>
                <TableHead>{renderSortableHeader('Email', 'email')}</TableHead>
                <TableHead>{renderSortableHeader('Rol', 'rol')}</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell>{u.apellido}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.rol === 'administrador' ? 'default' : 'secondary'}>
                      {u.rol}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(u)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(u)}
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
            <DialogTitle>{editingUsuario ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre <span className="text-primary">*</span></Label>
              <Input
                id="nombre"
                placeholder="Ej. Laura"
                value={formData.nombre}
                onChange={e => {
                  setFormData(prev => ({ ...prev, nombre: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido <span className="text-primary">*</span></Label>
              <Input
                id="apellido"
                placeholder="Ej. Gómez"
                value={formData.apellido}
                onChange={e => {
                  setFormData(prev => ({ ...prev, apellido: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico <span className="text-primary">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@innolution.com"
                value={formData.email}
                onChange={e => {
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrasena">Contraseña <span className="text-primary">*</span></Label>
              <Input
                id="contrasena"
                type="password"
                placeholder="••••••••"
                value={formData.contrasena}
                onChange={e => {
                  setFormData(prev => ({ ...prev, contrasena: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Rol <span className="text-primary">*</span></Label>
              <Select
                value={formData.rol}
                onValueChange={value => {
                  setFormData(prev => ({ ...prev, rol: value }));
                  if (formError) setFormError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="trabajador">Trabajador</SelectItem>
                </SelectContent>
              </Select>
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
              <Button type="submit">{editingUsuario ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}