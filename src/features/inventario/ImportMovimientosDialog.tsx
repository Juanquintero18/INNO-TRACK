/**
 * Diálogo de importación masiva de movimientos: archivo, vista previa y confirmación.
 */
import { Download, Loader2, Search, Upload } from 'lucide-react';
import { FormError } from '@/components/form/FormParts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MovimientoImportPreview, MovimientoImportPreviewRow } from '@/lib/types';
import type { MovimientosImportController } from './useMovimientosImport';

const EMPTY = '—';

/** Responsable mostrado en la vista previa: el nombre reconocido o, si no, el texto del archivo. */
function getRowResponsable({ resolved, values }: MovimientoImportPreviewRow) {
  return (resolved.proveedor ?? values.proveedor ?? resolved.trabajador ?? values.trabajador) || EMPTY;
}

function PreviewCounter({ label, value, valueClassName }: { label: string; value: number; valueClassName: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function ImportPreview({ preview }: { preview: MovimientoImportPreview }) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewCounter label="Filas totales" value={preview.total_rows} valueClassName="text-foreground" />
        <PreviewCounter label="Válidas" value={preview.valid_rows} valueClassName="text-emerald-700" />
        <PreviewCounter label="Con error" value={preview.invalid_rows} valueClassName="text-destructive" />
      </div>

      {preview.file_errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {preview.file_errors.map(error => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {preview.header_observations.length > 0 && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Encabezados interpretados automáticamente</p>
          <div className="mt-2 space-y-1">
            {preview.header_observations.map(observation => (
              <p key={observation}>{observation}</p>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <p className="font-medium text-foreground">Vista previa por fila</p>
          <p className="text-sm text-muted-foreground">
            Revisa las filas marcadas en rojo antes de confirmar la importación.
          </p>
        </div>

        <div className="max-h-[320px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fila</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Errores</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {preview.rows.map(row => (
                <TableRow key={row.row_number}>
                  <TableCell className="font-medium">{row.row_number}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'valid' ? 'default' : 'destructive'}>
                      {row.status === 'valid' ? 'Válida' : 'Error'}
                    </Badge>
                  </TableCell>
                  <TableCell>{(row.resolved.materia_prima ?? row.values.materia_prima) || EMPTY}</TableCell>
                  <TableCell>{row.values.tipo || EMPTY}</TableCell>
                  <TableCell>{getRowResponsable(row)}</TableCell>
                  <TableCell className="font-mono text-xs">{row.values.referencia || EMPTY}</TableCell>
                  <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                    {row.errors.length > 0 ? row.errors.join(' ') : 'Sin observaciones'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function ImportMovimientosDialog({ importer }: { importer: MovimientosImportController }) {
  const isBusy = importer.isPreviewLoading || importer.isImporting;

  return (
    <Dialog open={importer.isOpen} onOpenChange={importer.handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Excel de movimientos</DialogTitle>
          <DialogDescription>
            Sube un archivo .xlsx, .xls o .csv, revisa la vista previa y confirma la importación solo cuando no haya errores.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={importer.analyzeFile} className="space-y-4">
          <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-sm font-medium text-emerald-950">Recomendación antes de importar</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Usa una sola tabla por hoja, encabezados claros y evita filas vacías, celdas combinadas o datos ambiguos.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              onClick={importer.downloadTemplate}
              disabled={importer.isDownloadingTemplate}
            >
              {importer.isDownloadingTemplate ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Descargar plantilla ejemplo
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventario-import-file">Archivo Excel</Label>
            <Input
              id="inventario-import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => importer.selectFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-muted-foreground">
              {importer.selectedFile
                ? `Archivo listo para analizar: ${importer.selectedFile.name}`
                : 'Selecciona el archivo que deseas validar antes de importarlo.'}
            </p>
          </div>

          <FormError message={importer.error} />

          {importer.preview && <ImportPreview preview={importer.preview} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={importer.close}>
              Cancelar
            </Button>
            <Button type="submit" variant="outline" disabled={!importer.selectedFile || isBusy}>
              {importer.isPreviewLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Analizar archivo
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={importer.confirmImport}
              disabled={!importer.preview?.can_import || isBusy}
            >
              {importer.isImporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Importar definitivamente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
