/**
 * Datos de prueba con la forma "cruda" de la base (solo IDs en las relaciones).
 *
 * La API falsa de las pruebas los expande igual que lo hacen los serializers
 * del backend antes de entregarlos al frontend.
 */

export const usuarios = [
  { id: 1, nombre: 'Juan', apellido: 'Administrador', email: 'admin@innolution.test', rol: 'administrador' },
  { id: 2, nombre: 'Carla', apellido: 'Mejía', email: 'almacen@innolution.test', rol: 'almacenista' },
  { id: 3, nombre: 'Carlos', apellido: 'Operador', email: 'carlos@innolution.test', rol: 'trabajador' },
];

export const unidades = [
  { id: 1, nombre: 'Kilogramo', abreviatura: 'kg' },
  { id: 2, nombre: 'Litro', abreviatura: 'L' },
  { id: 3, nombre: 'Unidad', abreviatura: 'ud' },
];

export const proveedores = [
  {
    id: 1,
    nombre: 'Química Industrial S.A.',
    telefono: '+57 300 111 2233',
    email: 'ventas@quimica.test',
    direccion: 'Zona Industrial, Barranquilla',
  },
  { id: 2, nombre: 'FibraMax', telefono: '+57 301 444 5566', email: 'contacto@fibramax.test', direccion: 'Calle 80 # 12-40, Bogotá' },
  { id: 3, nombre: 'Resinas del Caribe', telefono: null, email: 'info@resinascaribe.test', direccion: null },
];

export const trabajadores = [
  { id: 1, codigo_trabajador: 'TRB-001', nombre: 'Pedro Gómez' },
  { id: 2, codigo_trabajador: 'TRB-002', nombre: 'Laura Ríos' },
  { id: 3, codigo_trabajador: 'TRB-010', nombre: 'Andrés Villa' },
];

export const materias = [
  {
    id: 1,
    unidad_medida_id: 1,
    nombre: 'Resina poliéster',
    costo: 12.5,
    fecha_actualizacion: '2026-02-10',
    stability_thresholds: { stock_critico_max: 20, stock_bajo_max: 50 },
    enabled_for_piezas: true,
    piezas_usage_count: 2,
  },
  {
    id: 2,
    unidad_medida_id: 1,
    nombre: 'Fibra de vidrio',
    costo: 8.75,
    fecha_actualizacion: '2026-01-20',
    stability_thresholds: { stock_critico_max: 30, stock_bajo_max: 80 },
    enabled_for_piezas: true,
    piezas_usage_count: 2,
  },
  {
    id: 3,
    unidad_medida_id: 2,
    nombre: 'Gelcoat blanco',
    costo: 22,
    fecha_actualizacion: '2026-03-01',
    stability_thresholds: { stock_critico_max: 10, stock_bajo_max: 25 },
    enabled_for_piezas: true,
    piezas_usage_count: 1,
  },
  {
    id: 4,
    unidad_medida_id: 2,
    nombre: 'Catalizador MEKP',
    costo: 15.2,
    fecha_actualizacion: null,
    stability_thresholds: { stock_critico_max: 5, stock_bajo_max: 15 },
    enabled_for_piezas: false,
    piezas_usage_count: 1,
  },
  {
    id: 5,
    unidad_medida_id: 3,
    nombre: 'Desmoldante',
    costo: null,
    fecha_actualizacion: '2025-12-05',
    stability_thresholds: { stock_critico_max: 20, stock_bajo_max: 50 },
    enabled_for_piezas: true,
    piezas_usage_count: 0,
  },
];

