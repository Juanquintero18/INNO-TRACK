/**
 * Campo de búsqueda con ícono de lupa.
 */
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Clases de tamaño o posición del contenedor, propias de cada pantalla. */
  className?: string;
  disabled?: boolean;
}

export function SearchInput({ value, onChange, placeholder, className, disabled }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-9"
        disabled={disabled}
      />
    </div>
  );
}
