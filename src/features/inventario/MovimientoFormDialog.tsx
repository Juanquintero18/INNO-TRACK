/**
 * Diálogo de alta y edición de un movimiento de inventario.
 */
import { FormDialog } from '@/components/form/FormDialog';
import {
  FormActions,
  FormError,
  RequiredFieldsHint,
  SelectField,
  TextField,
  type SelectOption,
} from '@/components/form/FormParts';
import type { MovimientoFormController } from './useMovimientoForm';

const TIPO_OPTIONS: SelectOption[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
];

/** Convierte un catálogo con nombre en opciones de lista desplegable. */
const toOptions = (items: Array<{ id: number; nombre: string | null }>): SelectOption[] =>
  items.map(item => ({ value: String(item.id), label: item.nombre ?? '' }));

export function MovimientoFormDialog({ form }: { form: MovimientoFormController }) {
  const { values } = form;

  return (
    <FormDialog
      open={form.isOpen}
      onOpenChange={form.handleOpenChange}
      title={form.isEditing ? 'Editar movimiento de inventario' : 'Nuevo movimiento de inventario'}
      onSubmit={form.handleSubmit}
    >
      <RequiredFieldsHint />
      <SelectField
        label="Materia prima"
        required
        placeholder="Selecciona un material"
        options={toOptions(form.materiasList)}
        value={values.materia_prima_id}
        onValueChange={value => form.setField('materia_prima_id', value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo"
          required
          placeholder="Selecciona un tipo"
          options={TIPO_OPTIONS}
          value={values.tipo}
          onValueChange={form.changeTipo}
        />
        <TextField
          id="cantidad"
          label="Cantidad"
          required
          type="number"
          step="0.01"
          placeholder={values.tipo === 'ajuste' ? 'Ej. -2.00 o 2.00' : '0.00'}
          value={values.cantidad}
          onValueChange={value => form.setField('cantidad', value)}
        />
      </div>

      <TextField
        id="fecha"
        label="Fecha"
        required
        type="date"
        value={values.fecha}
        onValueChange={value => form.setField('fecha', value)}
      />

      {values.tipo === 'entrada' && (
        <SelectField
          label="Proveedor"
          placeholder="Selecciona un proveedor"
          options={toOptions(form.proveedoresList)}
          value={values.proveedor_id}
          onValueChange={value => form.setField('proveedor_id', value)}
        />
      )}

      {values.tipo === 'salida' && (
        <SelectField
          label="Trabajador"
          placeholder="Selecciona un trabajador"
          options={toOptions(form.trabajadoresList)}
          value={values.trabajador_produccion_id}
          onValueChange={value => form.setField('trabajador_produccion_id', value)}
        />
      )}

      <TextField
        id="motivo"
        label="Motivo"
        placeholder="Ej. Reposición mensual"
        value={values.motivo}
        onValueChange={value => form.setField('motivo', value)}
      />
      <TextField
        id="referencia"
        label="Referencia"
        required
        placeholder="Ej. OC-2025-006"
        value={values.referencia}
        onValueChange={value => form.setField('referencia', value)}
      />

      <FormError message={form.error} />
      <FormActions onCancel={form.close} submitLabel={form.isEditing ? 'Actualizar' : 'Guardar'} />
    </FormDialog>
  );
}