export const movimientos = [
  { id: 1, materia_prima_id: 1, proveedor_id: 1, usuario_id: 1, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 100, fecha: '2026-01-05', motivo: 'Compra mensual', referencia: 'OC-1001' },
  { id: 2, materia_prima_id: 1, proveedor_id: null, usuario_id: 2, trabajador_produccion_id: 1, tipo: 'salida', cantidad: 30, fecha: '2026-01-12', motivo: 'Consumo producción', referencia: 'PRD-0007' },
  { id: 3, materia_prima_id: 1, proveedor_id: null, usuario_id: 1, trabajador_produccion_id: null, tipo: 'ajuste', cantidad: -5, fecha: '2026-02-01', motivo: 'Ajuste por conteo', referencia: null },
  { id: 4, materia_prima_id: 2, proveedor_id: 2, usuario_id: 2, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 60, fecha: '2026-01-08', motivo: 'Reposición', referencia: 'OC-1002' },
  { id: 5, materia_prima_id: 2, proveedor_id: null, usuario_id: 2, trabajador_produccion_id: 2, tipo: 'salida', cantidad: 20, fecha: '2026-02-15', motivo: null, referencia: 'PRD-0011' },
  { id: 6, materia_prima_id: 3, proveedor_id: 3, usuario_id: 1, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 8, fecha: '2026-03-01', motivo: 'Compra urgente', referencia: 'OC-1040' },
  { id: 7, materia_prima_id: 5, proveedor_id: 1, usuario_id: 1, trabajador_produccion_id: null, tipo: 'entrada', cantidad: 200, fecha: '2026-02-20', motivo: null, referencia: 'OC-1033' },
  { id: 8, materia_prima_id: 3, proveedor_id: null, usuario_id: 3, trabajador_produccion_id: 3, tipo: 'salida', cantidad: 0.5, fecha: null, motivo: 'Prueba de color', referencia: null },
];

export const proyectos = [
  { id: 1, nombre: 'Aquaventura', codigo: 'AQ-01', descripcion: 'Toboganes para el parque Aquaventura.', fecha_inicio: '2026-01-10', fecha_fin: null, estado: 'activo' },
  { id: 2, nombre: 'Kalahari', codigo: 'KAL-02', descripcion: null, fecha_inicio: '2026-02-01', fecha_fin: null, estado: 'planeacion' },
  { id: 3, nombre: 'Laguna Azul', codigo: 'LAG-03', descripcion: 'Proyecto entregado.', fecha_inicio: '2025-09-01', fecha_fin: '2025-12-20', estado: 'finalizado' },
  { id: 4, nombre: 'Sin órdenes', codigo: null, descripcion: null, fecha_inicio: null, fecha_fin: null, estado: 'pausado' },
];

export const ordenes = [
  { id: 1, proyecto_id: 1, codigo_orden: 'ORD-001', fecha_creacion: '2026-01-15', estado: 'abierta' },
  { id: 2, proyecto_id: 1, codigo_orden: 'ORD-002', fecha_creacion: '2026-02-03', estado: 'en_proceso' },
  { id: 3, proyecto_id: 2, codigo_orden: 'ORD-010', fecha_creacion: '2026-02-10', estado: 'abierta' },
  { id: 4, proyecto_id: 3, codigo_orden: 'ORD-020', fecha_creacion: '2025-09-10', estado: 'cerrada' },
];

const snapshotPiezaUno = {
  trace_id: 'TR-0001',
  nombre: 'Tobogán curva A',
  orden_id: 1,
  usuario_id: 3,
  fecha_gelcoat: '2026-01-20',
  fecha_qc: null,
  peso_real: null,
  materias_primas: [
    { materia_prima_id: 1, materia_prima_nombre: 'Resina poliéster', cantidad_teorica: '20.00', cantidad_real: null },
  ],
};

