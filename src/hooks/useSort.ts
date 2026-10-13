/**
 * Estado de ordenamiento de una tabla: columna activa y sentido.
 */
import { useState } from 'react';
import type { SortDirection } from '@/lib/sorting';

export function useSort<Field extends string>(initialField: Field, initialDirection: SortDirection = 'asc') {
  const [sortField, setSortField] = useState<Field>(initialField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  /** Invierte el sentido si la columna ya está activa; si no, la activa en ascendente. */
  const toggleSort = (field: Field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const toggleDirection = () => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));

  const setSort = (field: Field, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  return { sortField, sortDirection, toggleSort, toggleDirection, setSort };
}
