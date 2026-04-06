import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { movimientosInventario } from '@/lib/mock-data';
import { Search, ArrowLeftRight } from 'lucide-react';

export default function Inventario() {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');

  const filtered = movimientosInventario.filter(m => {
    const matchSearch = m.materia_prima?.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.referencia?.toLowerCase().includes(search.toLowerCase()) ||
      m.motivo?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === 'todos' || m.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-primary" /> Movimientos de Inventario
        </h1>
        <p className="text-muted-foreground mt-1">Registro de entradas, salidas y ajustes</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por material, referencia..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Proveedor / Trabajador</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Referencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(mov => (
                <TableRow key={mov.id}>
                  <TableCell className="text-muted-foreground">{mov.fecha}</TableCell>
                  <TableCell>
                    <Badge variant={mov.tipo === 'entrada' ? 'default' : mov.tipo === 'salida' ? 'destructive' : 'secondary'}>
                      {mov.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{mov.materia_prima?.nombre}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {mov.tipo === 'salida' ? '-' : ''}{mov.cantidad} {mov.materia_prima?.unidad_medida?.abreviatura}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {mov.proveedor?.nombre || mov.trabajador?.nombre || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{mov.motivo || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{mov.referencia || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
