/**
 * Formato de los valores que aparecen en el historial de cambios de una pieza.
 *
 * El historial guarda IDs de orden y de usuario; aquí se muestran con su
 * código o nombre actual.
 */
import { useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { formatFecha } from '@/lib/dates';

export const historialFieldLabels: Record<string, string> = {
  trace_id: 'Trace ID',
  nombre: 'Nombre',
  orden_id: 'Orden',
  usuario_id: 'Usuario responsable',
  fecha_gelcoat: 'Fecha gelcoat',
  fecha_qc: 'Fecha QC',
  peso_real: 'Peso real',
};

export const materialChangeLabels: Record<'agregado' | 'eliminado' | 'actualizado', string> = {
  agregado: 'Material agregado',
  eliminado: 'Material eliminado',
  actualizado: 'Material actualizado',
};

const SIN_REGISTRO = 'No registrado';

export const formatMaterialCantidad = (value: string | null | undefined) => value ?? SIN_REGISTRO;

export type HistorialValueFormatter = (field: string, value: string | number | null | undefined) => string;

export function useHistorialFormatter(): HistorialValueFormatter {
  const { ordenesList, usuariosList } = useAppData();

  const ordenLabelById = useMemo(
    () => new Map(ordenesList.map(orden => [orden.id, orden.codigo_orden || `Orden #${orden.id}`])),
    [ordenesList]
  );

  const usuarioLabelById = useMemo(
    () =>
      new Map(
        usuariosList.map(usuario => [
          usuario.id,
          `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() || usuario.email || `Usuario #${usuario.id}`,
        ])
      ),
    [usuariosList]
  );

  return (field, value) => {
    if (value === null || value === undefined || value === '') return SIN_REGISTRO;

    if ((field === 'fecha_gelcoat' || field === 'fecha_qc') && typeof value === 'string') {
      return formatFecha(value);
    }

    if (field === 'orden_id') {
      const id = Number(value);
      return ordenLabelById.get(id) || `Orden #${id}`;
    }

    if (field === 'usuario_id') {
      const id = Number(value);
      return usuarioLabelById.get(id) || `Usuario #${id}`;
    }

    if (field === 'peso_real') {
      return `${value} kg`;
    }

    return String(value);
  };
}
