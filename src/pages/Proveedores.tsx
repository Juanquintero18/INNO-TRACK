import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { proveedores } from '@/lib/mock-data';
import { Truck, Mail, Phone, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';

export default function Proveedores() {
  const [openCreate, setOpenCreate] = useState(false);

  const handleEdit = (proveedor: (typeof proveedores)[number]) => {
    console.log('Editar proveedor:', proveedor.id);
  };

  const handleDelete = (proveedor: (typeof proveedores)[number]) => {
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
        {proveedores.map(p => (
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

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo proveedor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aquí irá el formulario para crear un nuevo proveedor.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button type="button">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}