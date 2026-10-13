/**
 * Convierte cada valor de un respaldo de auditoría en un texto legible.
 *
 * Los respaldos guardan referencias como IDs (usuario, orden, proveedor...).
 * Aquí se resuelven a nombres usando los datos activos y, si el registro
 * referenciado también fue eliminado, la etiqueta que quedó en la auditoría.
 */
import { useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import type { DeletedEntityType } from '@/lib/types';
import {
  formatDateValue,
  getNumericId,
  humanizeToken,
  isDateLikeField,
  snapshotValueLabels,
  type ResolveSnapshotValue,
} from './snapshot-format';

type LabelMaps = Partial<Record<string, Map<number, string>>>;

export function useSnapshotResolver(): ResolveSnapshotValue {
  const {
    deletedItems,
    unidadesList,
    proyectosList,
    ordenesList,
    piezasList,
    materiasList,
    proveedoresList,
    trabajadoresList,
    usuariosList,
  } = useAppData();

  // Índices en memoria para resolver IDs a etiquetas sin recalcular en cada celda.
  const activeLabels: LabelMaps = useMemo(
    () => ({
      usuario_id: new Map(
        usuariosList.map(usuario => [
          usuario.id,
          `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() || usuario.email || `Usuario #${usuario.id}`,
        ])
      ),
      unidad_medida_id: new Map(
        unidadesList.map(unidad => [
          unidad.id,
          unidad.abreviatura ? `${unidad.nombre} (${unidad.abreviatura})` : unidad.nombre,
        ])
      ),
      proyecto_id: new Map(
        proyectosList.map(proyecto => [
          proyecto.id,
          [proyecto.codigo, proyecto.nombre].filter(Boolean).join(' - ') || `Proyecto #${proyecto.id}`,
        ])
      ),
      orden_id: new Map(ordenesList.map(orden => [orden.id, orden.codigo_orden || `Orden #${orden.id}`])),
      pieza_id: new Map(
        piezasList.map(pieza => [
          pieza.id,
          [pieza.trace_id, pieza.nombre].filter(Boolean).join(' - ') || `Pieza #${pieza.id}`,
        ])
      ),
      materia_prima_id: new Map(materiasList.map(materia => [materia.id, materia.nombre])),
      proveedor_id: new Map(proveedoresList.map(proveedor => [proveedor.id, proveedor.nombre])),
      trabajador_produccion_id: new Map(
        trabajadoresList.map(trabajador => [
          trabajador.id,
          [trabajador.nombre, trabajador.codigo_trabajador].filter(Boolean).join(' - ') || `Trabajador #${trabajador.id}`,
        ])
      ),
    }),
    [materiasList, ordenesList, piezasList, proyectosList, proveedoresList, trabajadoresList, unidadesList, usuariosList]
  );

  // Fallback: si la referencia ya no existe activa, intentamos resolverla desde el propio log.
  const deletedLabels: LabelMaps = useMemo(() => {
    const labelsOf = (entityType: DeletedEntityType) =>
      new Map(deletedItems.filter(item => item.entityType === entityType).map(item => [item.entityId, item.entityLabel]));

    return {
      usuario_id: labelsOf('usuario'),
      pieza_id: labelsOf('pieza'),
      materia_prima_id: labelsOf('materia-prima'),
      proveedor_id: labelsOf('proveedor'),
      trabajador_produccion_id: labelsOf('trabajador'),
    };
  }, [deletedItems]);

  return (fieldName, value, auditItem) => {
    if (value === null || value === undefined || value === '') {
      return { primary: 'No registrado', tone: 'muted' };
    }

    if (typeof value === 'boolean') {
      return { primary: value ? 'Sí' : 'No' };
    }

    if (fieldName && typeof value === 'string') {
      const mappedValue = snapshotValueLabels[fieldName]?.[value.toLowerCase()];

      if (mappedValue) {
        return { primary: mappedValue };
      }

      if ((fieldName === 'rol' || fieldName === 'estado') && /^[a-z0-9_\s-]+$/i.test(value)) {
        return { primary: humanizeToken(value) };
      }

      if (isDateLikeField(fieldName)) {
        const formattedDate = formatDateValue(value);

        if (formattedDate) {
          return { primary: formattedDate };
        }
      }
    }

    const numericId = fieldName ? getNumericId(value) : null;

    if (fieldName && numericId !== null) {
      if (fieldName === 'pieza_id' && auditItem.entityType === 'pieza' && numericId === auditItem.entityId) {
        return {
          primary: `${auditItem.entityLabel} (registro auditado)`,
          secondary: `Referencia interna: ID ${numericId}`,
        };
      }

      // Prioriza entidad activa; si ya fue borrada, cae al mapa de eliminados.
      const resolvedLabel = activeLabels[fieldName]?.get(numericId) || deletedLabels[fieldName]?.get(numericId);

      if (resolvedLabel) {
        return {
          primary: resolvedLabel,
          secondary: `Referencia interna: ID ${numericId}`,
        };
      }

      if (fieldName.endsWith('_id')) {
        return {
          primary: `ID ${numericId}`,
          secondary: 'No fue posible resolver esta referencia con un nombre visible.',
        };
      }
    }

    return { primary: String(value) };
  };
}
