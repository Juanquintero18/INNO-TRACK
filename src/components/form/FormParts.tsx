/**
 * Piezas comunes de los formularios de los diálogos: aviso de campos
 * obligatorios, etiqueta, mensaje de error y botones de acción.
 */
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Leyenda que explica el asterisco de los campos obligatorios. */
export function RequiredFieldsHint() {
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-semibold text-primary">*</span> es obligatorio
    </p>
  );
}

interface FieldLabelProps {
  children: string;
  htmlFor?: string;
  required?: boolean;
}

export function FieldLabel({ children, htmlFor, required = false }: FieldLabelProps) {
  return (
    <Label htmlFor={htmlFor}>
      {required ? `${children} ` : children}
      {required && <span className="text-primary">*</span>}
    </Label>
  );
}

/** Mensaje de error de un formulario. No ocupa espacio cuando no hay error. */
export function FormError({ message }: { message: string }) {
  if (!message) return null;

  return <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{message}</p>;
}

interface TextFieldProps extends Omit<ComponentProps<typeof Input>, 'id' | 'value' | 'onChange'> {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  /** Clases del contenedor, cuando el campo ocupa más de una columna. */
  wrapperClassName?: string;
  /** Texto de ayuda debajo del campo. */
  children?: ReactNode;
}

/** Campo de texto, número o fecha con su etiqueta. */
export function TextField({
  id,
  label,
  value,
  onValueChange,
  required,
  wrapperClassName = 'space-y-2',
  children,
  ...inputProps
}: TextFieldProps) {
  return (
    <div className={wrapperClassName}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input id={id} value={value} onChange={e => onValueChange(e.target.value)} {...inputProps} />
      {children}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  required?: boolean;
  /** Texto de ayuda debajo de la lista. */
  children?: ReactNode;
}

/** Lista desplegable con su etiqueta. */
export function SelectField({ label, value, onValueChange, options, placeholder, required, children }: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </div>
  );
}

interface FormActionsProps {
  onCancel: () => void;
  submitLabel: string;
}

/** Botones de cancelar y guardar al pie de un formulario. */
export function FormActions({ onCancel, submitLabel }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" type="button" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
