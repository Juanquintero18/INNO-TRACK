/**
 * Bloques visuales para mostrar el respaldo de un registro eliminado.
 */
import type { ReactNode } from 'react';
import type { DeletedAuditItem } from '@/lib/types';
import {
  formatSnapshotField,
  isSnapshotObject,
  type ResolveSnapshotValue,
  type SnapshotRecord,
} from './snapshot-format';

const FIELD_LABEL_CLASS = 'mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{children}</div>;
}

export function DetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
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

interface DetailFieldGridProps {
  snapshot: SnapshotRecord;
  /** Campos a mostrar, en orden; los que el respaldo no tenga se omiten. */
  fields: string[];
  auditItem: DeletedAuditItem;
  resolveValue: ResolveSnapshotValue;
  /** Campos que ocupan las dos columnas de la grilla. */
  wideFields?: string[];
}

export function DetailFieldGrid({ snapshot, fields, auditItem, resolveValue, wideFields = [] }: DetailFieldGridProps) {
  const presentFields = fields.filter(field => Object.prototype.hasOwnProperty.call(snapshot, field));

  if (presentFields.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {presentFields.map(field => (
        <div key={field} className={wideFields.includes(field) ? 'md:col-span-2' : ''}>
          <div className={FIELD_LABEL_CLASS}>{formatSnapshotField(field)}</div>
          <SnapshotValue value={snapshot[field]} auditItem={auditItem} resolveValue={resolveValue} fieldName={field} />
        </div>
      ))}
    </div>
  );
}

interface SnapshotValueProps {
  value: unknown;
  auditItem: DeletedAuditItem;
  resolveValue: ResolveSnapshotValue;
  fieldName?: string;
  /** Nivel de anidación, para cambiar la disposición de listas y objetos internos. */
  depth?: number;
}

/** Muestra cualquier valor del respaldo: listas, objetos anidados o un dato simple. */
export function SnapshotValue({ value, auditItem, resolveValue, fieldName, depth = 0 }: SnapshotValueProps) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <EmptyNote>Sin elementos registrados.</EmptyNote>;
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={`${depth}-${index}`} className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className={FIELD_LABEL_CLASS}>Registro {index + 1}</div>
            <SnapshotValue value={item} auditItem={auditItem} resolveValue={resolveValue} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (isSnapshotObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <EmptyNote>Sin campos registrados.</EmptyNote>;
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
              <div className={FIELD_LABEL_CLASS}>{formatSnapshotField(field)}</div>
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
    <div
      className={`rounded-md bg-muted/40 px-3 py-2 text-sm break-words ${formattedValue.tone === 'muted' ? 'text-muted-foreground' : 'text-foreground'}`}
    >
      <div>{formattedValue.primary}</div>
      {formattedValue.secondary ? (
        <div className="mt-1 text-xs text-muted-foreground">{formattedValue.secondary}</div>
      ) : null}
    </div>
  );
}
