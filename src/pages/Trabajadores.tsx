import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trabajadoresProduccion } from '@/lib/mock-data';
import { HardHat } from 'lucide-react';

export default function Trabajadores() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <HardHat className="w-6 h-6 text-primary" /> Trabajadores de Producción
        </h1>
        <p className="text-muted-foreground mt-1">Personal asignado a la línea de producción</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trabajadoresProduccion.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-primary font-medium">{t.codigo_trabajador}</TableCell>
                  <TableCell className="font-medium">{t.nombre}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
