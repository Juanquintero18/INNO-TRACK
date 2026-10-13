/**
 * Contexto que concentra los datos compartidos del dominio.
 *
 * Desde aqui se cargan catalogos, entidades principales, auditoria y helpers
 * derivados como el stock calculado de materias primas.
 */
import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, ENDPOINTS } from '@/lib/api';
import type {
  DeletedAuditItem,
  DeletedEntityType,
  MateriaPrima,
  MovimientoInventario,
  Orden,
  Pieza,
  Proveedor,
  Proyecto,
  TrabajadorProduccion,
  UnidadMedida,
  Usuario,
} from '@/lib/types';

type RestorableEntity = Pieza | MateriaPrima | MovimientoInventario | Proveedor | TrabajadorProduccion | Usuario;

type ListSetter<T> = Dispatch<SetStateAction<T[]>>;

type AppDataContextType = {
  unidadesList: UnidadMedida[];
  setUnidadesList: ListSetter<UnidadMedida>;
  proyectosList: Proyecto[];
  setProyectosList: ListSetter<Proyecto>;
  ordenesList: Orden[];
  setOrdenesList: ListSetter<Orden>;
  piezasList: Pieza[];
  setPiezasList: ListSetter<Pieza>;
  materiasList: MateriaPrima[];
  setMateriasList: ListSetter<MateriaPrima>;
  movimientosList: MovimientoInventario[];
  setMovimientosList: ListSetter<MovimientoInventario>;
  proveedoresList: Proveedor[];
  setProveedoresList: ListSetter<Proveedor>;
  trabajadoresList: TrabajadorProduccion[];
  setTrabajadoresList: ListSetter<TrabajadorProduccion>;
  usuariosList: Usuario[];
  setUsuariosList: ListSetter<Usuario>;
  deletedItems: DeletedAuditItem[];
  deleteEntity: (entityType: DeletedEntityType, entity: RestorableEntity) => Promise<void>;
  restoreDeletedItem: (auditId: number) => Promise<void>;
  getStockLevel: (materiaId: number) => number;
  refreshInventoryData: () => Promise<void>;
  refreshProductionData: () => Promise<void>;
};

/** Endpoint REST de cada tipo de entidad que se puede eliminar con auditoría. */
const ENTITY_ENDPOINTS: Record<DeletedEntityType, string> = {
  pieza: ENDPOINTS.piezas,
  'materia-prima': ENDPOINTS.materiasPrimas,
  'movimiento-inventario': ENDPOINTS.movimientos,
  proveedor: ENDPOINTS.proveedores,
  trabajador: ENDPOINTS.trabajadores,
  usuario: ENDPOINTS.usuarios,
};

/** Entidades que se cargan con el bloque de producción; el resto pertenece a inventario. */
const PRODUCTION_ENTITY_TYPES: DeletedEntityType[] = ['pieza', 'usuario'];

const removeById = <T extends { id: number }>(setList: ListSetter<T>, id: number) =>
  setList(prev => prev.filter(item => item.id !== id));

const AppDataContext = createContext<AppDataContextType>({} as AppDataContextType);