export const piezas = [
  {
    id: 1,
    orden_id: 1,
    usuario_id: 3,
    trace_id: 'TR-0001',
    nombre: 'Tobogán curva A',
    fecha_gelcoat: '2026-01-20',
    fecha_qc: '2026-01-28',
    peso_real: 45.5,
    materias_primas: [
      { id: 1, materia_prima_id: 1, cantidad_teorica: 20, cantidad_real: 21.5 },
      { id: 2, materia_prima_id: 2, cantidad_teorica: 10, cantidad_real: null },
    ],
    historial: [
      {
        id: 1,
        accion: 'creacion',
        fecha: '2026-01-20T09:15:00-05:00',
        usuario_id: 3,
        descripcion: 'Pieza creada desde la API con 1 materia(s) prima(s) asociada(s).',
        detalle: {
          schema: 'pieza_historial_v1',
          accion: 'creacion',
          summary: 'Pieza creada desde la API con 1 materia(s) prima(s) asociada(s).',
          initial: snapshotPiezaUno,
        },
      },
      {
        id: 2,
        accion: 'edicion',
        fecha: '2026-01-28T16:40:00-05:00',
        usuario_id: 1,
        descripcion: 'Se actualizó la pieza desde la API: 2 campo(s) y 2 cambio(s) en materias primas.',
        detalle: {
          schema: 'pieza_historial_v1',
          accion: 'edicion',
          summary: 'Se actualizó la pieza desde la API: 2 campo(s) y 2 cambio(s) en materias primas.',
          field_changes: [
            { field: 'fecha_qc', label: 'Fecha QC', before: null, after: '2026-01-28' },
            { field: 'peso_real', label: 'Peso real', before: null, after: '45.50' },
            { field: 'usuario_id', label: 'Usuario responsable', before: 1, after: 3 },
            { field: 'orden_id', label: 'Orden', before: 2, after: 1 },
          ],
          material_changes: [
            {
              change_type: 'actualizado',
              materia_prima_id: 1,
              materia_prima_nombre: 'Resina poliéster',
              before: { cantidad_teorica: '20.00', cantidad_real: null },
              after: { cantidad_teorica: '20.00', cantidad_real: '21.50' },
            },
            {
              change_type: 'agregado',
              materia_prima_id: 2,
              materia_prima_nombre: 'Fibra de vidrio',
              before: null,
              after: { cantidad_teorica: '10.00', cantidad_real: null },
            },
            {
              change_type: 'eliminado',
              materia_prima_id: 3,
              materia_prima_nombre: 'Gelcoat blanco',
              before: { cantidad_teorica: '1.00', cantidad_real: '1.20' },
              after: null,
            },
          ],
          before: snapshotPiezaUno,
          after: {
            ...snapshotPiezaUno,
            fecha_qc: '2026-01-28',
            peso_real: '45.50',
            materias_primas: [
              { materia_prima_id: 1, materia_prima_nombre: 'Resina poliéster', cantidad_teorica: '20.00', cantidad_real: '21.50' },
              { materia_prima_id: 2, materia_prima_nombre: 'Fibra de vidrio', cantidad_teorica: '10.00', cantidad_real: null },
            ],
          },
        },
      },
    ],
  },
  {
    id: 2,
    orden_id: 2,
    usuario_id: 3,
    trace_id: 'TR-0002',
    nombre: 'Tobogán recto B',
    fecha_gelcoat: '2026-02-05',
    fecha_qc: null,
    peso_real: null,
    materias_primas: [
      { id: 3, materia_prima_id: 1, cantidad_teorica: 15, cantidad_real: 15 },
      { id: 4, materia_prima_id: 3, cantidad_teorica: 2, cantidad_real: 2.2 },
    ],
    historial: [
      {
        id: 3,
        accion: 'creacion',
        fecha: '2026-02-05T08:00:00-05:00',
        usuario_id: null,
        descripcion: 'Creación registrada en una versión anterior del historial. En ese momento aún no se almacenaba comparación campo a campo.',
        detalle: {
          schema: 'pieza_historial_v1',
          accion: 'creacion',
          summary: 'Creación registrada en una versión anterior del historial. En ese momento aún no se almacenaba comparación campo a campo.',
          legacy: true,
          field_changes: [],
          material_changes: [],
        },
      },
    ],
  },
  {
    id: 3,
    orden_id: 3,
    usuario_id: 1,
    trace_id: 'TR-0010',
    nombre: 'Plataforma de salida',
    fecha_gelcoat: null,
    fecha_qc: '2026-03-02',
    peso_real: 80,
    materias_primas: [
      { id: 5, materia_prima_id: 2, cantidad_teorica: 30, cantidad_real: 29 },
      // Material deshabilitado para nuevas piezas, conservado por ser histórico.
      { id: 6, materia_prima_id: 4, cantidad_teorica: 1, cantidad_real: 0.8 },
    ],
    historial: [],
  },
  {
    id: 4,
    orden_id: null,
    usuario_id: null,
    trace_id: null,
    nombre: null,
    fecha_gelcoat: null,
    fecha_qc: null,
    peso_real: null,
    materias_primas: [],
    historial: [],
  },
];

