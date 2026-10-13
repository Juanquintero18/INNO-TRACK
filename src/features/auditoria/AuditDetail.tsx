/**
 * Detalle de un registro eliminado, organizado según el tipo de entidad.
 */
import type { DeletedAuditItem, DeletedEntityType } from '@/lib/types';
import { DetailFieldGrid, DetailSection, EmptyNote, SnapshotValue } from './SnapshotViews';
import {
  getRemainingSnapshot,
  getSnapshotRecord,
  isSnapshotObject,
  type ResolveSnapshotValue,
  type SnapshotRecord,
} from './snapshot-format';

interface FieldSection {
  title: string;
  description: string;
  fields: string[];
  wideFields?: string[];
}

/** Secciones del resumen de las entidades cuyo detalle es una lista plana de campos. */
const ENTITY_SECTIONS: Record<Exclude<DeletedEntityType, 'pieza'>, FieldSection[]> = {
  'movimiento-inventario': [
    {
      title: 'Resumen del movimiento',
      description: 'Información principal del movimiento eliminado dentro de inventario.',
      fields: ['materia_prima_id', 'tipo', 'cantidad', 'fecha', 'referencia', 'motivo'],
      wideFields: ['motivo'],
    },
    {
      title: 'Participantes y contexto',
      description: 'Personas o entidades relacionadas con este movimiento.',
      fields: ['proveedor_id', 'trabajador_produccion_id', 'usuario_id'],
    },
  ],
  'materia-prima': [
    {
      title: 'Ficha de la materia prima',
      description: 'Datos principales del material que fue eliminado.',
      fields: ['nombre', 'unidad_medida_id', 'costo', 'fecha_actualizacion'],
    },
  ],
  proveedor: [
    {
      title: 'Información del proveedor',
      description: 'Datos de contacto del proveedor eliminado.',
      fields: ['nombre', 'telefono', 'email', 'direccion'],
      wideFields: ['direccion'],
    },
  ],
  trabajador: [
    {
      title: 'Información del trabajador',
      description: 'Datos principales del trabajador de producción eliminado.',
      fields: ['nombre', 'codigo_trabajador'],
    },
  ],
  usuario: [
    {
      title: 'Perfil del usuario',
      description: 'Información visible del usuario eliminado.',
      fields: ['nombre', 'apellido', 'email', 'rol'],
    },
  ],
};

const PIEZA_FIELDS = ['trace_id', 'nombre', 'orden_id', 'usuario_id', 'fecha_gelcoat', 'fecha_qc', 'peso_real'];

/** El identificador interno nunca se repite en "Datos adicionales". */
const HIDDEN_FIELDS = ['id'];

interface DetailProps {
  item: DeletedAuditItem;
  snapshot: SnapshotRecord;
  resolveValue: ResolveSnapshotValue;
}

/** Campos del respaldo que no entraron en el resumen principal. */
function AdditionalData({ item, snapshot, resolveValue, handledFields }: DetailProps & { handledFields: string[] }) {
  const remainingSnapshot = getRemainingSnapshot(snapshot, handledFields, HIDDEN_FIELDS);

  if (Object.keys(remainingSnapshot).length === 0) return null;

  return (
    <DetailSection
      title="Datos adicionales"
      description="Campos conservados en auditoría que no hacen parte del resumen principal."
    >
      <SnapshotValue value={remainingSnapshot} auditItem={item} resolveValue={resolveValue} />
    </DetailSection>
  );
}

/** Lista de sub-registros de una pieza (materiales o eventos), cada uno en su tarjeta. */
function NestedRecords({
  item,
  resolveValue,
  records,
  itemLabel,
  fields,
  wideFields,
  emptyMessage,
}: Pick<DetailProps, 'item' | 'resolveValue'> & {
  records: SnapshotRecord[];
  itemLabel: string;
  fields: string[];
  wideFields?: string[];
  emptyMessage: string;
}) {
  if (records.length === 0) {
    return <EmptyNote>{emptyMessage}</EmptyNote>;
  }

  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <div key={index} className="rounded-xl border border-border/70 bg-background p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {itemLabel} {index + 1}
          </div>
          <DetailFieldGrid
            snapshot={record}
            fields={fields}
            wideFields={wideFields}
            auditItem={item}
            resolveValue={resolveValue}
          />
        </div>
      ))}
    </div>
  );
}

