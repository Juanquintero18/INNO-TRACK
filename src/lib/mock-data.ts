// Mock data aligned with the PostgreSQL schema in innotrack.sql

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
  contrasena: string;
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

export const proyectos: Proyecto[] = [
  {
    id: 1,
    nombre: 'Twins Eagle Waterpark',
    codigo: 'PRY-001',
    descripcion: 'Proyecto de fabricación de piezas compuestas para Twins Eagle Waterpark.',
    fecha_inicio: '2025-01-10',
    fecha_fin: null,
    estado: 'en curso',
  },
  {
    id: 2,
    nombre: 'Maldives',
    codigo: 'PRY-002',
    descripcion: 'Producción de referencias especiales para el proyecto Maldives.',
    fecha_inicio: '2025-02-01',
    fecha_fin: null,
    estado: 'en curso',
  },
  {
    id: 3,
    nombre: 'Qiddiya',
    codigo: 'PRY-003',
    descripcion: 'Desarrollo y control de costos de piezas para Qiddiya.',
    fecha_inicio: '2025-03-01',
    fecha_fin: null,
    estado: 'planeado',
  },
  {
    id: 4,
    nombre: 'Kalahari',
    codigo: 'PRY-004',
    descripcion: 'Línea de producción de piezas para el proyecto Kalahari.',
    fecha_inicio: '2026-01-15',
    fecha_fin: null,
    estado: 'planeado',
  },
];

export const usuarios: Usuario[] = [
  {
    id: 1,
    nombre: 'Juan',
    apellido: 'Administrador',
    email: 'admin@innolution.com',
    contrasena: 'demo_admin_123',
    rol: 'administrador',
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'Operador',
    email: 'carlos@innolution.com',
    contrasena: 'demo_trabajador_123',
    rol: 'trabajador',
  },
];

export const unidadesMedida: UnidadMedida[] = [
  { id: 1, nombre: 'Kilogramo', abreviatura: 'kg' },
  { id: 2, nombre: 'Litro', abreviatura: 'L' },
  { id: 3, nombre: 'Metro', abreviatura: 'm' },
  { id: 4, nombre: 'Unidad', abreviatura: 'ud' },
  { id: 5, nombre: 'Galón', abreviatura: 'gal' },
];

export const proveedores: Proveedor[] = [
  {
    id: 1,
    nombre: 'Química Industrial S.A.',
    telefono: '+57 311 234 5678',
    email: 'ventas@quimicaindustrial.com',
    direccion: 'Cra 45 #23-10, Bogotá',
  },
  {
    id: 2,
    nombre: 'FibraMax Colombia',
    telefono: '+57 300 987 6543',
    email: 'contacto@fibramax.co',
    direccion: 'Cl 80 #12-45, Medellín',
  },
  {
    id: 3,
    nombre: 'Resinas del Caribe',
    telefono: '+57 315 456 7890',
    email: 'info@resinascaribe.com',
    direccion: 'Av. Pedro de Heredia, Cartagena',
  },
  {
    id: 4,
    nombre: 'Materiales Compuestos Ltda.',
    telefono: '+57 320 111 2233',
    email: 'ventas@matcomp.com',
    direccion: 'Zona Industrial, Cali',
  },
];

export const trabajadoresProduccion: TrabajadorProduccion[] = [
  { id: 1, codigo_trabajador: 'TRB-001', nombre: 'Carlos Martínez' },
  { id: 2, codigo_trabajador: 'TRB-002', nombre: 'Luis Hernández' },
  { id: 3, codigo_trabajador: 'TRB-003', nombre: 'Ana García' },
  { id: 4, codigo_trabajador: 'TRB-004', nombre: 'Pedro Ramírez' },
  { id: 5, codigo_trabajador: 'TRB-005', nombre: 'María López' },
];

