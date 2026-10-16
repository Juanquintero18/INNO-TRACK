/**
 * API falsa en memoria para las pruebas de pantallas.
 *
 * Reemplaza a `fetch`, responde con la misma forma que el backend real
 * (relaciones expandidas) y registra cada petición para poder verificar qué
 * envía el frontend.
 */
import * as fixtures from './fixtures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface LoggedRequest {
  method: string;
  path: string;
  body?: unknown;
}

interface PlannedFailure {
  method: string;
  pathPrefix: string;
  status: number;
  payload: unknown;
}

const NOW = '2026-03-15T10:00:00-05:00';
const DEFAULT_THRESHOLDS = { stock_critico_max: 20, stock_bajo_max: 50 };

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const byId = (rows: Row[], id: unknown) => rows.find(row => row.id === id) ?? null;
const nextId = (rows: Row[]) => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });

export function createFakeApi(currentUserId = 1, { cookiesAceptadas = true } = {}) {
  const db = {
    usuarios: clone(fixtures.usuarios) as Row[],
    unidades: clone(fixtures.unidades) as Row[],
    proveedores: clone(fixtures.proveedores) as Row[],
    trabajadores: clone(fixtures.trabajadores) as Row[],
    materias: clone(fixtures.materias) as Row[],
    movimientos: clone(fixtures.movimientos) as Row[],
    proyectos: clone(fixtures.proyectos) as Row[],
    ordenes: clone(fixtures.ordenes) as Row[],
    piezas: clone(fixtures.piezas) as Row[],
    auditLogs: clone(fixtures.auditLogs) as Row[],
  };

  const requests: LoggedRequest[] = [];
  let cookiesAceptadasEn: string | null = cookiesAceptadas ? '2026-01-01T13:00:00Z' : null;
  const estadoPoliticas = () => ({
    cookies: { version: '2026-10-15', aceptada: cookiesAceptadasEn !== null, aceptada_en: cookiesAceptadasEn },
  });
  const failures: PlannedFailure[] = [];
  let pending = 0;

  const currentUser = () => byId(db.usuarios, currentUserId);
  const actorName = (user: Row | null) => (user ? `${user.nombre} ${user.apellido ?? ''}`.trim() : '');

  // --- Expansión de relaciones, igual que los serializers del backend -------

  const hydrateMateria = (materia: Row | null): Row | null =>
    materia && {
      id: materia.id,
      unidad_medida: byId(db.unidades, materia.unidad_medida_id),
      unidad_medida_id: materia.unidad_medida_id ?? null,
      nombre: materia.nombre,
      costo: materia.costo ?? null,
      fecha_actualizacion: materia.fecha_actualizacion ?? null,
      stability_thresholds: materia.stability_thresholds ?? DEFAULT_THRESHOLDS,
      enabled_for_piezas: materia.enabled_for_piezas ?? true,
      piezas_usage_count: materia.piezas_usage_count ?? 0,
    };

  const hydrateMovimiento = (movimiento: Row): Row => ({
    id: movimiento.id,
    materia_prima: hydrateMateria(byId(db.materias, movimiento.materia_prima_id)),
    materia_prima_id: movimiento.materia_prima_id ?? null,
    proveedor: byId(db.proveedores, movimiento.proveedor_id),
    proveedor_id: movimiento.proveedor_id ?? null,
    usuario: byId(db.usuarios, movimiento.usuario_id),
    usuario_id: movimiento.usuario_id ?? null,
    trabajador: byId(db.trabajadores, movimiento.trabajador_produccion_id),
    trabajador_produccion_id: movimiento.trabajador_produccion_id ?? null,
    tipo: movimiento.tipo,
    cantidad: movimiento.cantidad,
    fecha: movimiento.fecha ?? null,
    motivo: movimiento.motivo ?? null,
    referencia: movimiento.referencia ?? null,
  });

  const hydrateOrden = (orden: Row | null): Row | null =>
    orden && {
      id: orden.id,
      proyecto: byId(db.proyectos, orden.proyecto_id),
      proyecto_id: orden.proyecto_id ?? null,
      codigo_orden: orden.codigo_orden ?? null,
      fecha_creacion: orden.fecha_creacion ?? null,
      estado: orden.estado ?? null,
    };

  const hydratePieza = (pieza: Row): Row => ({
    id: pieza.id,
    orden: hydrateOrden(byId(db.ordenes, pieza.orden_id)),
    orden_id: pieza.orden_id ?? null,
    usuario: byId(db.usuarios, pieza.usuario_id),
    usuario_id: pieza.usuario_id ?? null,
    trace_id: pieza.trace_id ?? null,
    nombre: pieza.nombre ?? null,
    fecha_gelcoat: pieza.fecha_gelcoat ?? null,
    fecha_qc: pieza.fecha_qc ?? null,
    peso_real: pieza.peso_real ?? null,
    materias_primas: (pieza.materias_primas ?? []).map((material: Row) => ({
      id: material.id,
      pieza_id: pieza.id,
      materia_prima: hydrateMateria(byId(db.materias, material.materia_prima_id)),
      materia_prima_id: material.materia_prima_id ?? null,
      cantidad_teorica: material.cantidad_teorica ?? null,
      cantidad_real: material.cantidad_real ?? null,
    })),
    historial: (pieza.historial ?? []).map((item: Row) => ({
      ...item,
      usuario: byId(db.usuarios, item.usuario_id),
    })),
  });

  const hydrateUsuario = ({ contrasena: _contrasena, ...usuario }: Row): Row => usuario;

  // --- Recursos CRUD ---------------------------------------------------------

  interface Resource {
    prefix: string;
    rows: Row[];
    hydrate: (row: Row) => Row | null;
    auditType?: string;
    auditLabel?: (row: Row) => string;
    beforeSave?: (row: Row) => void;
  }

  const assignMaterialIds = (pieza: Row) => {
    const taken = db.piezas.flatMap(item => item.materias_primas ?? []).filter((material: Row) => material.id != null);
    let next = nextId(taken);

    pieza.materias_primas = (pieza.materias_primas ?? []).map((material: Row) => ({
      id: material.id ?? next++,
      materia_prima_id: material.materia_prima_id ?? null,
      cantidad_teorica: material.cantidad_teorica ?? null,
      cantidad_real: material.cantidad_real ?? null,
    }));
    pieza.historial = pieza.historial ?? [];
  };

  const resources: Resource[] = [
    { prefix: '/api/inventory/unidades-medida/', rows: db.unidades, hydrate: row => row },
    {
      prefix: '/api/inventory/proveedores/',
      rows: db.proveedores,
      hydrate: row => row,
      auditType: 'proveedor',
      auditLabel: row => row.nombre,
    },
    {
      prefix: '/api/inventory/trabajadores/',
      rows: db.trabajadores,
      hydrate: row => row,
      auditType: 'trabajador',
      auditLabel: row => row.nombre,
    },
    {
      prefix: '/api/inventory/materias-primas/',
      rows: db.materias,
      hydrate: hydrateMateria,
      auditType: 'materia-prima',
      auditLabel: row => row.nombre,
    },
    {
      prefix: '/api/inventory/movimientos/',
      rows: db.movimientos,
      hydrate: hydrateMovimiento,
      auditType: 'movimiento-inventario',
      auditLabel: row => row.referencia || row.motivo || `Movimiento #${row.id}`,
      beforeSave: row => {
        row.usuario_id = currentUserId;
      },
    },
    {
      prefix: '/api/accounts/users/',
      rows: db.usuarios,
      hydrate: hydrateUsuario,
      auditType: 'usuario',
      auditLabel: row => `${row.nombre} ${row.apellido ?? ''}`.trim(),
    },
    { prefix: '/api/production/proyectos/', rows: db.proyectos, hydrate: row => row },
    { prefix: '/api/production/ordenes/', rows: db.ordenes, hydrate: hydrateOrden },
    {
      prefix: '/api/production/piezas/',
      rows: db.piezas,
      hydrate: hydratePieza,
      auditType: 'pieza',
      auditLabel: row => [row.trace_id, row.nombre].filter(Boolean).join(' - ') || `Pieza #${row.id}`,
      beforeSave: assignMaterialIds,
    },
  ];

  const auditRowsByType: Record<string, Row[]> = {
    proveedor: db.proveedores,
    trabajador: db.trabajadores,
    'materia-prima': db.materias,
    'movimiento-inventario': db.movimientos,
    usuario: db.usuarios,
    pieza: db.piezas,
  };

  // --- Enrutamiento ------------------------------------------------------------

  const route = (method: string, path: string, body: Row | undefined): Response => {
    if (method === 'GET' && path === '/api/me/') return json(200, hydrateUsuario(currentUser() ?? {}));

    if (method === 'POST' && path === '/api/auth/login/') {
      const user = db.usuarios.find(item => item.email === body?.email);
      if (!user || body?.password !== 'clave-correcta') {
        return json(400, { non_field_errors: ['Credenciales incorrectas.'] });
      }
      return json(200, { access: 'token-nuevo', user: hydrateUsuario(user) });
    }

    if (method === 'POST' && path === '/api/auth/password-reset/') {
      return json(200, { detail: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
    }

    if (method === 'POST' && path === '/api/auth/password-reset/confirm/') {
      return json(200, { detail: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' });
    }

    if (method === 'GET' && path === '/api/accounts/politicas/') return json(200, estadoPoliticas());

    if (method === 'POST' && path === '/api/accounts/politicas/cookies/aceptar/') {
      cookiesAceptadasEn = cookiesAceptadasEn ?? NOW;
      return json(200, estadoPoliticas());
    }

    if (method === 'GET' && path === '/api/audit/logs/') return json(200, db.auditLogs);

    const restoreMatch = /^\/api\/audit\/logs\/(\d+)\/restore\/$/.exec(path);
    if (method === 'POST' && restoreMatch) {
      const auditLog = byId(db.auditLogs, Number(restoreMatch[1]));
      if (!auditLog) return json(404, { detail: 'No encontrado.' });

      auditLog.restoredAt = NOW;
      auditLog.restoredBy = { id: currentUserId, nombre: actorName(currentUser()) };
      auditLog.isRestored = true;
      auditRowsByType[auditLog.entityType]?.push(clone(auditLog.data));

      return json(200, {
        detail: 'Registro restaurado correctamente.',
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
      });
    }

    if (method === 'GET' && path === '/api/inventory/movimientos/import/template/') {
      return new Response('plantilla', { status: 200 });
    }

    if (method === 'POST' && path === '/api/inventory/movimientos/import/preview/') {
      return json(200, clone(fixtures.importPreview));
    }

    if (method === 'POST' && path === '/api/inventory/movimientos/import/commit/') {
      const preview = { ...clone(fixtures.importPreview), can_import: true, invalid_rows: 0, valid_rows: 2 };
      return json(201, { created_count: 2, created_ids: [101, 102], preview });
    }

    if (method === 'PUT' && path === '/api/inventory/materias-primas/piezas-materiales/') {
      const enabledIds = new Set<number>(body?.enabled_materia_ids ?? []);
      db.materias.forEach(materia => {
        materia.enabled_for_piezas = enabledIds.has(materia.id);
      });
      return json(200, db.materias.map(hydrateMateria));
    }

    const thresholdsMatch = /^\/api\/inventory\/materias-primas\/(\d+)\/stability-thresholds\/$/.exec(path);
    if (method === 'PUT' && thresholdsMatch) {
      const materia = byId(db.materias, Number(thresholdsMatch[1]));
      if (!materia) return json(404, { detail: 'No encontrado.' });

      materia.stability_thresholds = {
        stock_critico_max: body?.stock_critico_max,
        stock_bajo_max: body?.stock_bajo_max,
      };
      return json(200, hydrateMateria(materia));
    }

    const resource = resources.find(item => path.startsWith(item.prefix));
    if (!resource) return json(404, { detail: `Ruta no simulada: ${method} ${path}` });

    const rest = path.slice(resource.prefix.length);

    if (rest === '') {
      if (method === 'GET') return json(200, resource.rows.map(resource.hydrate));

      if (method === 'POST') {
        const row: Row = { ...body, id: nextId(resource.rows) };
        resource.beforeSave?.(row);
        resource.rows.push(row);
        return json(201, resource.hydrate(row));
      }
    }

    const idMatch = /^(\d+)\/$/.exec(rest);
    const row = idMatch ? byId(resource.rows, Number(idMatch[1])) : null;
    if (!row) return json(404, { detail: 'No encontrado.' });

    if (method === 'GET') return json(200, resource.hydrate(row));

    if (method === 'PUT' || method === 'PATCH') {
      Object.assign(row, body);
      resource.beforeSave?.(row);
      return json(200, resource.hydrate(row));
    }

    if (method === 'DELETE') {
      resource.rows.splice(resource.rows.indexOf(row), 1);

      if (resource.auditType) {
        db.auditLogs.unshift({
          id: nextId(db.auditLogs),
          action: 'delete',
          entityType: resource.auditType,
          entityId: row.id,
          entityLabel: resource.auditLabel?.(row) ?? `Registro #${row.id}`,
          deletedAt: NOW,
          deletedBy: { id: currentUserId, nombre: actorName(currentUser()) },
          restoredAt: null,
          restoredBy: null,
          isRestored: false,
          data: clone(row),
        });
      }

      return new Response(null, { status: 204 });
    }

    return json(405, { detail: 'Método no permitido.' });
  };

  const readBody = (init?: RequestInit): Row | undefined => {
    if (typeof init?.body === 'string') return JSON.parse(init.body);

    if (init?.body instanceof FormData) {
      const file = init.body.get('file');
      return { formData: { file: file instanceof File ? file.name : null } };
    }

    return undefined;
  };

  const fetchMock = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = new URL(String(input)).pathname;
    const body = readBody(init);

    requests.push(body === undefined ? { method, path } : { method, path, body });
    pending += 1;

    try {
      // Cede el turno como lo haría una petición real, sin depender de temporizadores.
      await Promise.resolve();

      // Igual que el backend: sin token solo responden los endpoints públicos de acceso.
      const isPublic = path.startsWith('/api/auth/');
      const hasToken = /^Bearer \S+/.test(new Headers(init?.headers).get('Authorization') ?? '');
      if (!isPublic && !hasToken) {
        return json(403, { detail: 'Las credenciales de autenticación no se proveyeron.' });
      }

      const failureIndex = failures.findIndex(item => item.method === method && path.startsWith(item.pathPrefix));
      if (failureIndex >= 0) {
        const [failure] = failures.splice(failureIndex, 1);
        return json(failure.status, failure.payload);
      }

      return route(method, path, body);
    } finally {
      pending -= 1;
    }
  };

  return {
    db,
    fetch: fetchMock,
    requests,
    pending: () => pending,
    /** Peticiones que modifican datos (todo excepto GET), en el orden en que ocurrieron. */
    mutations: () => requests.filter(request => request.method !== 'GET'),
    /** Fija la respuesta de la siguiente petición que coincida con el método y el prefijo (útil para simular errores). */
    respondNext: (method: string, pathPrefix: string, status: number, payload: unknown) => {
      failures.push({ method, pathPrefix, status, payload });
    },
  };
}

export type FakeApi = ReturnType<typeof createFakeApi>;
