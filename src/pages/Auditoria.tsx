import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RotateCcw, Search } from 'lucide-react';
import { useAppData, type DeletedEntityType } from '@/contexts/AppDataContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const entityTypeLabels: Record<DeletedEntityType | 'todos', string> = {
  todos: 'Todos',
  pieza: 'Piezas',
  'materia-prima': 'Materias primas',
  'movimiento-inventario': 'Inventario',
  proveedor: 'Proveedores',
  trabajador: 'Trabajadores',
  usuario: 'Usuarios',
};

export default function Auditoria() {
  const { deletedItems, restoreDeletedItem } = useAppData();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<DeletedEntityType | 'todos'>('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const formatFechaHora = (fecha: string) => {
    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return fecha;

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const filtered = deletedItems.filter(item => {
    const term = search.toLowerCase();
    const matchSearch =
      item.entityLabel.toLowerCase().includes(term) ||
      entityTypeLabels[item.entityType].toLowerCase().includes(term) ||
      `${item.deletedBy?.nombre ?? ''}`.toLowerCase().includes(term);

    const matchEntity = entityFilter === 'todos' || item.entityType === entityFilter;
    const fecha = item.deletedAt.slice(0, 10);
    const matchFechas =
      (!fechaInicio || fecha >= fechaInicio) &&
      (!fechaFin || fecha <= fechaFin);

    return matchSearch && matchEntity && matchFechas;
  });

  const handleRestore = async (auditId: number) => {
    setRestoringId(auditId);

    try {
      await restoreDeletedItem(auditId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo restaurar el registro.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShieldAlert className="h-6 w-6 text-primary" /> Auditoría de Eliminaciones
          </h1>
          <p className="mt-1 text-muted-foreground">
            Aquí aparecen todos los registros eliminados y solo desde aquí se pueden deshacer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[560px]">
          <div className="relative sm:col-span-3 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por registro, módulo o usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={entityFilter} onValueChange={value => setEntityFilter(value as DeletedEntityType | 'todos')}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de registro" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(entityTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} min={fechaInicio || undefined} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Registros eliminados: {deletedItems.length}</span>
            <span>Resultados filtrados: {filtered.length}</span>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Registro eliminado</TableHead>
                <TableHead>Eliminado por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length > 0 ? (
                filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="secondary">{entityTypeLabels[item.entityType]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.entityLabel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.deletedBy?.nombre || 'Usuario no disponible'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatFechaHora(item.deletedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" onClick={() => void handleRestore(item.id)} disabled={restoringId === item.id || item.isRestored}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {item.isRestored ? 'Restaurado' : restoringId === item.id ? 'Restaurando...' : 'Deshacer'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No hay registros eliminados que coincidan con el filtro actual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}