/**
 * Boton reutilizable para exportar a Excel los datos de un modulo.
 *
 * Cada pagina entrega sus hojas mediante `getSheets`, que se evalua al hacer
 * clic para exportar exactamente lo que el usuario tiene filtrado y ordenado.
 */
import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel, type ExcelSheet } from '@/lib/excel-export';

interface ExportExcelButtonProps {
  /** Nombre base del archivo, sin fecha ni extension. */
  fileName: string;
  getSheets: () => ExcelSheet[];
}

export function ExportExcelButton({ fileName, getSheets }: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const sheets = getSheets();

    if (sheets.every(sheet => sheet.rowCount === 0)) {
      window.alert('No hay datos para exportar con los filtros actuales.');
      return;
    }

    setIsExporting(true);

    try {
      await exportToExcel(fileName, sheets);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo generar el archivo de Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleExport()}
      disabled={isExporting}
      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
    >
      {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
      Exportar Excel
    </Button>
  );
}
