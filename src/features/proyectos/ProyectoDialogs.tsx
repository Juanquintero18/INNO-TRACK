/**
 * Diálogos de alta y edición de proyectos y de órdenes.
 */
import { FormDialog } from '@/components/form/FormDialog';
import { FormActions, FormError, RequiredFieldsHint, SelectField, TextField } from '@/components/form/FormParts';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { orderStatusOptions, projectStatusOptions } from './proyectos-utils';
import type { OrdenFormController } from './useOrdenForm';
import type { ProyectoFormController } from './useProyectoForm';

export function ProyectoFormDialog({ form }: { form: ProyectoFormController }) {
  const { values } = form;

  return (
    <FormDialog
      open={form.isOpen}
      onOpenChange={form.handleOpenChange}
      title={form.isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
      onSubmit={form.handleSubmit}
      contentClassName="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto"
    >
      <RequiredFieldsHint />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="project_codigo"
          label="Codigo"
          placeholder="PRJ-001"
          value={values.codigo}
          onValueChange={value => form.setField('codigo', value)}
        />
        <TextField
          id="project_nombre"
          label="Nombre"
          required
          placeholder="Proyecto de turbinas"
          value={values.nombre}
          onValueChange={value => form.setField('nombre', value)}
        />
        <SelectField
          label="Estado"
          placeholder="Selecciona un estado"
          options={projectStatusOptions}
          value={values.estado}
          onValueChange={value => form.setField('estado', value)}
        />
        <TextField
          id="project_fecha_inicio"
          label="Fecha inicio"
          type="date"
          value={values.fecha_inicio}
          onValueChange={value => form.setField('fecha_inicio', value)}
        />
        <TextField
          id="project_fecha_fin"
          label="Fecha fin"
          type="date"
          min={values.fecha_inicio || undefined}
          wrapperClassName="space-y-2 sm:col-span-2"
          value={values.fecha_fin}
          onValueChange={value => form.setField('fecha_fin', value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project_descripcion">Descripcion</Label>
        <Textarea
          id="project_descripcion"
          rows={4}
          placeholder="Describe el alcance del proyecto..."
          value={values.descripcion}
          onChange={e => form.setField('descripcion', e.target.value)}
        />
      </div>

      <FormError message={form.error} />
      <FormActions onCancel={form.close} submitLabel={form.isEditing ? 'Actualizar' : 'Guardar'} />
    </FormDialog>
  );
}

export function OrdenFormDialog({ form }: { form: OrdenFormController }) {
  const { values } = form;

  return (
    <FormDialog
      open={form.isOpen}
      onOpenChange={form.handleOpenChange}
      title={form.isEditing ? 'Editar orden' : 'Nueva orden'}
      onSubmit={form.handleSubmit}
      contentClassName="max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto"
    >
      <RequiredFieldsHint />

      <SelectField
        label="Proyecto"
        required
        placeholder="Selecciona un proyecto"
        options={form.proyectosList.map(proyecto => ({
          value: String(proyecto.id),
          label: proyecto.codigo ? `${proyecto.codigo} - ${proyecto.nombre}` : proyecto.nombre,
        }))}
        value={values.proyecto_id}
        onValueChange={value => form.setField('proyecto_id', value)}
      />
      <TextField
        id="order_codigo"
        label="Codigo de orden"
        required
        placeholder="ORD-0001"
        value={values.codigo_orden}
        onValueChange={value => form.setField('codigo_orden', value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="order_fecha"
          label="Fecha de creacion"
          type="date"
          value={values.fecha_creacion}
          onValueChange={value => form.setField('fecha_creacion', value)}
        />
        <SelectField
          label="Estado"
          placeholder="Selecciona un estado"
          options={orderStatusOptions}
          value={values.estado}
          onValueChange={value => form.setField('estado', value)}
        />
      </div>

      <FormError message={form.error} />
      <FormActions onCancel={form.close} submitLabel={form.isEditing ? 'Actualizar' : 'Guardar'} />
    </FormDialog>
  );
}
