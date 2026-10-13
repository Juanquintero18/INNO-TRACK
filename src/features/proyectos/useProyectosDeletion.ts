/**
 * Eliminación de proyectos y órdenes.
 *
 * Igual que el backend, no se permite borrar un proyecto con órdenes ni una
 * orden con piezas; aquí se avisa antes de intentar la petición.
 */
import { useAppData } from '@/contexts/AppDataContext';
import { useModulePermission } from '@/hooks/useModulePermission';
import { apiRequest, ENDPOINTS } from '@/lib/api';
import { formatFecha } from '@/lib/dates';
import type { Orden, Proyecto } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { formatStatusLabel, type CountById } from './proyectos-utils';

/** Cuántos registros dependientes se listan como ejemplo en el aviso. */
const PREVIEW_LIMIT = 5;

export function useProyectosDeletion(pieceCountByOrderId: CountById) {
  const { proyectosList, setProyectosList, ordenesList, setOrdenesList, piezasList } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('proyectos');

  const deleteProyecto = async (proyecto: Proyecto) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const relatedOrders = ordenesList.filter(orden => orden.proyecto_id === proyecto.id);

    if (relatedOrders.length > 0) {
      const totalPieces = relatedOrders.reduce((total, orden) => total + (pieceCountByOrderId.get(orden.id) ?? 0), 0);
      const orderPreview = relatedOrders
        .slice(0, PREVIEW_LIMIT)
        .map(orden => `- ${orden.codigo_orden || `Orden #${orden.id}`} (${pieceCountByOrderId.get(orden.id) ?? 0} pieza(s))`)
        .join('\n');

      window.alert(
        `No puedes eliminar el proyecto ${proyecto.nombre || proyecto.id} porque tiene dependencias activas.\n\n` +
          `Órdenes asociadas: ${relatedOrders.length}\n` +
          `Piezas asociadas en esas órdenes: ${totalPieces}\n\n` +
          `Resumen de órdenes:\n${orderPreview}\n\n` +
          'Elimina o reasigna esas órdenes antes de intentar borrar el proyecto.'
      );
      return;
    }

    const confirmText =
      `Vas a eliminar este proyecto de forma permanente.\n\n` +
      `Proyecto: ${proyecto.nombre || `Proyecto #${proyecto.id}`}\n` +
      `Código: ${proyecto.codigo || 'Sin código'}\n` +
      `Estado: ${formatStatusLabel(proyecto.estado)}\n` +
      `Fecha inicio: ${formatFecha(proyecto.fecha_inicio)}\n` +
      `Fecha fin: ${formatFecha(proyecto.fecha_fin)}\n\n` +
      'Esta acción no se puede deshacer. ¿Deseas continuar?';

    if (!window.confirm(confirmText)) return;

    try {
      await apiRequest(`${ENDPOINTS.proyectos}${proyecto.id}/`, { method: 'DELETE' });
      setProyectosList(prev => prev.filter(item => item.id !== proyecto.id));
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar el proyecto.'));
    }
  };

  const deleteOrden = async (orden: Orden) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const relatedPieces = piezasList.filter(pieza => pieza.orden_id === orden.id);
    const projectLabel =
      proyectosList.find(proyecto => proyecto.id === orden.proyecto_id)?.nombre || `Proyecto #${orden.proyecto_id}`;

    if (relatedPieces.length > 0) {
      const piecesPreview = relatedPieces
        .slice(0, PREVIEW_LIMIT)
        .map(pieza => `- ${pieza.trace_id || pieza.nombre || `Pieza #${pieza.id}`}`)
        .join('\n');

      window.alert(
        `No puedes eliminar la orden ${orden.codigo_orden || orden.id} porque tiene piezas asociadas.\n\n` +
          `Proyecto: ${projectLabel}\n` +
          `Piezas asociadas: ${relatedPieces.length}\n\n` +
          `Ejemplos de piezas:\n${piecesPreview}\n\n` +
          'Debes eliminar o mover esas piezas antes de borrar la orden.'
      );
      return;
    }

    const confirmText =
      `Vas a eliminar esta orden de forma permanente.\n\n` +
      `Orden: ${orden.codigo_orden || `Orden #${orden.id}`}\n` +
      `Proyecto: ${projectLabel}\n` +
      `Estado: ${formatStatusLabel(orden.estado)}\n` +
      `Fecha creación: ${formatFecha(orden.fecha_creacion)}\n\n` +
      'Esta acción no se puede deshacer. ¿Deseas continuar?';

    if (!window.confirm(confirmText)) return;

    try {
      await apiRequest(`${ENDPOINTS.ordenes}${orden.id}/`, { method: 'DELETE' });
      setOrdenesList(prev => prev.filter(item => item.id !== orden.id));
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar la orden.'));
    }
  };

  return { deleteProyecto, deleteOrden };
}
