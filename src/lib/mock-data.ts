// Mock data based on the PostgreSQL schema

export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
}

export interface MateriaPrima {
  id: number;
  unidad_medida_id: number;
  nombre: string;
  costo: number;
  fecha_actualizacion: string;
  unidad_medida?: UnidadMedida;
}

export interface Proveedor {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface TrabajadorProduccion {
  id: number;
  codigo_trabajador: string;
  nombre: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'administrador' | 'trabajador';
}

export interface Pieza {
  id: number;
  usuario_id: number;
  trace_id: string;
  nombre: string;
  fecha_gelcoat: string | null;
  fecha_qc: string | null;
  peso_real: number | null;
  materias_primas?: PiezaMateriaPrima[];
}

export interface PiezaMateriaPrima {
  id: number;
  pieza_id: number;
  materia_prima_id: number;
  cantidad_teorica: number;
  cantidad_real: number | null;
  materia_prima?: MateriaPrima;
}

export interface MovimientoInventario {
  id: number;
  materia_prima_id: number;
  usuario_id: number;
  proveedor_id: number | null;
  trabajador_produccion_id: number | null;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  fecha: string;
  motivo: string | null;
  referencia: string | null;
  materia_prima?: MateriaPrima;
  proveedor?: Proveedor;
  trabajador?: TrabajadorProduccion;
}

// --- Mock Data ---

export const unidadesMedida: UnidadMedida[] = [
  { id: 1, nombre: 'Kilogramo', abreviatura: 'kg' },
  { id: 2, nombre: 'Litro', abreviatura: 'L' },
  { id: 3, nombre: 'Metro', abreviatura: 'm' },
  { id: 4, nombre: 'Unidad', abreviatura: 'ud' },
  { id: 5, nombre: 'Galón', abreviatura: 'gal' },
];

export const materiasPrimas: MateriaPrima[] = [
  { id: 1, unidad_medida_id: 1, nombre: 'Resina poliéster', costo: 45.50, fecha_actualizacion: '2025-02-15', unidad_medida: unidadesMedida[0] },
  { id: 2, unidad_medida_id: 1, nombre: 'Fibra de vidrio', costo: 32.00, fecha_actualizacion: '2025-02-10', unidad_medida: unidadesMedida[0] },
  { id: 3, unidad_medida_id: 2, nombre: 'Gelcoat blanco', costo: 78.90, fecha_actualizacion: '2025-01-28', unidad_medida: unidadesMedida[1] },
  { id: 4, unidad_medida_id: 2, nombre: 'Gelcoat azul', costo: 85.20, fecha_actualizacion: '2025-02-01', unidad_medida: unidadesMedida[1] },
  { id: 5, unidad_medida_id: 2, nombre: 'Catalizador MEKP', costo: 22.30, fecha_actualizacion: '2025-02-20', unidad_medida: unidadesMedida[1] },
  { id: 6, unidad_medida_id: 1, nombre: 'Carbonato de calcio', costo: 8.50, fecha_actualizacion: '2025-01-15', unidad_medida: unidadesMedida[0] },
  { id: 7, unidad_medida_id: 3, nombre: 'Manta de refuerzo', costo: 15.75, fecha_actualizacion: '2025-02-05', unidad_medida: unidadesMedida[2] },
  { id: 8, unidad_medida_id: 5, nombre: 'Acetona', costo: 18.00, fecha_actualizacion: '2025-02-18', unidad_medida: unidadesMedida[4] },
];

export const proveedores: Proveedor[] = [
  { id: 1, nombre: 'Química Industrial S.A.', telefono: '+57 311 234 5678', email: 'ventas@quimicaindustrial.com', direccion: 'Cra 45 #23-10, Bogotá' },
  { id: 2, nombre: 'FibraMax Colombia', telefono: '+57 300 987 6543', email: 'contacto@fibramax.co', direccion: 'Cl 80 #12-45, Medellín' },
  { id: 3, nombre: 'Resinas del Caribe', telefono: '+57 315 456 7890', email: 'info@resinascaribe.com', direccion: 'Av. Pedro de Heredia, Cartagena' },
  { id: 4, nombre: 'Materiales Compuestos Ltda.', telefono: '+57 320 111 2233', email: 'ventas@matcomp.com', direccion: 'Zona Industrial, Cali' },
];

export const trabajadoresProduccion: TrabajadorProduccion[] = [
  { id: 1, codigo_trabajador: 'TRB-001', nombre: 'Carlos Martínez' },
  { id: 2, codigo_trabajador: 'TRB-002', nombre: 'Luis Hernández' },
  { id: 3, codigo_trabajador: 'TRB-003', nombre: 'Ana García' },
  { id: 4, codigo_trabajador: 'TRB-004', nombre: 'Pedro Ramírez' },
  { id: 5, codigo_trabajador: 'TRB-005', nombre: 'María López' },
];

export const usuarios: Usuario[] = [
  { id: 1, nombre: 'Juan', apellido: 'Administrador', email: 'admin@innolution.com', rol: 'administrador' },
  { id: 2, nombre: 'Carlos', apellido: 'Operador', email: 'carlos@innolution.com', rol: 'trabajador' },
];

export const piezas: Pieza[] = [
  {
    id: 1, usuario_id: 1, trace_id: 'TOB-2025-001', nombre: 'Cuerpo tobogán recto 3m',
    fecha_gelcoat: '2025-02-01', fecha_qc: '2025-02-03', peso_real: 45.2,
    materias_primas: [
      { id: 1, pieza_id: 1, materia_prima_id: 1, cantidad_teorica: 12.0, cantidad_real: 12.5, materia_prima: materiasPrimas[0] },
      { id: 2, pieza_id: 1, materia_prima_id: 2, cantidad_teorica: 8.0, cantidad_real: 8.2, materia_prima: materiasPrimas[1] },
      { id: 3, pieza_id: 1, materia_prima_id: 3, cantidad_teorica: 3.0, cantidad_real: 3.1, materia_prima: materiasPrimas[2] },
      { id: 4, pieza_id: 1, materia_prima_id: 5, cantidad_teorica: 0.5, cantidad_real: 0.5, materia_prima: materiasPrimas[4] },
    ]
  },
  {
    id: 2, usuario_id: 2, trace_id: 'TOB-2025-002', nombre: 'Curva tobogán 90°',
    fecha_gelcoat: '2025-02-05', fecha_qc: '2025-02-07', peso_real: 28.7,
    materias_primas: [
      { id: 5, pieza_id: 2, materia_prima_id: 1, cantidad_teorica: 8.0, cantidad_real: 8.3, materia_prima: materiasPrimas[0] },
      { id: 6, pieza_id: 2, materia_prima_id: 2, cantidad_teorica: 5.5, cantidad_real: 5.8, materia_prima: materiasPrimas[1] },
      { id: 7, pieza_id: 2, materia_prima_id: 4, cantidad_teorica: 2.0, cantidad_real: 2.1, materia_prima: materiasPrimas[3] },
    ]
  },
  {
    id: 3, usuario_id: 1, trace_id: 'TOB-2025-003', nombre: 'Plataforma de llegada',
    fecha_gelcoat: '2025-02-10', fecha_qc: null, peso_real: null,
    materias_primas: [
      { id: 8, pieza_id: 3, materia_prima_id: 1, cantidad_teorica: 15.0, cantidad_real: null, materia_prima: materiasPrimas[0] },
      { id: 9, pieza_id: 3, materia_prima_id: 2, cantidad_teorica: 10.0, cantidad_real: null, materia_prima: materiasPrimas[1] },
      { id: 10, pieza_id: 3, materia_prima_id: 6, cantidad_teorica: 5.0, cantidad_real: null, materia_prima: materiasPrimas[5] },
    ]
  },
  {
    id: 4, usuario_id: 2, trace_id: 'TOB-2025-004', nombre: 'Sección espiral tobogán',
    fecha_gelcoat: '2025-02-12', fecha_qc: '2025-02-14', peso_real: 52.1,
    materias_primas: [
      { id: 11, pieza_id: 4, materia_prima_id: 1, cantidad_teorica: 18.0, cantidad_real: 18.5, materia_prima: materiasPrimas[0] },
      { id: 12, pieza_id: 4, materia_prima_id: 2, cantidad_teorica: 12.0, cantidad_real: 12.3, materia_prima: materiasPrimas[1] },
      { id: 13, pieza_id: 4, materia_prima_id: 3, cantidad_teorica: 4.0, cantidad_real: 4.2, materia_prima: materiasPrimas[2] },
      { id: 14, pieza_id: 4, materia_prima_id: 7, cantidad_teorica: 6.0, cantidad_real: 6.0, materia_prima: materiasPrimas[6] },
    ]
  },
  {
    id: 5, usuario_id: 1, trace_id: 'TOB-2025-005', nombre: 'Tobogán tubo cerrado 2m',
    fecha_gelcoat: '2025-02-15', fecha_qc: '2025-02-17', peso_real: 38.9,
    materias_primas: [
      { id: 15, pieza_id: 5, materia_prima_id: 1, cantidad_teorica: 14.0, cantidad_real: 14.2, materia_prima: materiasPrimas[0] },
      { id: 16, pieza_id: 5, materia_prima_id: 2, cantidad_teorica: 9.0, cantidad_real: 9.1, materia_prima: materiasPrimas[1] },
      { id: 17, pieza_id: 5, materia_prima_id: 4, cantidad_teorica: 3.5, cantidad_real: 3.6, materia_prima: materiasPrimas[3] },
    ]
  },
];

export const movimientosInventario: MovimientoInventario[] = [
  { id: 1, materia_prima_id: 1, usuario_id: 1, proveedor_id: 1, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 100, fecha: '2025-01-20', motivo: 'Compra mensual', referencia: 'OC-2025-001', materia_prima: materiasPrimas[0], proveedor: proveedores[0] },
  { id: 2, materia_prima_id: 2, usuario_id: 1, proveedor_id: 2, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 50, fecha: '2025-01-22', motivo: 'Reposición', referencia: 'OC-2025-002', materia_prima: materiasPrimas[1], proveedor: proveedores[1] },
  { id: 3, materia_prima_id: 1, usuario_id: 2, proveedor_id: null, trabajador_produccion_id: 1, tipo: 'salida', cantidad: 12.5, fecha: '2025-02-01', motivo: 'Producción pieza TOB-2025-001', referencia: 'TOB-2025-001', materia_prima: materiasPrimas[0], trabajador: trabajadoresProduccion[0] },
  { id: 4, materia_prima_id: 2, usuario_id: 2, proveedor_id: null, trabajador_produccion_id: 1, tipo: 'salida', cantidad: 8.2, fecha: '2025-02-01', motivo: 'Producción pieza TOB-2025-001', referencia: 'TOB-2025-001', materia_prima: materiasPrimas[1], trabajador: trabajadoresProduccion[0] },
  { id: 5, materia_prima_id: 3, usuario_id: 1, proveedor_id: 3, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 30, fecha: '2025-02-02', motivo: 'Compra gelcoat', referencia: 'OC-2025-003', materia_prima: materiasPrimas[2], proveedor: proveedores[2] },
  { id: 6, materia_prima_id: 5, usuario_id: 1, proveedor_id: 1, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 20, fecha: '2025-02-03', motivo: 'Compra catalizador', referencia: 'OC-2025-004', materia_prima: materiasPrimas[4], proveedor: proveedores[0] },
  { id: 7, materia_prima_id: 1, usuario_id: 2, proveedor_id: null, trabajador_produccion_id: 2, tipo: 'salida', cantidad: 8.3, fecha: '2025-02-05', motivo: 'Producción pieza TOB-2025-002', referencia: 'TOB-2025-002', materia_prima: materiasPrimas[0], trabajador: trabajadoresProduccion[1] },
  { id: 8, materia_prima_id: 6, usuario_id: 1, proveedor_id: null, trabajador_produccion_id: null, tipo: 'ajuste', cantidad: -2.0, fecha: '2025-02-08', motivo: 'Ajuste por inventario físico', referencia: 'AJ-2025-001', materia_prima: materiasPrimas[5] },
  { id: 9, materia_prima_id: 4, usuario_id: 1, proveedor_id: 3, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 25, fecha: '2025-02-10', motivo: 'Compra gelcoat azul', referencia: 'OC-2025-005', materia_prima: materiasPrimas[3], proveedor: proveedores[2] },
  { id: 10, materia_prima_id: 1, usuario_id: 2, proveedor_id: null, trabajador_produccion_id: 3, tipo: 'salida', cantidad: 18.5, fecha: '2025-02-12', motivo: 'Producción pieza TOB-2025-004', referencia: 'TOB-2025-004', materia_prima: materiasPrimas[0], trabajador: trabajadoresProduccion[2] },
];

// Helper to calculate piece cost
export function calcularCostoPieza(pieza: Pieza): number {
  if (!pieza.materias_primas) return 0;
  return pieza.materias_primas.reduce((total, pmp) => {
    const cantidad = pmp.cantidad_real ?? pmp.cantidad_teorica;
    const costo = pmp.materia_prima?.costo ?? 0;
    return total + cantidad * costo;
  }, 0);
}

// Helper to get stock level (simplified)
export function getStockLevel(materiaId: number): number {
  const entradas = movimientosInventario
    .filter(m => m.materia_prima_id === materiaId && m.tipo === 'entrada')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const salidas = movimientosInventario
    .filter(m => m.materia_prima_id === materiaId && m.tipo === 'salida')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const ajustes = movimientosInventario
    .filter(m => m.materia_prima_id === materiaId && m.tipo === 'ajuste')
    .reduce((sum, m) => sum + m.cantidad, 0);
  return entradas - salidas + ajustes;
}