function PiezaDetail({ item, snapshot, resolveValue }: DetailProps) {
  const materiales = Array.isArray(snapshot.materias_primas) ? snapshot.materias_primas.filter(isSnapshotObject) : [];
  const historial = Array.isArray(snapshot.historial) ? snapshot.historial.filter(isSnapshotObject) : [];

  return (
    <div className="space-y-6">
      <DetailSection
        title="Identificación de la pieza"
        description="Datos principales y trazabilidad base de la pieza eliminada."
      >
        <DetailFieldGrid snapshot={snapshot} fields={PIEZA_FIELDS} auditItem={item} resolveValue={resolveValue} />
      </DetailSection>

      <DetailSection
        title="Materias primas asociadas"
        description="Consumos registrados para esta pieza antes de eliminarse."
      >
        <NestedRecords
          item={item}
          resolveValue={resolveValue}
          records={materiales}
          itemLabel="Materia prima"
          fields={['materia_prima_id', 'cantidad_teorica', 'cantidad_real']}
          emptyMessage="No había materias primas asociadas registradas."
        />
      </DetailSection>

      <DetailSection
        title="Historial de la pieza"
        description="Eventos y observaciones guardados antes de la eliminación."
      >
        <NestedRecords
          item={item}
          resolveValue={resolveValue}
          records={historial}
          itemLabel="Evento"
          fields={['fecha', 'accion', 'usuario_id', 'descripcion']}
          wideFields={['descripcion']}
          emptyMessage="No había historial adicional registrado."
        />
      </DetailSection>

      <AdditionalData
        item={item}
        snapshot={snapshot}
        resolveValue={resolveValue}
        handledFields={[...PIEZA_FIELDS, 'materias_primas', 'historial']}
      />
    </div>
  );
}

/** La contraseña del usuario eliminado se conserva en el respaldo, pero nunca se muestra. */
function UsuarioSecurityNote() {
  return (
    <DetailSection title="Seguridad" description="Los datos sensibles no se exponen directamente en esta vista.">
      <EmptyNote>La contraseña se conserva en el respaldo de auditoría, pero no se muestra aquí.</EmptyNote>
    </DetailSection>
  );
}

function SectionsDetail({ item, snapshot, resolveValue, sections }: DetailProps & { sections: FieldSection[] }) {
  const isUsuario = item.entityType === 'usuario';
  const handledFields = [...sections.flatMap(section => section.fields), ...(isUsuario ? ['contrasena'] : [])];

  return (
    <div className="space-y-6">
      {sections.map(section => (
        <DetailSection key={section.title} title={section.title} description={section.description}>
          <DetailFieldGrid
            snapshot={snapshot}
            fields={section.fields}
            wideFields={section.wideFields}
            auditItem={item}
            resolveValue={resolveValue}
          />
        </DetailSection>
      ))}

      {isUsuario && <UsuarioSecurityNote />}

      <AdditionalData item={item} snapshot={snapshot} resolveValue={resolveValue} handledFields={handledFields} />
    </div>
  );
}

export function AuditDetail({ item, resolveValue }: { item: DeletedAuditItem; resolveValue: ResolveSnapshotValue }) {
  const snapshot = getSnapshotRecord(item.data);

  if (!snapshot) {
    return <SnapshotValue value={item.data} auditItem={item} resolveValue={resolveValue} />;
  }

  if (item.entityType === 'pieza') {
    return <PiezaDetail item={item} snapshot={snapshot} resolveValue={resolveValue} />;
  }

  const sections = ENTITY_SECTIONS[item.entityType];

  if (!sections) {
    return <SnapshotValue value={snapshot} auditItem={item} resolveValue={resolveValue} />;
  }

  return <SectionsDetail item={item} snapshot={snapshot} resolveValue={resolveValue} sections={sections} />;
}
