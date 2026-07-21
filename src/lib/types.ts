/**
 * Contratos TypeScript del dominio compartidos entre páginas y contextos.
 *
 * Mantener este archivo alineado con serializers del backend evita
 * inconsistencias de tipado en tiempo de desarrollo.
 */
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

export interface MateriaPrimaStabilityThresholds {
  stock_critico_max: number;
  stock_bajo_max: number;
}

export interface MateriaPrima {
  id: number;
  unidad_medida_id: number | null;
  nombre: string;
  costo: number | null;
  fecha_actualizacion: string | null;
  unidad_medida?: UnidadMedida;
  stability_thresholds: MateriaPrimaStabilityThresholds;
  enabled_for_piezas: boolean;
  piezas_usage_count: number;
}

export interface Orden {
  id: number;
  proyecto_id: number | null;
  codigo_orden: string | null;
  fecha_creacion: string | null;
  estado: string | null;
  proyecto?: Proyecto;
}

export interface PiezaHistorialMaterialState {
  cantidad_teorica: string | null;
  cantidad_real: string | null;
}

export interface PiezaHistorialMaterialChange {
  change_type: 'agregado' | 'eliminado' | 'actualizado';
  materia_prima_id: number | null;
  materia_prima_nombre: string | null;
  before: PiezaHistorialMaterialState | null;
  after: PiezaHistorialMaterialState | null;
}

export interface PiezaHistorialFieldChange {
  field: string;
  label: string;
  before: string | number | null;
  after: string | number | null;
}

export interface PiezaHistorialSnapshot {
  trace_id: string | null;
  nombre: string | null;
  orden_id: number | null;
  usuario_id: number | null;
  fecha_gelcoat: string | null;
  fecha_qc: string | null;
  peso_real: string | null;
  materias_primas: Array<{
    materia_prima_id: number | null;
    materia_prima_nombre: string | null;
    cantidad_teorica: string | null;
    cantidad_real: string | null;
  }>;
}

export interface PiezaHistorialDetalle {
  // Schema versionado para mantener compatibilidad con registros legacy.
  schema: 'pieza_historial_v1';
  accion: 'creacion' | 'edicion';
  summary: string;
  legacy?: boolean;
  field_changes?: PiezaHistorialFieldChange[];
  material_changes?: PiezaHistorialMaterialChange[];
  before?: PiezaHistorialSnapshot;
  after?: PiezaHistorialSnapshot;
  initial?: PiezaHistorialSnapshot;
}

export interface PiezaHistorial {
  id: number;
  accion: 'creacion' | 'edicion';
  fecha: string;
  usuario_id: number | null;
  usuario?: Usuario;
  descripcion: string;
  detalle?: PiezaHistorialDetalle | null;
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

export interface MovimientoImportPreviewRow {
  row_number: number;
  status: 'valid' | 'error';
  errors: string[];
  values: {
    materia_prima: string;
    tipo: string;
    cantidad: string;
    fecha: string;
    proveedor: string;
    trabajador: string;
    motivo: string;
    referencia: string;
  };
  resolved: {
    materia_prima: string | null;
    proveedor: string | null;
    trabajador: string | null;
  };
}

export interface MovimientoImportPreview {
  // Resumen integral de validación previo a confirmar la importación.
  file_name: string;
  file_errors: string[];
  header_observations: string[];
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  can_import: boolean;
  rows: MovimientoImportPreviewRow[];
}

export interface MovimientoImportCommitResult {
  // Resultado de ejecución del commit con IDs creados y preview base.
  created_count: number;
  created_ids: number[];
  preview: MovimientoImportPreview;
}