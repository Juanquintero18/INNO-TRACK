/**
 * Diálogo con el respaldo completo de un registro eliminado.
 */
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DeletedAuditItem } from '@/lib/types';
import { AuditDetail } from './AuditDetail';
import { formatAuditDate } from './audit-list';
import { entityTypeLabels } from './snapshot-format';
import { useSnapshotResolver } from './useSnapshotResolver';

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

interface AuditDetailDialogProps {
  /** Registro a mostrar; `null` mantiene el diálogo cerrado. */
  item: DeletedAuditItem | null;
  onClose: () => void;
}

export function AuditDetailDialog({ item, onClose }: AuditDetailDialogProps) {
  const resolveValue = useSnapshotResolver();

  return (
    <Dialog open={item !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>Detalle completo del registro eliminado</DialogTitle>
              <DialogDescription>
                Este respaldo corresponde exactamente a la informacion que se guardo en auditoria antes de eliminar el registro.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryItem label="Módulo">
                <div className="mt-1">
                  <Badge variant="secondary">{entityTypeLabels[item.entityType]}</Badge>
                </div>
              </SummaryItem>
              <SummaryItem label="Registro">
                <div className="mt-1 text-sm font-medium text-foreground">{item.entityLabel}</div>
              </SummaryItem>
              <SummaryItem label="Eliminado por">
                <div className="mt-1 text-sm text-foreground">{item.deletedBy?.nombre || 'Usuario no disponible'}</div>
              </SummaryItem>
              <SummaryItem label="Fecha">
                <div className="mt-1 text-sm text-foreground">{formatAuditDate(item.deletedAt)}</div>
              </SummaryItem>
            </div>

            <ScrollArea className="h-[55vh] rounded-xl border border-border/70 bg-muted/10">
              <div className="p-4">
                <AuditDetail item={item} resolveValue={resolveValue} />
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
