/**
 * Botones de editar y eliminar de una fila o tarjeta.
 */
import { Pencil, Trash2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

type ActionButtonProps = Omit<ButtonProps, 'variant' | 'size' | 'children'>;

export function EditButton({ title = 'Editar', ...props }: ActionButtonProps) {
  return (
    <Button variant="outline" size="icon" title={title} {...props}>
      <Pencil className="w-4 h-4" />
    </Button>
  );
}

export function DeleteButton({ title = 'Eliminar', ...props }: ActionButtonProps) {
  return (
    <Button variant="destructive" size="icon" title={title} {...props}>
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <EditButton onClick={onEdit} />
      <DeleteButton onClick={onDelete} />
    </div>
  );
}
