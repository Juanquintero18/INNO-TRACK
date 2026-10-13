/**
 * Diálogos para crear o editar una pieza: el formulario principal y el de
 * agregarle una materia prima.
 */
import { Plus } from 'lucide-react';
import { FormDialog } from '@/components/form/FormDialog';
import {
  FormActions,
  FormError,
  RequiredFieldsHint,
  SelectField,
  TextField,
} from '@/components/form/FormParts';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calcularSubtotalMaterial, getCantidadConsumida } from '@/lib/domain-utils';
import type { PiezaFormController } from './usePiezaForm';

function MaterialesSection({ form }: { form: PiezaFormController }) {
  const sinMateriasDisponibles = form.materiasDisponibles.length === 0;

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">Materias primas de la pieza</p>
          <p className="text-sm text-muted-foreground">
            Agrega los materiales y la cantidad para calcular el costo total.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={form.material.open} disabled={sinMateriasDisponibles}>
          <Plus className="mr-2 h-4 w-4" />
          Añadir materiales
        </Button>
      </div>

      {form.tieneMaterialesDeshabilitados && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Atención: esta pieza incluye materiales deshabilitados</p>
          <p className="mt-1">Puedes conservarlos, pero no podrás agregarlos nuevamente si los quitas.</p>
        </div>
      )}

      {sinMateriasDisponibles && (
        <p className="text-sm text-muted-foreground">
          No hay materias primas habilitadas disponibles para agregar en este momento.
        </p>
      )}

      {form.materiales.length > 0 ? (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.materiales.map(material => (
                <TableRow key={material.id}>
                  <TableCell>{material.materia_prima?.nombre}</TableCell>
                  <TableCell className="text-right">
                    {getCantidadConsumida(material)} {material.materia_prima?.unidad_medida?.abreviatura}
                  </TableCell>
                  <TableCell className="text-right">${(material.materia_prima?.costo ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${calcularSubtotalMaterial(material).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => form.removeMaterial(material.id)}>
                      Quitar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no has agregado materias primas a esta pieza.</p>
      )}

      <div className="text-right text-sm font-semibold text-primary">
        Costo total estimado: ${form.costoEstimado.toFixed(2)}
      </div>
    </div>
  );
}

export function PiezaFormDialog({ form }: { form: PiezaFormController }) {
  const { values } = form;

  return (
    <FormDialog
      open={form.isOpen}
      onOpenChange={form.handleOpenChange}
      title={form.isEditing ? 'Editar pieza' : 'Nueva pieza'}
      onSubmit={form.handleSubmit}
      contentClassName="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto"
      formClassName="space-y-4 pr-1"
    >
      <RequiredFieldsHint />
      <TextField
        id="trace_id"
        label="Trace ID"
        required
        placeholder="846999"
        value={values.trace_id}
        onValueChange={value => form.setField('trace_id', value)}
      />
      <TextField
        id="nombre"
        label="Nombre de la pieza"
        required
        placeholder="Ej. SM20-SLK"
        value={values.nombre}
        onValueChange={value => form.setField('nombre', value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Proyecto"
          required
          placeholder="Selecciona un proyecto"
          options={form.proyectosList.map(proyecto => ({ value: String(proyecto.id), label: proyecto.nombre }))}
          value={values.proyecto_id}
          onValueChange={form.changeProyecto}
        />
        <SelectField
          label="Orden"
          required
          placeholder="Selecciona una orden"
          options={form.ordenesDelProyecto.map(orden => ({ value: String(orden.id), label: orden.codigo_orden ?? '' }))}
          value={values.orden_id}
          onValueChange={value => form.setField('orden_id', value)}
        />
        <SelectField
          label="Usuario responsable"
          required
          placeholder="Selecciona un usuario"
          options={form.usuariosList.map(usuario => ({
            value: String(usuario.id),
            label: `${usuario.nombre} ${usuario.apellido ?? ''}`,
          }))}
          value={values.usuario_id}
          onValueChange={value => form.setField('usuario_id', value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="fecha_gelcoat"
          label="Fecha gelcoat"
          required
          type="date"
          value={values.fecha_gelcoat}
          onValueChange={value => form.setField('fecha_gelcoat', value)}
        />
        <TextField
          id="fecha_qc"
          label="Fecha QC"
          type="date"
          value={values.fecha_qc}
          onValueChange={value => form.setField('fecha_qc', value)}
        />
      </div>

      <TextField
        id="peso_real"
        label="Peso real"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={values.peso_real}
        onValueChange={value => form.setField('peso_real', value)}
      />

      <MaterialesSection form={form} />

      <FormError message={form.error} />
      <FormActions onCancel={form.close} submitLabel={form.isEditing ? 'Actualizar' : 'Guardar'} />
    </FormDialog>
  );
}

export function AddMaterialDialog({ form }: { form: PiezaFormController }) {
  const { material } = form;

  return (
    <FormDialog
      open={material.isOpen}
      onOpenChange={material.handleOpenChange}
      title="Añadir materiales"
      onSubmit={material.handleSubmit}
      contentClassName="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto"
    >
      <RequiredFieldsHint />
      <SelectField
        label="Materia prima"
        required
        placeholder="Selecciona un material"
        options={form.materiasDisponibles.map(materia => ({ value: String(materia.id), label: materia.nombre }))}
        value={material.values.materia_prima_id}
        onValueChange={value => material.setField('materia_prima_id', value)}
      >
        {form.materiasDisponibles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hay materias primas habilitadas disponibles para nuevas piezas.
          </p>
        )}
      </SelectField>
      <TextField
        id="cantidad_material"
        label="Cantidad"
        required
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={material.values.cantidad}
        onValueChange={value => material.setField('cantidad', value)}
      />

      <FormError message={material.error} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={material.close}>
          Cancelar
        </Button>
        <Button type="submit">Agregar material</Button>
      </div>
    </FormDialog>
  );
}
