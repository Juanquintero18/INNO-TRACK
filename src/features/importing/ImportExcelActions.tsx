/**
 * Botón "Importar Excel" con su ayuda sobre cómo preparar el archivo.
 */
import { Info, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ImportExcelActionsProps {
  onImport: () => void;
  /** Por ejemplo "una fila por movimiento". */
  rowHint: string;
  /** Texto del botón; útil cuando una pantalla importa más de un recurso. */
  label?: string;
}

export function ImportExcelActions({ onImport, rowHint, label = 'Importar Excel' }: ImportExcelActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            aria-label={`Recomendaciones para ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
          >
            <Info className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="border-emerald-100 bg-emerald-50/90">
          <p className="text-sm leading-6 text-emerald-950">
            {`El Excel debe venir claro, con encabezados consistentes, ${rowHint} y datos limpios para evitar errores al importar.`}
          </p>
        </PopoverContent>
      </Popover>

      <Button type="button" onClick={onImport} className="bg-emerald-600 text-white hover:bg-emerald-700">
        <Upload className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </div>
  );
}