export const materiasPrimas: MateriaPrima[] = [
  {
    id: 1,
    unidad_medida_id: 1,
    nombre: 'Resina 9870',
    costo: 3.0,
    fecha_actualizacion: '2025-02-15',
    unidad_medida: unidadesMedida[0],
  },
  {
    id: 2,
    unidad_medida_id: 1,
    nombre: 'Manto450/180/450',
    costo: 4.0,
    fecha_actualizacion: '2025-02-10',
    unidad_medida: unidadesMedida[0],
  },
  {
    id: 3,
    unidad_medida_id: 2,
    nombre: 'Gelcoat',
    costo: 9.9,
    fecha_actualizacion: '2025-01-28',
    unidad_medida: unidadesMedida[1],
  },
  {
    id: 4,
    unidad_medida_id: 2,
    nombre: 'Resina 3120',
    costo: 2.5,
    fecha_actualizacion: '2025-02-01',
    unidad_medida: unidadesMedida[1],
  },
  {
    id: 5,
    unidad_medida_id: 2,
    nombre: 'COMBOMAT',
    costo: 2.3,
    fecha_actualizacion: '2025-02-20',
    unidad_medida: unidadesMedida[1],
  },
  {
    id: 6,
    unidad_medida_id: 1,
    nombre: 'Pigmento',
    costo: 8.5,
    fecha_actualizacion: '2025-01-15',
    unidad_medida: unidadesMedida[0],
  },
  {
    id: 7,
    unidad_medida_id: 3,
    nombre: 'Manta de refuerzo',
    costo: 15.75,
    fecha_actualizacion: '2025-02-05',
    unidad_medida: unidadesMedida[2],
  },
  {
    id: 8,
    unidad_medida_id: 5,
    nombre: 'Acetona',
    costo: 18.0,
    fecha_actualizacion: '2025-02-18',
    unidad_medida: unidadesMedida[4],
  },
];

export const ordenes: Orden[] = [
  {
    id: 1,
    proyecto_id: 1,
    codigo_orden: '481263',
    fecha_creacion: '2025-02-01',
    estado: 'cerrada',
    proyecto: proyectos[0],
  },
  {
    id: 2,
    proyecto_id: 2,
    codigo_orden: '574910',
    fecha_creacion: '2025-02-05',
    estado: 'cerrada',
    proyecto: proyectos[1],
  },
  {
    id: 3,
    proyecto_id: 3,
    codigo_orden: '602184',
    fecha_creacion: '2025-02-10',
    estado: 'en proceso',
    proyecto: proyectos[2],
  },
  {
    id: 4,
    proyecto_id: 1,
    codigo_orden: '731955',
    fecha_creacion: '2025-02-12',
    estado: 'cerrada',
    proyecto: proyectos[0],
  },
  {
    id: 5,
    proyecto_id: 4,
    codigo_orden: '846207',
    fecha_creacion: '2026-02-15',
    estado: 'cerrada',
    proyecto: proyectos[3],
  },
];

