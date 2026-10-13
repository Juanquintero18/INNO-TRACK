/**
 * Formato y comparación de fechas del sistema.
 *
 * El backend entrega fechas como texto ISO: solo día (YYYY-MM-DD) o día y
 * hora. Todo se muestra en hora de Colombia.
 */
export const BOGOTA_TIMEZONE = 'America/Bogota';

const EMPTY = '—';

/** Muestra una fecha ISO (YYYY-MM-DD) como dd/mm/yyyy. */
export function formatFecha(fecha?: string | null) {
  if (!fecha) return EMPTY;

  const [year, month, day] = fecha.split('-');

  if (!year || !month || !day) return fecha;

  return `${day}/${month}/${year}`;
}

/** Muestra una fecha con hora en zona horaria de Bogotá. */
export function formatFechaHora(fecha?: string | null) {
  if (!fecha) return EMPTY;

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return fecha;

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BOGOTA_TIMEZONE,
  }).format(date);
}

/**
 * Indica si una fecha ISO cae dentro de un rango opcional.
 *
 * Sin límites, todo pasa. Con algún límite, los registros sin fecha quedan fuera.
 */
export function isWithinDateRange(fecha: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!fecha) return false;

  if (from && fecha < from) return false;
  if (to && fecha > to) return false;

  return true;
}
