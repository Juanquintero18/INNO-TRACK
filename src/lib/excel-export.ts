/**
 * Exportacion de datos a Excel (.xlsx) desde el navegador.
 *
 * Centraliza el armado de hojas para que todos los modulos generen archivos
 * con el mismo formato: encabezado resaltado, fila superior fija y celdas
 * tipadas (numeros y fechas reales en lugar de texto).
 */
import type { CellObject, SheetData } from 'write-excel-file/browser';

const BOGOTA_TIMEZONE = 'America/Bogota';
const HEADER_BACKGROUND = '#013C7F';
const HEADER_TEXT_COLOR = '#FFFFFF';
const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 60;

export const EXCEL_FORMATS = {
  money: '$#,##0.00',
  decimal: '#,##0.00',
  date: 'dd/mm/yyyy',
  dateTime: 'dd/mm/yyyy hh:mm',
} as const;

export type ExcelValue = string | number | boolean | Date | null | undefined;

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => ExcelValue;
  /** Formato de Excel para numeros o fechas. Las fechas usan dd/mm/yyyy por defecto. */
  format?: string;
  /** Ancho en caracteres. Si se omite se estima a partir del contenido. */
  width?: number;
}

interface ExcelSheetDefinition<T> {
  name: string;
  rows: T[];
  columns: ExcelColumn<T>[];
}

/** Hoja lista para escribirse, ya desacoplada del tipo de fila original. */
export interface ExcelSheet {
  name: string;
  rowCount: number;
  data: SheetData;
  columns: { width: number }[];
}

/**
 * Convierte una fecha ISO (YYYY-MM-DD) del backend en una fecha de Excel.
 *
 * La libreria escribe la hora UTC tal cual, por eso se construye en UTC para
 * que el dia no se desplace segun la zona horaria del navegador.
 */
export function toExcelDate(fecha?: string | null): Date | string | null {
  if (!fecha) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!match) return fecha;

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** Convierte una fecha con hora del backend a la hora local de Bogota para Excel. */
export function toExcelDateTime(fecha?: string | null): Date | string | null {
  if (!fecha) return null;

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: BOGOTA_TIMEZONE,
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value ?? 0);

  return new Date(Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second')));
}

/** Estima cuantos caracteres ocupa un valor para dimensionar su columna. */
function estimateLength(value: Exclude<ExcelValue, null | undefined>, format?: string) {
  if (value instanceof Date) return (format ?? EXCEL_FORMATS.date).length;
  if (typeof value === 'number') return format ? value.toFixed(2).length + 3 : String(value).length;

  return Math.max(...String(value).split('\n').map(line => line.length));
}

/** Arma una hoja a partir de las filas visibles y la definicion de sus columnas. */
export function buildSheet<T>({ name, rows, columns }: ExcelSheetDefinition<T>): ExcelSheet {
  const widths = columns.map(column => column.header.length);

  const header: CellObject[] = columns.map(column => ({
    value: column.header,
    fontWeight: 'bold',
    backgroundColor: HEADER_BACKGROUND,
    textColor: HEADER_TEXT_COLOR,
  }));

  const body = rows.map(row =>
    columns.map((column, index) => {
      const value = column.value(row);

      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number' && !Number.isFinite(value)) return null;

      widths[index] = Math.max(widths[index], estimateLength(value, column.format));

      if (value instanceof Date) return { value, format: column.format ?? EXCEL_FORMATS.date };
      if (typeof value === 'number' && column.format) return { value, format: column.format };

      return value;
    })
  );

  return {
    name,
    rowCount: rows.length,
    data: [header, ...body],
    columns: columns.map((column, index) => ({
      width: column.width ?? Math.min(Math.max(widths[index] + 2, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH),
    })),
  };
}

/** Agrega la fecha local y la extension al nombre base del archivo. */
export function buildExportFileName(baseName: string, now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${baseName}_${year}-${month}-${day}.xlsx`;
}

/** Genera el archivo .xlsx y dispara su descarga en el navegador. */
export async function exportToExcel(baseName: string, sheets: ExcelSheet[]) {
  // Import dinamico: la libreria solo se descarga cuando el usuario exporta.
  const { default: writeXlsxFile } = await import('write-excel-file/browser');

  await writeXlsxFile(
    sheets.map(sheet => ({
      data: sheet.data,
      sheet: sheet.name,
      columns: sheet.columns,
      stickyRowsCount: 1,
    }))
  ).toFile(buildExportFileName(baseName));
}