export const auditLogs = [
  {
    id: 6,
    action: 'delete',
    entityType: 'pieza',
    entityId: 40,
    entityLabel: 'TR-0040 - Codo de prueba',
    deletedAt: '2026-03-10T14:05:00-05:00',
    deletedBy: { id: 1, nombre: 'Juan Administrador' },
    restoredAt: null,
    restoredBy: null,
    isRestored: false,
    data: {
      id: 40,
      orden_id: 1,
      usuario_id: 3,
      trace_id: 'TR-0040',
      nombre: 'Codo de prueba',
      fecha_gelcoat: '2026-03-01',
      fecha_qc: null,
      peso_real: '12.30',
      materias_primas: [
        { id: 90, pieza_id: 40, materia_prima_id: 1, cantidad_teorica: '5.00', cantidad_real: '5.50' },
        { id: 91, pieza_id: 40, materia_prima_id: 77, cantidad_teorica: '1.00', cantidad_real: null },
      ],
      historial: [
        { id: 70, pieza_id: 40, usuario_id: 3, accion: 'creacion', descripcion: 'Pieza creada desde la API.', fecha: '2026-03-01T10:00:00' },
        {
          id: 71,
          pieza_id: 40,
          usuario_id: 1,
          accion: 'edicion',
          descripcion: JSON.stringify({
            schema: 'pieza_historial_v1',
            accion: 'edicion',
            summary: 'Se actualizó la pieza desde la API: 1 campo(s).',
            field_changes: [{ field: 'peso_real', label: 'Peso real', before: null, after: '12.30' }],
            material_changes: [],
          }),
          fecha: '2026-03-05T11:30:00',
        },
      ],
    },
  },
  {
    id: 5,
    action: 'delete',
    entityType: 'movimiento-inventario',
    entityId: 55,
    entityLabel: 'OC-0999',
    deletedAt: '2026-03-08T09:20:00-05:00',
    deletedBy: { id: 2, nombre: 'Carla Mejía' },
    restoredAt: null,
    restoredBy: null,
    isRestored: false,
    data: {
      id: 55,
      materia_prima_id: 2,
      proveedor_id: 2,
      usuario_id: 2,
      trabajador_produccion_id: null,
      tipo: 'entrada',
      cantidad: '40.00',
      fecha: '2026-03-07',
      motivo: 'Registro duplicado',
      referencia: 'OC-0999',
    },
  },
  {
    id: 4,
    action: 'delete',
    entityType: 'materia-prima',
    entityId: 30,
    entityLabel: 'Pigmento azul',
    deletedAt: '2026-02-25T17:45:00-05:00',
    deletedBy: { id: 1, nombre: 'Juan Administrador' },
    restoredAt: null,
    restoredBy: null,
    isRestored: false,
    data: { id: 30, unidad_medida_id: 1, nombre: 'Pigmento azul', costo: '30.00', fecha_actualizacion: '2026-02-01' },
  },
  {
    id: 3,
    action: 'delete',
    entityType: 'trabajador',
    entityId: 12,
    entityLabel: 'Marta Solano',
    deletedAt: '2026-02-20T08:10:00-05:00',
    deletedBy: { id: null, nombre: '' },
    restoredAt: null,
    restoredBy: null,
    isRestored: false,
    data: { id: 12, codigo_trabajador: 'TRB-012', nombre: 'Marta Solano' },
  },
  {
    id: 2,
    action: 'delete',
    entityType: 'usuario',
    entityId: 9,
    entityLabel: 'Sofía Pardo',
    deletedAt: '2026-02-12T12:00:00-05:00',
    deletedBy: { id: 1, nombre: 'Juan Administrador' },
    restoredAt: '2026-02-13T09:30:00-05:00',
    restoredBy: { id: 1, nombre: 'Juan Administrador' },
    isRestored: true,
    data: { id: 9, nombre: 'Sofía', apellido: 'Pardo', email: 'sofia@innolution.test', contrasena: 'pbkdf2_sha256$hash', rol: 'trabajador' },
  },
  {
    id: 1,
    action: 'delete',
    entityType: 'proveedor',
    entityId: 8,
    entityLabel: 'Proveedor antiguo',
    deletedAt: '2026-02-11T10:30:00-05:00',
    deletedBy: { id: 1, nombre: 'Juan Administrador' },
    restoredAt: null,
    restoredBy: null,
    isRestored: false,
    data: { id: 8, nombre: 'Proveedor antiguo', telefono: '6015550000', email: 'viejo@proveedor.test', direccion: 'Cra 1 # 2-3' },
  },
];

