/**
 * Diálogo con título y formulario, base de los formularios de alta y edición.
 */
import type { FormEvent, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FormDialogProps {
  open: boolean;
  /** Recibe `false` cuando el usuario cierra con la X, Escape o clic fuera. */
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  contentClassName?: string;
  formClassName?: string;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  children,
  contentClassName = 'max-w-lg',
  formClassName = 'space-y-4',
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className={formClassName}>
          {children}
        </form>
      </DialogContent>
    </Dialog>
  );
}
