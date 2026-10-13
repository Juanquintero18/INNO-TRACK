/**
 * Diálogos del módulo de materias primas: alta/edición y umbrales de estabilidad.
 */
import { Gauge } from 'lucide-react';
import { FormDialog } from '@/components/form/FormDialog';
import { FormActions, FormError, RequiredFieldsHint, SelectField, TextField } from '@/components/form/FormParts';
import { Button } from '@/components/ui/button';
import { formatThresholdValue } from '@/lib/domain-utils';
import type { MateriaPrimaFormController } from './useMateriaPrimaForm';
import type { StabilityFormController } from './useStabilityForm';

export function MateriaPrimaFormDialog({ form }: { form: MateriaPrimaFormController }) {
  return (
    <FormDialog
      open={form.isOpen}
      onOpenChange={form.handleOpenChange}
      title={form.isEditing ? 'Editar materia prima' : 'Nueva materia prima'}
      onSubmit={form.handleSubmit}
    >
      <RequiredFieldsHint />
      <TextField
        id="nombre"
        label="Nombre del material"
        required
        placeholder="Ej. Resina viniléster"
        value={form.values.nombre}
        onValueChange={value => form.setField('nombre', value)}
      />
      <SelectField
        label="Unidad de medida"
        required
        placeholder="Selecciona una unidad"
        options={form.unidadesList.map(unidad => ({
          value: String(unidad.id),
          label: `${unidad.nombre} (${unidad.abreviatura})`,
        }))}
        value={form.values.unidad_medida_id}
        onValueChange={value => form.setField('unidad_medida_id', value)}
      />
      <TextField
        id="costo"
        label="Costo unitario"
        required
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={form.values.costo}
        onValueChange={value => form.setField('costo', value)}
      />
      <TextField
        id="fecha_actualizacion"
        label="Fecha de actualización"
        required
        type="date"
        value={form.values.fecha_actualizacion}
        onValueChange={value => form.setField('fecha_actualizacion', value)}
      />

      <FormError message={form.error} />
      <FormActions onCancel={form.close} submitLabel={form.isEditing ? 'Actualizar' : 'Guardar'} />
    </FormDialog>
  );
}

export function StabilityConfigDialog({ form }: { form: StabilityFormController }) {
  // El resumen se recalcula mientras el usuario escribe, antes de guardar.
  const critico = formatThresholdValue(Number(form.values.stock_critico_max || 0));
  const bajo = formatThresholdValue(Number(form.values.stock_bajo_max || 0));

  return (
    <FormDialog
      open={form.isOpen}
      onOpenChange={form.handleOpenChange}
      title={`Configurar estabilidad de ${form.materia?.nombre}`}
      onSubmit={form.handleSubmit}
    >
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        Define los límites para clasificar el stock de esta materia prima. El rango estable se calcula automáticamente por encima del límite de stock bajo.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="stock_critico_max"
          label="Crítico hasta"
          type="number"
          min="0"
          step="0.01"
          value={form.values.stock_critico_max}
          onValueChange={value => form.setField('stock_critico_max', value)}
        />
        <TextField
          id="stock_bajo_max"
          label="Bajo hasta"
          type="number"
          min="0"
          step="0.01"
          value={form.values.stock_bajo_max}
          onValueChange={value => form.setField('stock_bajo_max', value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-medium text-destructive">Crítico</p>
          <p className="text-muted-foreground">Hasta {critico}</p>
        </div>
        <div>
          <p className="font-medium text-warning">Bajo</p>
          <p className="text-muted-foreground">
            Mayor que {critico} y hasta {bajo}
          </p>
        </div>
        <div>
          <p className="font-medium text-success">Estable</p>
          <p className="text-muted-foreground">Mayor que {bajo}</p>
        </div>
      </div>

      <FormError message={form.error} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={form.close}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.isSaving}>
          <Gauge className="mr-2 h-4 w-4" />
          {form.isSaving ? 'Guardando...' : 'Guardar estabilidad'}
        </Button>
      </div>
    </FormDialog>
  );
}