export const piezas: Pieza[] = [
  {
    id: 1,
    orden_id: 1,
    usuario_id: 1,
    trace_id: '846381',
    nombre: 'SM15-SLK',
    fecha_gelcoat: '2025-02-01',
    fecha_qc: '2025-02-03',
    peso_real: 45.2,
    orden: ordenes[0],
    usuario: usuarios[0],
    historial: [
      {
        id: 1,
        accion: 'creacion',
        fecha: '2025-02-01T08:30:00',
        usuario_id: 1,
        usuario: usuarios[0],
        descripcion: 'Pieza creada en el sistema.',
      },
      {
        id: 2,
        accion: 'edicion',
        fecha: '2025-02-03T16:10:00',
        usuario_id: 2,
        usuario: usuarios[1],
        descripcion: 'Se registró la fecha de QC y el peso real.',
      },
    ],
    materias_primas: [
      {
        id: 1,
        pieza_id: 1,
        materia_prima_id: 1,
        cantidad_teorica: 12.0,
        cantidad_real: 12.5,
        materia_prima: materiasPrimas[0],
      },
      {
        id: 2,
        pieza_id: 1,
        materia_prima_id: 2,
        cantidad_teorica: 8.0,
        cantidad_real: 8.2,
        materia_prima: materiasPrimas[1],
      },
      {
        id: 3,
        pieza_id: 1,
        materia_prima_id: 3,
        cantidad_teorica: 3.0,
        cantidad_real: 3.1,
        materia_prima: materiasPrimas[2],
      },
      {
        id: 4,
        pieza_id: 1,
        materia_prima_id: 5,
        cantidad_teorica: 0.5,
        cantidad_real: 0.5,
        materia_prima: materiasPrimas[4],
      },
    ],
  },
  {
    id: 2,
    orden_id: 2,
    usuario_id: 2,
    trace_id: '846912',
    nombre: '328-SLK',
    fecha_gelcoat: '2025-02-05',
    fecha_qc: '2025-02-07',
    peso_real: 28.7,
    orden: ordenes[1],
    usuario: usuarios[1],
    historial: [
      {
        id: 3,
        accion: 'creacion',
        fecha: '2025-02-05T09:15:00',
        usuario_id: 2,
        usuario: usuarios[1],
        descripcion: 'Pieza creada en el sistema.',
      },
    ],
    materias_primas: [
      {
        id: 5,
        pieza_id: 2,
        materia_prima_id: 1,
        cantidad_teorica: 8.0,
        cantidad_real: 8.3,
        materia_prima: materiasPrimas[0],
      },
      {
        id: 6,
        pieza_id: 2,
        materia_prima_id: 2,
        cantidad_teorica: 5.5,
        cantidad_real: 5.8,
        materia_prima: materiasPrimas[1],
      },
      {
        id: 7,
        pieza_id: 2,
        materia_prima_id: 4,
        cantidad_teorica: 2.0,
        cantidad_real: 2.1,
        materia_prima: materiasPrimas[3],
      },
    ],
  },
  {
    id: 3,
    orden_id: 3,
    usuario_id: 1,
    trace_id: '847070',
    nombre: '326-SLK',
    fecha_gelcoat: '2025-02-10',
    fecha_qc: null,
    peso_real: null,
    orden: ordenes[2],
    usuario: usuarios[0],
    historial: [
      {
        id: 4,
        accion: 'creacion',
        fecha: '2025-02-10T07:50:00',
        usuario_id: 1,
        usuario: usuarios[0],
        descripcion: 'Pieza creada en el sistema.',
      },
    ],
    materias_primas: [
      {
        id: 8,
        pieza_id: 3,
        materia_prima_id: 1,
        cantidad_teorica: 15.0,
        cantidad_real: null,
        materia_prima: materiasPrimas[0],
      },
      {
        id: 9,
        pieza_id: 3,
        materia_prima_id: 2,
        cantidad_teorica: 10.0,
        cantidad_real: null,
        materia_prima: materiasPrimas[1],
      },
      {
        id: 10,
        pieza_id: 3,
        materia_prima_id: 6,
        cantidad_teorica: 5.0,
        cantidad_real: null,
        materia_prima: materiasPrimas[5],
      },
    ],
  },
  {
    id: 4,
    orden_id: 4,
    usuario_id: 2,
    trace_id: '846390',
    nombre: '3230-SLK',
    fecha_gelcoat: '2025-02-12',
    fecha_qc: '2025-02-14',
    peso_real: 52.1,
    orden: ordenes[3],
    usuario: usuarios[1],
    historial: [
      {
        id: 5,
        accion: 'creacion',
        fecha: '2025-02-12T10:20:00',
        usuario_id: 2,
        usuario: usuarios[1],
        descripcion: 'Pieza creada en el sistema.',
      },
      {
        id: 6,
        accion: 'edicion',
        fecha: '2025-02-14T14:40:00',
        usuario_id: 1,
        usuario: usuarios[0],
        descripcion: 'Se ajustaron consumos reales de materias primas.',
      },
    ],
    materias_primas: [
      {
        id: 11,
        pieza_id: 4,
        materia_prima_id: 1,
        cantidad_teorica: 18.0,
        cantidad_real: 18.5,
        materia_prima: materiasPrimas[0],
      },
      {
        id: 12,
        pieza_id: 4,
        materia_prima_id: 2,
        cantidad_teorica: 12.0,
        cantidad_real: 12.3,
        materia_prima: materiasPrimas[1],
      },
      {
        id: 13,
        pieza_id: 4,
        materia_prima_id: 3,
        cantidad_teorica: 4.0,
        cantidad_real: 4.2,
        materia_prima: materiasPrimas[2],
      },
      {
        id: 14,
        pieza_id: 4,
        materia_prima_id: 7,
        cantidad_teorica: 6.0,
        cantidad_real: 6.0,
        materia_prima: materiasPrimas[6],
      },
    ],
  },
  {
    id: 5,
    orden_id: 5,
    usuario_id: 1,
    trace_id: '841527',
    nombre: 'SM4518L-SLK',
    fecha_gelcoat: '2026-02-15',
    fecha_qc: '2026-02-17',
    peso_real: 39.9,
    orden: ordenes[4],
    usuario: usuarios[0],
    historial: [
      {
        id: 7,
        accion: 'creacion',
        fecha: '2026-02-15T11:05:00',
        usuario_id: 1,
        usuario: usuarios[0],
        descripcion: 'Pieza creada en el sistema.',
      },
    ],
    materias_primas: [
      {
        id: 15,
        pieza_id: 5,
        materia_prima_id: 1,
        cantidad_teorica: 14.0,
        cantidad_real: 14.2,
        materia_prima: materiasPrimas[0],
      },
      {
        id: 16,
        pieza_id: 5,
        materia_prima_id: 2,
        cantidad_teorica: 9.0,
        cantidad_real: 9.1,
        materia_prima: materiasPrimas[1],
      },
      {
        id: 17,
        pieza_id: 5,
        materia_prima_id: 4,
        cantidad_teorica: 3.5,
        cantidad_real: 3.6,
        materia_prima: materiasPrimas[3],
      },
    ],
  },
];