/**
 * Provider responsable de sincronizar el frontend con la API del sistema.
 *
 * Mantiene en memoria las listas maestras para evitar que cada pagina tenga que
 * duplicar la logica de carga y actualizacion de datos.
 */
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

  /** Carga todo el bloque de inventario con peticiones paralelas. */
  const refreshInventoryData = async () => {
    if (!user) return;

    const [unidades, materias, movimientos, proveedores, trabajadores] = await Promise.all([
      apiRequest<UnidadMedida[]>(ENDPOINTS.unidadesMedida),
      apiRequest<MateriaPrima[]>(ENDPOINTS.materiasPrimas),
      apiRequest<MovimientoInventario[]>(ENDPOINTS.movimientos),
      apiRequest<Proveedor[]>(ENDPOINTS.proveedores),
      apiRequest<TrabajadorProduccion[]>(ENDPOINTS.trabajadores),
    ]);

    setUnidadesList(unidades);
    setMateriasList(materias);
    setMovimientosList(movimientos);
    setProveedoresList(proveedores);
    setTrabajadoresList(trabajadores);
  };

  /** Carga usuarios, proyectos, ordenes y piezas para el modulo de produccion. */
  const refreshProductionData = async () => {
    if (!user) return;

    const [usuarios, proyectos, ordenes, piezas] = await Promise.all([
      apiRequest<Usuario[]>(ENDPOINTS.usuarios),
      apiRequest<Proyecto[]>(ENDPOINTS.proyectos),
      apiRequest<Orden[]>(ENDPOINTS.ordenes),
      apiRequest<Pieza[]>(ENDPOINTS.piezas),
    ]);

    setUsuariosList(usuarios);
    setProyectosList(proyectos);
    setOrdenesList(ordenes);
    setPiezasList(piezas);
  };

  /** Recupera el historial de eliminaciones restaurables. */
  const refreshAuditData = async () => {
    if (!user) return;

    setDeletedItems(await apiRequest<DeletedAuditItem[]>(ENDPOINTS.auditLogs));
  };

  useEffect(() => {
    // Sin usuario autenticado no se conserva ningun dato para evitar fugas de
    // informacion entre sesiones.
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
    // Solo debe recargarse cuando cambia la sesion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /** Quita de su lista en memoria la entidad recien eliminada. */
  const removeFromList: Record<DeletedEntityType, (id: number) => void> = {
    pieza: id => removeById(setPiezasList, id),
    'materia-prima': id => removeById(setMateriasList, id),
    'movimiento-inventario': id => removeById(setMovimientosList, id),
    proveedor: id => removeById(setProveedoresList, id),
    trabajador: id => removeById(setTrabajadoresList, id),
    usuario: id => removeById(setUsuariosList, id),
  };

  /** Ejecuta el borrado remoto, actualiza el estado local y refresca auditoria. */
  const deleteEntity = async (entityType: DeletedEntityType, entity: RestorableEntity) => {
    await apiRequest(`${ENTITY_ENDPOINTS[entityType]}${entity.id}/`, { method: 'DELETE' });

    removeFromList[entityType](entity.id);

    await refreshAuditData();
  };

  /** Restaura una entidad eliminada y vuelve a sincronizar los modulos afectados. */
  const restoreDeletedItem = async (auditId: number) => {
    const auditItem = deletedItems.find(item => item.id === auditId);

    if (!auditItem) return;

    await apiRequest(`${ENDPOINTS.auditLogs}${auditId}/restore/`, { method: 'POST' });

    if (PRODUCTION_ENTITY_TYPES.includes(auditItem.entityType)) {
      await refreshProductionData();
    } else {
      await refreshInventoryData();
    }

    await refreshAuditData();
  };

  /** Calcula stock disponible a partir de entradas, salidas y ajustes. */
  const getStockLevel = (materiaId: number) => {
    let entradas = 0;
    let salidas = 0;
    let ajustes = 0;

    for (const movimiento of movimientosList) {
      if (movimiento.materia_prima_id !== materiaId) continue;

      if (movimiento.tipo === 'entrada') entradas += movimiento.cantidad;
      else if (movimiento.tipo === 'salida') salidas += movimiento.cantidad;
      else if (movimiento.tipo === 'ajuste') ajustes += movimiento.cantidad;
    }

    return entradas - salidas + ajustes;
  };

  // useMemo evita recrear el objeto del contexto cuando su contenido no cambia.
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
    // Las funciones dependen solo de la sesion y de las listas ya incluidas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, unidadesList, proyectosList, ordenesList, piezasList, materiasList, movimientosList, proveedoresList, trabajadoresList, usuariosList, deletedItems]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => useContext(AppDataContext);
