export interface Proyecto {
  id: number;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
}

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string | null;
  contrasena?: string;
  rol: string | null;
}

export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string | null;
}

export interface Proveedor {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
}

export interface TrabajadorProduccion {
  id: number;
  codigo_trabajador: string | null;
  nombre: string | null;
}

export interface MateriaPrima {
  id: number;
  unidad_medida_id: number | null;
  nombre: string;
  costo: number | null;
  fecha_actualizacion: string | null;
  unidad_medida?: UnidadMedida;
}

export interface Orden {
  id: number;
  proyecto_id: number | null;
  codigo_orden: string | null;
  fecha_creacion: string | null;
  estado: string | null;
  proyecto?: Proyecto;
}

export interface PiezaHistorial {
  id: number;
  accion: 'creacion' | 'edicion';
  fecha: string;
  usuario_id: number | null;
  usuario?: Usuario;
  descripcion: string;
}

export interface PiezaMateriaPrima {
  id: number;
  pieza_id: number | null;
  materia_prima_id: number | null;
  cantidad_teorica: number | null;
  cantidad_real: number | null;
  materia_prima?: MateriaPrima;
}

export interface Pieza {
  id: number;
  orden_id: number | null;
  usuario_id: number | null;
  trace_id: string | null;
  nombre: string | null;
  fecha_gelcoat: string | null;
  fecha_qc: string | null;
  peso_real: number | null;
  orden?: Orden;
  usuario?: Usuario;
  materias_primas?: PiezaMateriaPrima[];
  historial?: PiezaHistorial[];
}

export interface MovimientoInventario {
  id: number;
  materia_prima_id: number | null;
  proveedor_id: number | null;
  usuario_id: number | null;
  trabajador_produccion_id: number | null;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  fecha: string | null;
  motivo: string | null;
  referencia: string | null;
  materia_prima?: MateriaPrima;
  proveedor?: Proveedor;
  usuario?: Usuario;
  trabajador?: TrabajadorProduccion;
}