export const importPreview = {
  file_name: 'movimientos.xlsx',
  file_errors: [],
  header_observations: ['La columna "material" se interpretó como "materia_prima".'],
  total_rows: 2,
  valid_rows: 1,
  invalid_rows: 1,
  can_import: false,
  rows: [
    {
      row_number: 2,
      status: 'valid',
      errors: [],
      values: { materia_prima: 'Resina poliéster', tipo: 'entrada', cantidad: '25', fecha: '2026-03-12', proveedor: 'FibraMax', trabajador: '', motivo: 'Compra', referencia: 'OC-2001' },
      resolved: { materia_prima: 'Resina poliéster', proveedor: 'FibraMax', trabajador: null },
    },
    {
      row_number: 3,
      status: 'error',
      errors: ['La materia prima "Resina X" no existe.', 'La cantidad debe ser mayor que cero.'],
      values: { materia_prima: 'Resina X', tipo: 'salida', cantidad: '0', fecha: '2026-03-12', proveedor: '', trabajador: 'Pedro Gómez', motivo: '', referencia: '' },
      resolved: { materia_prima: null, proveedor: null, trabajador: 'Pedro Gómez' },
    },
  ],
};

/** Vistas previas de importación de otros recursos, por ruta del recurso en la API. */
export const importPreviews: Record<string, typeof importPreview | Record<string, unknown>> = {
  '/api/production/piezas/': {
    file_name: 'piezas.xlsx',
    file_errors: [],
    header_observations: ["Se interpretó 'Responsable' como 'usuario'."],
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
    can_import: false,
    rows: [
      {
        row_number: 2,
        status: 'valid',
        errors: [],
        values: { trace_id: 'TR-0100', nombre: 'Tobogán curva C', proyecto: 'AQ-01', orden: 'ORD-001', usuario: 'carlos@innolution.test', materiales: 'Resina poliester: 20; Fibra de vidrio: 10' },
        resolved: { proyecto: 'Aquaventura', orden: 'ORD-001', usuario: 'Carlos Operador', materiales: 'Resina poliéster: 20; Fibra de vidrio: 10' },
      },
      {
        row_number: 3,
        status: 'error',
        errors: ["Ya existe un registro con el trace ID 'TR-0001'.", "La materia prima 'Catalizador MEKP' está deshabilitada para nuevas piezas."],
        values: { trace_id: 'TR-0001', nombre: 'Repetida', proyecto: 'AQ-01', orden: 'ORD-001', usuario: 'Carlos', materiales: 'Catalizador MEKP: 1' },
        resolved: { proyecto: 'Aquaventura', orden: 'ORD-001', usuario: 'Carlos Operador', materiales: null },
      },
    ],
  },
  '/api/production/proyectos/': {
    file_name: 'proyectos.xlsx',
    file_errors: [],
    header_observations: ["Se interpretó 'Inicio' como 'fecha_inicio'."],
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
    can_import: false,
    rows: [
      {
        row_number: 2,
        status: 'valid',
        errors: [],
        values: { codigo: 'PRJ-010', nombre: 'Parque Norte', descripcion: '', fecha_inicio: '2026-06-01', fecha_fin: '', estado: '' },
        resolved: { estado: 'planeacion' },
      },
      {
        row_number: 3,
        status: 'error',
        errors: ["Ya existe un registro con el código 'AQ-01'.", 'La fecha fin no puede ser anterior a la fecha inicio.'],
        values: { codigo: 'AQ-01', nombre: 'Repetido', descripcion: '', fecha_inicio: '2026-06-10', fecha_fin: '2026-06-01', estado: 'activo' },
        resolved: { estado: 'activo' },
      },
    ],
  },
  '/api/production/ordenes/': {
    file_name: 'ordenes.xlsx',
    file_errors: [],
    header_observations: [],
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
    can_import: false,
    rows: [
      {
        row_number: 2,
        status: 'valid',
        errors: [],
        values: { proyecto: 'AQ-01', codigo_orden: 'ORD-010', fecha_creacion: '2026-03-01', estado: 'En proceso' },
        resolved: { proyecto: 'Aquaventura', estado: 'en_proceso' },
      },
      {
        row_number: 3,
        status: 'error',
        errors: ['El proyecto no existe. Usa el código o el nombre de un proyecto registrado.'],
        values: { proyecto: 'Atlantis', codigo_orden: 'ORD-020', fecha_creacion: '', estado: '' },
        resolved: { proyecto: null, estado: 'abierta' },
      },
    ],
  },
  '/api/accounts/users/': {
    file_name: 'usuarios.xlsx',
    file_errors: [],
    header_observations: ["Se interpretó 'Perfil' como 'rol'."],
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
    can_import: false,
    rows: [
      {
        row_number: 2,
        status: 'valid',
        errors: [],
        values: { nombre: 'Nora', apellido: 'Paz', email: 'nora@innolution.test', rol: 'Almacenista' },
        resolved: {},
      },
      {
        row_number: 3,
        status: 'error',
        errors: ["Ya existe un registro con el correo 'admin@innolution.test'.", "El rol 'gerente' no existe. Usa administrador, almacenista o trabajador."],
        values: { nombre: 'Otra', apellido: 'Persona', email: 'admin@innolution.test', rol: 'gerente' },
        resolved: {},
      },
    ],
  },
  '/api/inventory/materias-primas/': {
    file_name: 'materias_primas.xlsx',
    file_errors: [],
    header_observations: ["Se interpretó 'Unidad' como 'unidad_medida'."],
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
    can_import: false,
    rows: [
      {
        row_number: 2,
        status: 'valid',
        errors: [],
        values: { nombre: 'Gelcoat gris', unidad_medida: 'L', costo: '21.00', fecha_actualizacion: '2026-05-02' },
        resolved: { unidad_medida: 'Litro' },
      },
      {
        row_number: 3,
        status: 'error',
        errors: ["Ya existe un registro con el nombre 'Desmoldante'.", 'El costo unitario debe ser mayor que cero.'],
        values: { nombre: 'Desmoldante', unidad_medida: 'kg', costo: '0', fecha_actualizacion: '2026-05-02' },
        resolved: { unidad_medida: 'Kilogramo' },
      },
    ],
  },
  '/api/inventory/trabajadores/': {
    file_name: 'trabajadores.xlsx',
    file_errors: [],
    header_observations: [],
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
    can_import: false,
    rows: [
      { row_number: 2, status: 'valid', errors: [], values: { codigo_trabajador: 'TRB-020', nombre: 'Nora Paz' }, resolved: {} },
      {
        row_number: 3,
        status: 'error',
        errors: ["Ya existe un registro con el código 'TRB-001'."],
        values: { codigo_trabajador: 'TRB-001', nombre: 'Repetido' },
        resolved: {},
      },
    ],
  },
  '/api/inventory/proveedores/': {
    file_name: 'proveedores.xlsx',
    file_errors: [],
    header_observations: ["Se interpretó 'Razon social' como 'nombre'."],
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
    can_import: false,
    rows: [
      {
        row_number: 2,
        status: 'valid',
        errors: [],
        values: { nombre: 'Pinturas Norte', telefono: '6045551212', email: 'hola@pinturasnorte.test', direccion: 'Medellín' },
        resolved: {},
      },
      {
        row_number: 3,
        status: 'error',
        errors: ["Ya existe un registro con el correo 'ventas@quimica.test'."],
        values: { nombre: 'Duplicado', telefono: '3001112233', email: 'ventas@quimica.test', direccion: 'Cali' },
        resolved: {},
      },
    ],
  },
};
