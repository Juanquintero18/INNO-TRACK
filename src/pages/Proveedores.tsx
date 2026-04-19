import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { proveedores } from '@/lib/mock-data';
import { Truck, Mail, Phone, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';

type Proveedor = (typeof proveedores)[number];

export default function Proveedores() {
  const [proveedoresList, setProveedoresList] = useState(proveedores);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
    setFormError('');
    setEditingProveedor(null);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
        proveedor.email.toLowerCase() === email.toLowerCase() &&
        proveedor.id !== editingProveedor?.id
    );

    if (emailExiste) {
      setFormError('Ese correo del proveedor ya existe.');
      return;
    }

    if (editingProveedor) {
      setProveedoresList(prev =>
        prev.map(proveedor =>
          proveedor.id === editingProveedor.id
            ? {
                ...proveedor,
                nombre,
                telefono,
                email,
                direccion,
              }
            : proveedor
        )
      );
      resetForm();
      setOpenCreate(false);
      return;
    }

    const nextId = proveedoresList.length
      ? Math.max(...proveedoresList.map(proveedor => proveedor.id)) + 1
      : 1;

    setProveedoresList(prev => [
      ...prev,
      {
        id: nextId,
        nombre,
        telefono,
        email,
        direccion,
      },
    ]);
    resetForm();
    setOpenCreate(false);
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      telefono: proveedor.telefono,
      email: proveedor.email,
      direccion: proveedor.direccion,
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = (proveedor: Proveedor) => {
    console.log('Eliminar proveedor:', proveedor.id);
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

        <Button type="button" onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo proveedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proveedoresList.map(p => (
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