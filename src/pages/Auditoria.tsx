/**
 * Pantalla de auditoria de eliminaciones.
 *
 * Permite revisar que registros fueron borrados, quien realizo la accion y si
 * corresponde restaurarlos desde el log persistente del backend.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Eye, ShieldAlert, RotateCcw, Search } from 'lucide-react';
import { useAppData, type DeletedAuditItem, type DeletedEntityType } from '@/contexts/AppDataContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Etiquetas visibles para convertir los tipos tecnicos del backend en textos legibles.
const entityTypeLabels: Record<DeletedEntityType | 'todos', string> = {
  todos: 'Todos',
  pieza: 'Piezas',
  'materia-prima': 'Materias primas',
  'movimiento-inventario': 'Inventario',
  proveedor: 'Proveedores',
  trabajador: 'Trabajadores',
  usuario: 'Usuarios',
};

const snapshotFieldLabels: Partial<Record<string, string>> = {
  id: 'ID interno',
  orden_id: 'Orden',
  proyecto_id: 'Proyecto',
  usuario_id: 'Usuario',
  materia_prima_id: 'Materia prima',
  proveedor_id: 'Proveedor',
  trabajador_produccion_id: 'Trabajador',
  unidad_medida_id: 'Unidad de medida',
  pieza_id: 'Pieza',
  codigo_orden: 'Código de orden',
  codigo_trabajador: 'Código de trabajador',
  fecha_actualizacion: 'Fecha de actualización',
  fecha_creacion: 'Fecha de creación',
  fecha_inicio: 'Fecha de inicio',
  fecha_fin: 'Fecha de fin',
  fecha_gelcoat: 'Fecha de gelcoat',
  fecha_qc: 'Fecha de QC',
  trace_id: 'Trace ID',
  peso_real: 'Peso real',
  cantidad_teorica: 'Cantidad teórica',
  cantidad_real: 'Cantidad real',
};

type FormattedSnapshotValue = {
  primary: string;
  secondary?: string;
  tone?: 'default' | 'muted';
};

type ResolveSnapshotValue = (
  fieldName: string | undefined,
  value: unknown,
  auditItem: DeletedAuditItem,
) => FormattedSnapshotValue;

type SnapshotRecord = Record<string, unknown>;

const snapshotValueLabels: Partial<Record<string, Record<string, string>>> = {
  tipo: {
    entrada: 'Entrada',
    salida: 'Salida',
    ajuste: 'Ajuste',
  },
  accion: {
    creacion: 'Creación',
    edicion: 'Edición',
  },
};

const isSnapshotObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const formatSnapshotField = (field: string) => {
  const explicitLabel = snapshotFieldLabels[field];

  if (explicitLabel) return explicitLabel;

  const normalized = field
    .replace(/_/g, ' ')
    .replace(/\bid\b/gi, 'ID')
    .replace(/\sqc\b/gi, ' QC')
    .trim();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getNumericId = (value: unknown) => {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
};

const humanizeToken = (value: string) => value
  .replace(/_/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, char => char.toUpperCase());

const isDateLikeField = (fieldName: string) => fieldName.startsWith('fecha') || fieldName.endsWith('_at');

const formatDateValue = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return null;

  const hasTime = value.includes('T') || /\b\d{2}:\d{2}/.test(value);

  return new Intl.DateTimeFormat('es-CO', hasTime ? {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  } : {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate);
};

const getSnapshotRecord = (value: unknown): SnapshotRecord | null => (
  isSnapshotObject(value) ? value : null
);

const getRemainingSnapshot = (snapshot: SnapshotRecord, handledFields: string[], hiddenFields: string[] = []) => (
  Object.fromEntries(
    Object.entries(snapshot).filter(([field]) => !handledFields.includes(field) && !hiddenFields.includes(field))
  )
);

function DetailSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DetailFieldGrid({
  snapshot,
  fields,
  auditItem,
  resolveValue,
  wideFields = [],
}: {
  snapshot: SnapshotRecord;
  fields: string[];
  auditItem: DeletedAuditItem;
  resolveValue: ResolveSnapshotValue;
  wideFields?: string[];
}) {
  const presentFields = fields.filter(field => Object.prototype.hasOwnProperty.call(snapshot, field));

  if (presentFields.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {presentFields.map(field => (
        <div key={field} className={wideFields.includes(field) ? 'md:col-span-2' : ''}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {formatSnapshotField(field)}
          </div>
          <SnapshotValue
            value={snapshot[field]}
            auditItem={auditItem}
            resolveValue={resolveValue}
            fieldName={field}
          />
        </div>
      ))}
    </div>
  );
}

function SnapshotValue({
  value,
  auditItem,
  resolveValue,
  fieldName,
  depth = 0,
}: {
  value: unknown;
  auditItem: DeletedAuditItem;
  resolveValue: ResolveSnapshotValue;
  fieldName?: string;
  depth?: number;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Sin elementos registrados.</div>;
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={`${depth}-${index}`} className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Registro {index + 1}
            </div>
            <SnapshotValue value={item} auditItem={auditItem} resolveValue={resolveValue} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (isSnapshotObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Sin campos registrados.</div>;
    }

    return (
      <div className={depth === 0 ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
        {entries.map(([field, fieldValue]) => {
          const isComplex = Array.isArray(fieldValue) || isSnapshotObject(fieldValue);

          return (
            <div
              key={`${depth}-${field}`}
              className={`rounded-xl border border-border/70 bg-background p-3 ${depth === 0 && isComplex ? 'sm:col-span-2' : ''}`}
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatSnapshotField(field)}
              </div>
              <SnapshotValue
                value={fieldValue}
                auditItem={auditItem}
                resolveValue={resolveValue}
                fieldName={field}
                depth={depth + 1}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const formattedValue = resolveValue(fieldName, value, auditItem);

  return (
    <div className={`rounded-md bg-muted/40 px-3 py-2 text-sm break-words ${formattedValue.tone === 'muted' ? 'text-muted-foreground' : 'text-foreground'}`}>
      <div>{formattedValue.primary}</div>
      {formattedValue.secondary ? (
        <div className="mt-1 text-xs text-muted-foreground">{formattedValue.secondary}</div>
      ) : null}
    </div>
  );
}

/** Lista los borrados auditados y expone la accion de restauracion. */
export default function Auditoria() {
  const {
    deletedItems,
    restoreDeletedItem,
    unidadesList,
    proyectosList,
    ordenesList,
    piezasList,
    materiasList,
    proveedoresList,
    trabajadoresList,
    usuariosList,
  } = useAppData();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<DeletedEntityType | 'todos'>('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [detailItem, setDetailItem] = useState<DeletedAuditItem | null>(null);

  const activeReferenceMaps = useMemo(() => ({
    usuario_id: new Map(
      usuariosList.map(usuario => [
        usuario.id,
        `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() || usuario.email || `Usuario #${usuario.id}`,
      ])
    ),
    unidad_medida_id: new Map(
      unidadesList.map(unidad => [unidad.id, unidad.abreviatura ? `${unidad.nombre} (${unidad.abreviatura})` : unidad.nombre])
    ),
    proyecto_id: new Map(
      proyectosList.map(proyecto => [proyecto.id, [proyecto.codigo, proyecto.nombre].filter(Boolean).join(' - ') || `Proyecto #${proyecto.id}`])
    ),
    orden_id: new Map(
      ordenesList.map(orden => [orden.id, orden.codigo_orden || `Orden #${orden.id}`])
    ),
    pieza_id: new Map(
      piezasList.map(pieza => [pieza.id, [pieza.trace_id, pieza.nombre].filter(Boolean).join(' - ') || `Pieza #${pieza.id}`])
    ),
    materia_prima_id: new Map(
      materiasList.map(materia => [materia.id, materia.nombre])
    ),
    proveedor_id: new Map(
      proveedoresList.map(proveedor => [proveedor.id, proveedor.nombre])
    ),
    trabajador_produccion_id: new Map(
      trabajadoresList.map(trabajador => [
        trabajador.id,
        [trabajador.nombre, trabajador.codigo_trabajador].filter(Boolean).join(' - ') || `Trabajador #${trabajador.id}`,
      ])
    ),
  }), [materiasList, ordenesList, piezasList, proyectosList, proveedoresList, trabajadoresList, unidadesList, usuariosList]);

  const deletedReferenceMaps = useMemo(() => {
    const buildDeletedLabelMap = (entityType: DeletedEntityType) => new Map(
      deletedItems
        .filter(item => item.entityType === entityType)
        .map(item => [item.entityId, item.entityLabel])
    );

    return {
      usuario_id: buildDeletedLabelMap('usuario'),
      pieza_id: buildDeletedLabelMap('pieza'),
      materia_prima_id: buildDeletedLabelMap('materia-prima'),
      proveedor_id: buildDeletedLabelMap('proveedor'),
      trabajador_produccion_id: buildDeletedLabelMap('trabajador'),
    };
  }, [deletedItems]);

  /** Presenta la fecha de auditoria con dia y hora para facilitar trazabilidad. */
  const formatFechaHora = (fecha: string) => {
    return formatDateValue(fecha) ?? fecha;
  };

  const resolveSnapshotValue: ResolveSnapshotValue = (fieldName, value, auditItem) => {
    if (value === null || value === undefined || value === '') {
      return {
        primary: 'No registrado',
        tone: 'muted',
      };
    }

    if (typeof value === 'boolean') {
      return {
        primary: value ? 'Sí' : 'No',
      };
    }

    if (fieldName && typeof value === 'string') {
      const normalizedValue = value.toLowerCase();
      const mappedValue = snapshotValueLabels[fieldName]?.[normalizedValue];

      if (mappedValue) {
        return {
          primary: mappedValue,
        };
      }

      if ((fieldName === 'rol' || fieldName === 'estado') && /^[a-z0-9_\s-]+$/i.test(value)) {
        return {
          primary: humanizeToken(value),
        };
      }
    }

    if (fieldName && typeof value === 'string' && isDateLikeField(fieldName)) {
      const formattedDate = formatDateValue(value);

      if (formattedDate) {
        return {
          primary: formattedDate,
        };
      }
    }

    const numericId = fieldName ? getNumericId(value) : null;

    if (fieldName && numericId !== null) {
      if (fieldName === 'pieza_id' && auditItem.entityType === 'pieza' && numericId === auditItem.entityId) {
        return {
          primary: `${auditItem.entityLabel} (registro auditado)`,
          secondary: `Referencia interna: ID ${numericId}`,
        };
      }

      const activeLabel = activeReferenceMaps[fieldName as keyof typeof activeReferenceMaps]?.get(numericId);
      const deletedLabel = deletedReferenceMaps[fieldName as keyof typeof deletedReferenceMaps]?.get(numericId);
      const resolvedLabel = activeLabel || deletedLabel;

      if (resolvedLabel) {
        return {
          primary: resolvedLabel,
          secondary: `Referencia interna: ID ${numericId}`,
        };
      }

      if (fieldName.endsWith('_id')) {
        return {
          primary: `ID ${numericId}`,
          secondary: 'No fue posible resolver esta referencia con un nombre visible.',
        };
      }
    }

    return {
      primary: String(value),
    };
  };

  const renderAdditionalData = (item: DeletedAuditItem, snapshot: SnapshotRecord, handledFields: string[], hiddenFields: string[] = []) => {
    const remainingSnapshot = getRemainingSnapshot(snapshot, handledFields, hiddenFields);

    if (Object.keys(remainingSnapshot).length === 0) return null;

    return (
      <DetailSection
        title="Datos adicionales"
        description="Campos conservados en auditoría que no hacen parte del resumen principal."
      >
        <SnapshotValue value={remainingSnapshot} auditItem={item} resolveValue={resolveSnapshotValue} />
      </DetailSection>
    );
  };

  const renderAuditDetail = (item: DeletedAuditItem) => {
    const snapshot = getSnapshotRecord(item.data);

    if (!snapshot) {
      return <SnapshotValue value={item.data} auditItem={item} resolveValue={resolveSnapshotValue} />;
    }

    switch (item.entityType) {
      case 'movimiento-inventario': {
        const handledFields = ['materia_prima_id', 'tipo', 'cantidad', 'fecha', 'referencia', 'motivo', 'proveedor_id', 'trabajador_produccion_id', 'usuario_id'];

        return (
          <div className="space-y-6">
            <DetailSection
              title="Resumen del movimiento"
              description="Información principal del movimiento eliminado dentro de inventario."
            >
              <DetailFieldGrid
                snapshot={snapshot}
                fields={['materia_prima_id', 'tipo', 'cantidad', 'fecha', 'referencia', 'motivo']}
                wideFields={['motivo']}
                auditItem={item}
                resolveValue={resolveSnapshotValue}
              />
            </DetailSection>

            <DetailSection
              title="Participantes y contexto"
              description="Personas o entidades relacionadas con este movimiento."
            >
              <DetailFieldGrid
                snapshot={snapshot}
                fields={['proveedor_id', 'trabajador_produccion_id', 'usuario_id']}
                auditItem={item}
                resolveValue={resolveSnapshotValue}
              />
            </DetailSection>

            {renderAdditionalData(item, snapshot, handledFields, ['id'])}
          </div>
        );
      }

      case 'materia-prima': {
        const handledFields = ['nombre', 'unidad_medida_id', 'costo', 'fecha_actualizacion'];

        return (
          <div className="space-y-6">
            <DetailSection
              title="Ficha de la materia prima"
              description="Datos principales del material que fue eliminado."
            >
              <DetailFieldGrid
                snapshot={snapshot}
                fields={handledFields}
                auditItem={item}
                resolveValue={resolveSnapshotValue}
              />
            </DetailSection>

            {renderAdditionalData(item, snapshot, handledFields, ['id'])}
          </div>
        );
      }

      case 'proveedor': {
        const handledFields = ['nombre', 'telefono', 'email', 'direccion'];

        return (
          <div className="space-y-6">
            <DetailSection
              title="Información del proveedor"
              description="Datos de contacto del proveedor eliminado."
            >
              <DetailFieldGrid
                snapshot={snapshot}
                fields={handledFields}
                wideFields={['direccion']}
                auditItem={item}
                resolveValue={resolveSnapshotValue}
              />
            </DetailSection>

            {renderAdditionalData(item, snapshot, handledFields, ['id'])}
          </div>
        );
      }

      case 'trabajador': {
        const handledFields = ['nombre', 'codigo_trabajador'];

        return (
          <div className="space-y-6">
            <DetailSection
              title="Información del trabajador"
              description="Datos principales del trabajador de producción eliminado."
            >
              <DetailFieldGrid
                snapshot={snapshot}
                fields={handledFields}
                auditItem={item}
                resolveValue={resolveSnapshotValue}
              />
            </DetailSection>

            {renderAdditionalData(item, snapshot, handledFields, ['id'])}
          </div>
        );
      }

      case 'usuario': {
        const handledFields = ['nombre', 'apellido', 'email', 'rol'];

        return (
          <div className="space-y-6">
            <DetailSection
              title="Perfil del usuario"
              description="Información visible del usuario eliminado."
            >
              <DetailFieldGrid
                snapshot={snapshot}
                fields={handledFields}
                auditItem={item}
                resolveValue={resolveSnapshotValue}
              />
            </DetailSection>

            <DetailSection
              title="Seguridad"
              description="Los datos sensibles no se exponen directamente en esta vista."
            >
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                La contraseña se conserva en el respaldo de auditoría, pero no se muestra aquí.
              </div>
            </DetailSection>

            {renderAdditionalData(item, snapshot, [...handledFields, 'contrasena'], ['id'])}
          </div>
        );
      }

      case 'pieza': {
        const handledFields = ['trace_id', 'nombre', 'orden_id', 'usuario_id', 'fecha_gelcoat', 'fecha_qc', 'peso_real', 'materias_primas', 'historial'];
        const materiales = Array.isArray(snapshot.materias_primas) ? snapshot.materias_primas.filter(isSnapshotObject) : [];
        const historial = Array.isArray(snapshot.historial) ? snapshot.historial.filter(isSnapshotObject) : [];

        return (
          <div className="space-y-6">
            <DetailSection
              title="Identificación de la pieza"
              description="Datos principales y trazabilidad base de la pieza eliminada."
            >
              <DetailFieldGrid
                snapshot={snapshot}
                fields={['trace_id', 'nombre', 'orden_id', 'usuario_id', 'fecha_gelcoat', 'fecha_qc', 'peso_real']}
                auditItem={item}
                resolveValue={resolveSnapshotValue}
              />
            </DetailSection>

            <DetailSection
              title="Materias primas asociadas"
              description="Consumos registrados para esta pieza antes de eliminarse."
            >
              {materiales.length > 0 ? (
                <div className="space-y-3">
                  {materiales.map((material, index) => (
                    <div key={`material-${index}`} className="rounded-xl border border-border/70 bg-background p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Materia prima {index + 1}
                      </div>
                      <DetailFieldGrid
                        snapshot={material}
                        fields={['materia_prima_id', 'cantidad_teorica', 'cantidad_real']}
                        auditItem={item}
                        resolveValue={resolveSnapshotValue}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  No había materias primas asociadas registradas.
                </div>
              )}
            </DetailSection>

            <DetailSection
              title="Historial de la pieza"
              description="Eventos y observaciones guardados antes de la eliminación."
            >
              {historial.length > 0 ? (
                <div className="space-y-3">
                  {historial.map((evento, index) => (
                    <div key={`historial-${index}`} className="rounded-xl border border-border/70 bg-background p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Evento {index + 1}
                      </div>
                      <DetailFieldGrid
                        snapshot={evento}
                        fields={['fecha', 'accion', 'usuario_id', 'descripcion']}
                        wideFields={['descripcion']}
                        auditItem={item}
                        resolveValue={resolveSnapshotValue}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  No había historial adicional registrado.
                </div>
              )}
            </DetailSection>

            {renderAdditionalData(item, snapshot, handledFields, ['id'])}
          </div>
        );
      }

      default:
        return <SnapshotValue value={snapshot} auditItem={item} resolveValue={resolveSnapshotValue} />;
    }
  };

  // Combina busqueda textual, filtro por entidad y filtro por rango de fechas.
  const filtered = deletedItems.filter(item => {
    const term = search.toLowerCase();
    const matchSearch =
      item.entityLabel.toLowerCase().includes(term) ||
      entityTypeLabels[item.entityType].toLowerCase().includes(term) ||
      `${item.deletedBy?.nombre ?? ''}`.toLowerCase().includes(term);

    const matchEntity = entityFilter === 'todos' || item.entityType === entityFilter;
    const fecha = item.deletedAt.slice(0, 10);
    const matchFechas =
      (!fechaInicio || fecha >= fechaInicio) &&
      (!fechaFin || fecha <= fechaFin);

    return matchSearch && matchEntity && matchFechas;
  });

  /** Ejecuta la restauracion y bloquea temporalmente el boton del registro activo. */
  const handleRestore = async (auditId: number) => {
    setRestoringId(auditId);

    try {
      await restoreDeletedItem(auditId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo restaurar el registro.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShieldAlert className="h-6 w-6 text-primary" /> Auditoría de Eliminaciones
          </h1>
          <p className="mt-1 text-muted-foreground">
            Aquí aparecen todos los registros eliminados y solo desde aquí se pueden deshacer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[560px]">
          <div className="relative sm:col-span-3 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por registro, módulo o usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={entityFilter} onValueChange={value => setEntityFilter(value as DeletedEntityType | 'todos')}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de registro" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(entityTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} min={fechaInicio || undefined} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Registros eliminados: {deletedItems.length}</span>
            <span>Resultados filtrados: {filtered.length}</span>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Registro eliminado</TableHead>
                <TableHead>Eliminado por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length > 0 ? (
                filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="secondary">{entityTypeLabels[item.entityType]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.entityLabel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.deletedBy?.nombre || 'Usuario no disponible'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatFechaHora(item.deletedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setDetailItem(item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void handleRestore(item.id)} disabled={restoringId === item.id || item.isRestored}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {item.isRestored ? 'Restaurado' : restoringId === item.id ? 'Restaurando...' : 'Deshacer'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No hay registros eliminados que coincidan con el filtro actual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailItem !== null} onOpenChange={open => !open && setDetailItem(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>Detalle completo del registro eliminado</DialogTitle>
                <DialogDescription>
                  Este respaldo corresponde exactamente a la informacion que se guardo en auditoria antes de eliminar el registro.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulo</div>
                  <div className="mt-1">
                    <Badge variant="secondary">{entityTypeLabels[detailItem.entityType]}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registro</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{detailItem.entityLabel}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eliminado por</div>
                  <div className="mt-1 text-sm text-foreground">{detailItem.deletedBy?.nombre || 'Usuario no disponible'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</div>
                  <div className="mt-1 text-sm text-foreground">{formatFechaHora(detailItem.deletedAt)}</div>
                </div>
              </div>

              <ScrollArea className="h-[55vh] rounded-xl border border-border/70 bg-muted/10">
                <div className="p-4">
                  {renderAuditDetail(detailItem)}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}