export const movimientosInventario: MovimientoInventario[] = [
  {
    id: 1,
    materia_prima_id: 1,
    proveedor_id: 1,
    usuario_id: 1,
    trabajador_produccion_id: null,
    tipo: 'entrada',
    cantidad: 100,
    fecha: '2025-01-20',
    motivo: 'Compra mensual',
    referencia: 'OC-2025-001',
    materia_prima: materiasPrimas[0],
    proveedor: proveedores[0],
    usuario: usuarios[0],
  },
  {
    id: 2,
    materia_prima_id: 2,
    proveedor_id: 2,
    usuario_id: 1,
    trabajador_produccion_id: null,
    tipo: 'entrada',
    cantidad: 50,
    fecha: '2025-01-22',
    motivo: 'Reposición',
    referencia: 'OC-2025-002',
    materia_prima: materiasPrimas[1],
    proveedor: proveedores[1],
    usuario: usuarios[0],
  },
  {
    id: 3,
    materia_prima_id: 1,
    proveedor_id: null,
    usuario_id: 2,
    trabajador_produccion_id: 1,
    tipo: 'salida',
    cantidad: 12.5,
    fecha: '2025-02-01',
    motivo: 'Producción pieza 481263',
    referencia: '481263',
    materia_prima: materiasPrimas[0],
    usuario: usuarios[1],
    trabajador: trabajadoresProduccion[0],
  },
  {
    id: 4,
    materia_prima_id: 2,
    proveedor_id: null,
    usuario_id: 2,
    trabajador_produccion_id: 1,
    tipo: 'salida',
    cantidad: 8.2,
    fecha: '2025-02-01',
    motivo: 'Producción pieza 481263',
    referencia: '481263',
    materia_prima: materiasPrimas[1],
    usuario: usuarios[1],
    trabajador: trabajadoresProduccion[0],
  },
  {
    id: 5,
    materia_prima_id: 3,
    proveedor_id: 3,
    usuario_id: 1,
    trabajador_produccion_id: null,
    tipo: 'entrada',
    cantidad: 30,
    fecha: '2025-02-02',
    motivo: 'Compra gelcoat',
    referencia: 'OC-2025-003',
    materia_prima: materiasPrimas[2],
    proveedor: proveedores[2],
    usuario: usuarios[0],
  },
  {
    id: 6,
    materia_prima_id: 5,
    proveedor_id: 1,
    usuario_id: 1,
    trabajador_produccion_id: null,
    tipo: 'entrada',
    cantidad: 20,
    fecha: '2025-02-03',
    motivo: 'Compra catalizador',
    referencia: 'OC-2025-004',
    materia_prima: materiasPrimas[4],
    proveedor: proveedores[0],
    usuario: usuarios[0],
  },
  {
    id: 7,
    materia_prima_id: 1,
    proveedor_id: null,
    usuario_id: 2,
    trabajador_produccion_id: 2,
    tipo: 'salida',
    cantidad: 8.3,
    fecha: '2025-02-05',
    motivo: 'Producción pieza 574910',
    referencia: '574910',
    materia_prima: materiasPrimas[0],
    usuario: usuarios[1],
    trabajador: trabajadoresProduccion[1],
  },
  {
    id: 8,
    materia_prima_id: 6,
    proveedor_id: null,
    usuario_id: 1,
    trabajador_produccion_id: null,
    tipo: 'ajuste',
    cantidad: -2.0,
    fecha: '2025-02-08',
    motivo: 'Ajuste por inventario físico',
    referencia: 'AJ-2025-001',
    materia_prima: materiasPrimas[5],
    usuario: usuarios[0],
  },
  {
    id: 9,
    materia_prima_id: 4,
    proveedor_id: 3,
    usuario_id: 1,
    trabajador_produccion_id: null,
    tipo: 'entrada',
    cantidad: 25,
    fecha: '2025-02-10',
    motivo: 'Compra gelcoat azul',
    referencia: 'OC-2025-005',
    materia_prima: materiasPrimas[3],
    proveedor: proveedores[2],
    usuario: usuarios[0],
  },
  {
    id: 10,
    materia_prima_id: 1,
    proveedor_id: null,
    usuario_id: 2,
    trabajador_produccion_id: 3,
    tipo: 'salida',
    cantidad: 18.5,
    fecha: '2025-02-12',
    motivo: 'Producción pieza 731955',
    referencia: '731955',
    materia_prima: materiasPrimas[0],
    usuario: usuarios[1],
    trabajador: trabajadoresProduccion[2],
  },
];

export function calcularCostoPieza(pieza: Pieza): number {
  if (!pieza.materias_primas) return 0;

  return pieza.materias_primas.reduce((total, pmp) => {
    const cantidad = pmp.cantidad_real ?? pmp.cantidad_teorica ?? 0;
    const costo = pmp.materia_prima?.costo ?? 0;
    return total + cantidad * costo;
  }, 0);
}

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