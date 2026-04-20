import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Truck, Mail, Phone, MapPin, Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';

type Proveedor = { id: number; nombre: string; telefono: string | null; email: string | null; direccion: string | null };

export default function Proveedores() {
  const { canEditModule } = useAuth();
  const { proveedoresList, setProveedoresList, deleteEntity } = useAppData();
  const canManage = canEditModule('proveedores');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'nombre' | 'email' | 'telefono' | 'direccion'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [formError, setFormError] = useState('');

  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Proveedores.');
  };

  const filtered = proveedoresList.filter(proveedor => {
    const term = search.toLowerCase();

    return (
      proveedor.nombre.toLowerCase().includes(term) ||
      (proveedor.email ?? '').toLowerCase().includes(term) ||
      (proveedor.telefono ?? '').toLowerCase().includes(term) ||
      (proveedor.direccion ?? '').toLowerCase().includes(term)
    );
  });

  const sorted = [...filtered].sort((left, right) => {
    const leftValue = (left[sortField] ?? '').toString().toLowerCase();
    const rightValue = (right[sortField] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSortFieldChange = (value: 'nombre' | 'email' | 'telefono' | 'direccion') => {
    if (sortField === value) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(value);
    setSortDirection('asc');
  };

  const resetForm = () => {
    setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
    setFormError('');
    setEditingProveedor(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = formData.nombre.trim();
    const telefono = formData.telefono.trim();
    const email = formData.email.trim();
    const direccion = formData.direccion.trim();

    if (!nombre || !telefono || !email || !direccion) {
      setFormError('Completa todos los campos del proveedor.');
      return;
    }

    const emailExiste = proveedoresList.some(
      proveedor =>
        (proveedor.email ?? '').toLowerCase() === email.toLowerCase() &&
        proveedor.id !== editingProveedor?.id
    );

    if (emailExiste) {
      setFormError('Ese correo del proveedor ya existe.');
      return;
    }

    try {
      const payload = { nombre, telefono, email, direccion };

      if (editingProveedor) {
        const updatedProveedor = await apiRequest<Proveedor>(`/api/inventory/proveedores/${editingProveedor.id}/`, {
          method: 'PUT',
          json: payload,
        });
        setProveedoresList(prev => prev.map(proveedor => proveedor.id === editingProveedor.id ? updatedProveedor : proveedor));
      } else {
        const createdProveedor = await apiRequest<Proveedor>('/api/inventory/proveedores/', {
          method: 'POST',
          json: payload,
        });
        setProveedoresList(prev => [createdProveedor, ...prev]);
      }

      resetForm();
      setOpenCreate(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el proveedor.');
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      telefono: proveedor.telefono ?? '',
      email: proveedor.email ?? '',
      direccion: proveedor.direccion ?? '',
    });
    setFormError('');
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
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar el proveedor.');
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

        <Button type="button" onClick={() => (canManage ? setOpenCreate(true) : showPermissionDenied())}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo proveedor
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo, teléfono o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortField} onValueChange={value => handleSortFieldChange(value as 'nombre' | 'email' | 'telefono' | 'direccion')}>
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
          <Button type="button" variant="outline" onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}>
            {sortDirection === 'asc' ? 'ASC' : 'DESC'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-foreground text-lg">{p.nombre}</h3>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(p)}
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(p)}
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> {p.telefono}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> {p.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {p.direccion}
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
              {editingProveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del proveedor</Label>
              <Input
                id="nombre"
                placeholder="Ej. Compuestos del Norte"
                value={formData.nombre}
                onChange={e => {
                  setFormData(prev => ({ ...prev, nombre: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                placeholder="+57 300 123 4567"
                value={formData.telefono}
                onChange={e => {
                  setFormData(prev => ({ ...prev, telefono: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="proveedor@empresa.com"
                value={formData.email}
                onChange={e => {
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                placeholder="Ej. Zona Industrial, Barranquilla"
                value={formData.direccion}
                onChange={e => {
                  setFormData(prev => ({ ...prev, direccion: e.target.value }));
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
              <Button type="submit">{editingProveedor ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}