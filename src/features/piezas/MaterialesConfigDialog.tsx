/**
 * Diálogo donde el administrador elige qué materias primas pueden usarse en piezas.
 */
import { FormError } from '@/components/form/FormParts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MaterialesConfigController } from './useMaterialesConfig';

export function MaterialesConfigDialog({ config }: { config: MaterialesConfigController }) {
  return (
    <Dialog open={config.isOpen} onOpenChange={config.handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar materias primas para piezas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium text-foreground">Control de uso en formularios de piezas</p>
            <p className="mt-1 text-muted-foreground">
              Esta configuración define qué materias primas se pueden agregar en creación o edición de piezas.
              Los materiales deshabilitados no aparecerán en los formularios.
            </p>
          </div>

          {config.usedMateriasBeingDisabled.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-semibold">Advertencia crítica</p>
              <p className="mt-1">
                Estás deshabilitando materias primas que ya se usan en piezas existentes.
                Confirma con cuidado antes de guardar:
              </p>
              <ul className="mt-2 list-disc pl-5">
                {config.usedMateriasBeingDisabled.map(materia => (
                  <li key={materia.id}>
                    {materia.nombre} ({materia.piezas_usage_count} pieza(s))
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Habilitada</TableHead>
                  <TableHead>Materia prima</TableHead>
                  <TableHead className="text-right">Uso en piezas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.sortedMaterias.map(materia => (
                  <TableRow key={materia.id}>
                    <TableCell>
                      <Checkbox
                        checked={config.enabledIds.includes(materia.id)}
                        onCheckedChange={checked => config.toggle(materia.id, checked)}
                        aria-label={`Habilitar ${materia.nombre} para piezas`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{materia.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Unidad: {materia.unidad_medida?.abreviatura ?? '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={materia.piezas_usage_count > 0 ? 'secondary' : 'outline'}>
                        {materia.piezas_usage_count} pieza(s)
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <FormError message={config.error} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Habilitadas: {config.enabledIds.length} de {config.totalMaterias}
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={config.close}>
                Cancelar
              </Button>
              <Button type="button" onClick={config.save} disabled={config.isSaving}>
                {config.isSaving ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
