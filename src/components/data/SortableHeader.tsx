/**
 * Encabezado de columna que ordena la tabla al hacer clic.
 */
import { ArrowUpDown } from 'lucide-react';
import type { SortDirection } from '@/lib/sorting';

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
  /** Alinea el encabezado a la derecha, para columnas numéricas. */
  alignRight?: boolean;
  /** Muestra ASC o DESC junto a la columna activa. */
  showDirection?: boolean;
}

export function SortableHeader({
  label,
  active,
  direction,
  onSort,
  alignRight = false,
  showDirection = true,
}: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={onSort}
      className={`inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary ${alignRight ? 'justify-end w-full' : ''}`}
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
      {showDirection && active && <span className="text-xs text-primary">{direction === 'asc' ? 'ASC' : 'DESC'}</span>}
    </button>
  );
}
