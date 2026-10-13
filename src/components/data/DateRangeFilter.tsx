/**
 * Filtro de rango de fechas (inicio y fin) del encabezado de un listado.
 */
import { Input } from '@/components/ui/input';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function DateRangeFilter({ from, to, onFromChange, onToChange }: DateRangeFilterProps) {
  return (
    <div className="flex flex-col gap-2 lg:min-w-[220px] lg:self-center">
      <div className="space-y-1">
        <label htmlFor="fecha-inicio" className="text-sm font-medium text-foreground">
          Fecha inicio
        </label>
        <Input
          id="fecha-inicio"
          type="date"
          value={from}
          onChange={e => onFromChange(e.target.value)}
          className="bg-background"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="fecha-fin" className="text-sm font-medium text-foreground">
          Fecha fin
        </label>
        <Input
          id="fecha-fin"
          type="date"
          value={to}
          onChange={e => onToChange(e.target.value)}
          min={from || undefined}
          className="bg-background"
        />
      </div>
    </div>
  );
}
