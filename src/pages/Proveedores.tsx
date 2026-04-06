import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { proveedores } from '@/lib/mock-data';
import { Truck, Mail, Phone, MapPin } from 'lucide-react';

export default function Proveedores() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" /> Proveedores
        </h1>
        <p className="text-muted-foreground mt-1">Directorio de proveedores de materias primas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proveedores.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground text-lg mb-3">{p.nombre}</h3>
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
    </motion.div>
  );
}
