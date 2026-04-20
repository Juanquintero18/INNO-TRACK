import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  materiasPrimas,
  movimientosInventario,
  piezas,
  proveedores,
  trabajadoresProduccion,
  usuarios,
  type MateriaPrima,
  type MovimientoInventario,
  type Pieza,
  type Proveedor,
  type TrabajadorProduccion,
  type Usuario,
} from '@/lib/mock-data';

export type DeletedEntityType =
  | 'pieza'
  | 'materia-prima'
  | 'movimiento-inventario'
  | 'proveedor'
  | 'trabajador'
  | 'usuario';

type RestorableEntity = Pieza | MateriaPrima | MovimientoInventario | Proveedor | TrabajadorProduccion | Usuario;

export interface DeletedAuditItem {
  id: string;
  entityType: DeletedEntityType;
  entityId: number;
  entityLabel: string;
  deletedAt: string;
  deletedBy: Usuario | null;
  data: RestorableEntity;
}

type AppDataContextType = {
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
  deleteEntity: (entityType: DeletedEntityType, entity: RestorableEntity) => void;
  restoreDeletedItem: (auditId: string) => void;
  getStockLevel: (materiaId: number) => number;
};

const AppDataContext = createContext<AppDataContextType>({} as AppDataContextType);

const sortById = <T extends { id: number }>(items: T[]) => [...items].sort((a, b) => a.id - b.id);

const getEntityLabel = (entityType: DeletedEntityType, entity: RestorableEntity) => {
  switch (entityType) {
    case 'pieza': {
      const pieza = entity as Pieza;
      return [pieza.trace_id, pieza.nombre].filter(Boolean).join(' - ') || `Pieza #${pieza.id}`;
    }
    case 'materia-prima':
      return (entity as MateriaPrima).nombre;
    case 'movimiento-inventario': {
      const movimiento = entity as MovimientoInventario;
      return movimiento.referencia || movimiento.motivo || `Movimiento #${movimiento.id}`;
    }
    case 'proveedor':
      return (entity as Proveedor).nombre;
    case 'trabajador':
      return (entity as TrabajadorProduccion).nombre || `Trabajador #${entity.id}`;
    case 'usuario': {
      const usuario = entity as Usuario;
      return `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() || usuario.email || `Usuario #${usuario.id}`;
    }
  }
};

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [piezasList, setPiezasList] = useState<Pieza[]>(piezas);
  const [materiasList, setMateriasList] = useState<MateriaPrima[]>(materiasPrimas);
  const [movimientosList, setMovimientosList] = useState<MovimientoInventario[]>(movimientosInventario);
  const [proveedoresList, setProveedoresList] = useState<Proveedor[]>(proveedores);
  const [trabajadoresList, setTrabajadoresList] = useState<TrabajadorProduccion[]>(trabajadoresProduccion);
  const [usuariosList, setUsuariosList] = useState<Usuario[]>(usuarios);
  const [deletedItems, setDeletedItems] = useState<DeletedAuditItem[]>([]);

  const deleteEntity = (entityType: DeletedEntityType, entity: RestorableEntity) => {
    const auditItem: DeletedAuditItem = {
      id: `${entityType}-${entity.id}-${Date.now()}`,
      entityType,
      entityId: entity.id,
      entityLabel: getEntityLabel(entityType, entity),
      deletedAt: new Date().toISOString(),
      deletedBy: user,
      data: entity,
    };

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

    setDeletedItems(prev => [auditItem, ...prev]);
  };

  const restoreDeletedItem = (auditId: string) => {
    const auditItem = deletedItems.find(item => item.id === auditId);

    if (!auditItem) return;

    switch (auditItem.entityType) {
      case 'pieza':
        setPiezasList(prev => sortById([...prev, auditItem.data as Pieza]));
        break;
      case 'materia-prima':
        setMateriasList(prev => sortById([...prev, auditItem.data as MateriaPrima]));
        break;
      case 'movimiento-inventario':
        setMovimientosList(prev => sortById([...prev, auditItem.data as MovimientoInventario]));
        break;
      case 'proveedor':
        setProveedoresList(prev => sortById([...prev, auditItem.data as Proveedor]));
        break;
      case 'trabajador':
        setTrabajadoresList(prev => sortById([...prev, auditItem.data as TrabajadorProduccion]));
        break;
      case 'usuario':
        setUsuariosList(prev => sortById([...prev, auditItem.data as Usuario]));
        break;
    }

    setDeletedItems(prev => prev.filter(item => item.id !== auditId));
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
    }),
    [piezasList, materiasList, movimientosList, proveedoresList, trabajadoresList, usuariosList, deletedItems, user]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => useContext(AppDataContext);