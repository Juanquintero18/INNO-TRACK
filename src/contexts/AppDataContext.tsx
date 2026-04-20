import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import {
  type MateriaPrima,
  type MovimientoInventario,
  type Orden,
  type Pieza,
  type Proveedor,
  type Proyecto,
  type TrabajadorProduccion,
  type UnidadMedida,
  type Usuario,
} from '@/lib/types';

export type DeletedEntityType =
  | 'pieza'
  | 'materia-prima'
  | 'movimiento-inventario'
  | 'proveedor'
  | 'trabajador'
  | 'usuario';

type RestorableEntity = Pieza | MateriaPrima | MovimientoInventario | Proveedor | TrabajadorProduccion | Usuario;

type AuditActor = {
  id: number | null;
  nombre: string;
} | null;

export interface DeletedAuditItem {
  id: number;
  entityType: DeletedEntityType;
  entityId: number;
  entityLabel: string;
  deletedAt: string;
  deletedBy: AuditActor;
  restoredAt?: string | null;
  restoredBy?: AuditActor;
  isRestored: boolean;
  data: Record<string, unknown>;
}

type AppDataContextType = {
  unidadesList: UnidadMedida[];
  setUnidadesList: Dispatch<SetStateAction<UnidadMedida[]>>;
  proyectosList: Proyecto[];
  setProyectosList: Dispatch<SetStateAction<Proyecto[]>>;
  ordenesList: Orden[];
  setOrdenesList: Dispatch<SetStateAction<Orden[]>>;
  piezasList: Pieza[];
  setPiezasList: Dispatch<SetStateAction<Pieza[]>>;
  materiasList: MateriaPrima[];
  setMateriasList: Dispatch<SetStateAction<MateriaPrima[]>>;
  movimientosList: MovimientoInventario[];
  setMovimientosList: Dispatch<SetStateAction<MovimientoInventario[]>>;
  proveedoresList: Proveedor[];
  setProveedoresList: Dispatch<SetStateAction<Proveedor[]>>;
  trabajadoresList: TrabajadorProduccion[];
  setTrabajadoresList: Dispatch<SetStateAction<TrabajadorProduccion[]>>;
  usuariosList: Usuario[];
  setUsuariosList: Dispatch<SetStateAction<Usuario[]>>;
  deletedItems: DeletedAuditItem[];
  deleteEntity: (entityType: DeletedEntityType, entity: RestorableEntity) => Promise<void>;
  restoreDeletedItem: (auditId: number) => Promise<void>;
  getStockLevel: (materiaId: number) => number;
  refreshInventoryData: () => Promise<void>;
  refreshProductionData: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType>({} as AppDataContextType);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unidadesList, setUnidadesList] = useState<UnidadMedida[]>([]);
  const [proyectosList, setProyectosList] = useState<Proyecto[]>([]);
  const [ordenesList, setOrdenesList] = useState<Orden[]>([]);
  const [piezasList, setPiezasList] = useState<Pieza[]>([]);
  const [materiasList, setMateriasList] = useState<MateriaPrima[]>([]);
  const [movimientosList, setMovimientosList] = useState<MovimientoInventario[]>([]);
  const [proveedoresList, setProveedoresList] = useState<Proveedor[]>([]);
  const [trabajadoresList, setTrabajadoresList] = useState<TrabajadorProduccion[]>([]);
  const [usuariosList, setUsuariosList] = useState<Usuario[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedAuditItem[]>([]);

  const refreshInventoryData = async () => {
    if (!user) return;

    const [unidadesResponse, materias, movimientos, proveedoresResponse, trabajadoresResponse] = await Promise.all([
      apiRequest<UnidadMedida[]>('/api/inventory/unidades-medida/'),
      apiRequest<MateriaPrima[]>('/api/inventory/materias-primas/'),
      apiRequest<MovimientoInventario[]>('/api/inventory/movimientos/'),
      apiRequest<Proveedor[]>('/api/inventory/proveedores/'),
      apiRequest<TrabajadorProduccion[]>('/api/inventory/trabajadores/'),
    ]);

    setUnidadesList(unidadesResponse);
    setMateriasList(materias);
    setMovimientosList(movimientos);
    setProveedoresList(proveedoresResponse);
    setTrabajadoresList(trabajadoresResponse);
  };

  const refreshProductionData = async () => {
    if (!user) return;

    const [usersResponse, proyectosResponse, ordenesResponse, piezasResponse] = await Promise.all([
      apiRequest<Usuario[]>('/api/accounts/users/'),
      apiRequest<Proyecto[]>('/api/production/proyectos/'),
      apiRequest<Orden[]>('/api/production/ordenes/'),
      apiRequest<Pieza[]>('/api/production/piezas/'),
    ]);

    setUsuariosList(usersResponse);
    setProyectosList(proyectosResponse);
    setOrdenesList(ordenesResponse);
    setPiezasList(piezasResponse);
  };

  const refreshAuditData = async () => {
    if (!user) return;

    const auditResponse = await apiRequest<DeletedAuditItem[]>('/api/audit/logs/');
    setDeletedItems(auditResponse);
  };

  useEffect(() => {
    if (!user) {
      setUnidadesList([]);
      setProyectosList([]);
      setOrdenesList([]);
      setPiezasList([]);
      setMateriasList([]);
      setMovimientosList([]);
      setProveedoresList([]);
      setTrabajadoresList([]);
      setUsuariosList([]);
      setDeletedItems([]);
      return;
    }

    void Promise.all([refreshInventoryData(), refreshProductionData(), refreshAuditData()]);
  }, [user]);

  const buildDeleteEndpoint = (entityType: DeletedEntityType, entityId: number) => {
    switch (entityType) {
      case 'pieza':
        return `/api/production/piezas/${entityId}/`;
      case 'materia-prima':
        return `/api/inventory/materias-primas/${entityId}/`;
      case 'movimiento-inventario':
        return `/api/inventory/movimientos/${entityId}/`;
      case 'proveedor':
        return `/api/inventory/proveedores/${entityId}/`;
      case 'trabajador':
        return `/api/inventory/trabajadores/${entityId}/`;
      case 'usuario':
        return `/api/accounts/users/${entityId}/`;
    }
  };

  const deleteEntity = async (entityType: DeletedEntityType, entity: RestorableEntity) => {
    await apiRequest(buildDeleteEndpoint(entityType, entity.id), { method: 'DELETE' });

    switch (entityType) {
      case 'pieza':
        setPiezasList(prev => prev.filter(item => item.id !== entity.id));
        break;
      case 'materia-prima':
        setMateriasList(prev => prev.filter(item => item.id !== entity.id));
        break;
      case 'movimiento-inventario':
        setMovimientosList(prev => prev.filter(item => item.id !== entity.id));
        break;
      case 'proveedor':
        setProveedoresList(prev => prev.filter(item => item.id !== entity.id));
        break;
      case 'trabajador':
        setTrabajadoresList(prev => prev.filter(item => item.id !== entity.id));
        break;
      case 'usuario':
        setUsuariosList(prev => prev.filter(item => item.id !== entity.id));
        break;
    }

    await refreshAuditData();
  };

  const restoreDeletedItem = async (auditId: number) => {
    const auditItem = deletedItems.find(item => item.id === auditId);

    if (!auditItem) return;

    await apiRequest(`/api/audit/logs/${auditId}/restore/`, {
      method: 'POST',
    });

    if (auditItem.entityType === 'pieza' || auditItem.entityType === 'usuario') {
      await refreshProductionData();
    }

    if (
      auditItem.entityType === 'materia-prima' ||
      auditItem.entityType === 'movimiento-inventario' ||
      auditItem.entityType === 'proveedor' ||
      auditItem.entityType === 'trabajador'
    ) {
      await refreshInventoryData();
    }

    await refreshAuditData();
  };

  const getStockLevel = (materiaId: number) => {
    const entradas = movimientosList
      .filter(movimiento => movimiento.materia_prima_id === materiaId && movimiento.tipo === 'entrada')
      .reduce((sum, movimiento) => sum + movimiento.cantidad, 0);

    const salidas = movimientosList
      .filter(movimiento => movimiento.materia_prima_id === materiaId && movimiento.tipo === 'salida')
      .reduce((sum, movimiento) => sum + movimiento.cantidad, 0);

    const ajustes = movimientosList
      .filter(movimiento => movimiento.materia_prima_id === materiaId && movimiento.tipo === 'ajuste')
      .reduce((sum, movimiento) => sum + movimiento.cantidad, 0);

    return entradas - salidas + ajustes;
  };

  const value = useMemo(
    () => ({
      unidadesList,
      setUnidadesList,
      proyectosList,
      setProyectosList,
      ordenesList,
      setOrdenesList,
      piezasList,
      setPiezasList,
      materiasList,
      setMateriasList,
      movimientosList,
      setMovimientosList,
      proveedoresList,
      setProveedoresList,
      trabajadoresList,
      setTrabajadoresList,
      usuariosList,
      setUsuariosList,
      deletedItems,
      deleteEntity,
      restoreDeletedItem,
      getStockLevel,
      refreshInventoryData,
      refreshProductionData,
    }),
    [unidadesList, proyectosList, ordenesList, piezasList, materiasList, movimientosList, proveedoresList, trabajadoresList, usuariosList, deletedItems]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => useContext(AppDataContext);