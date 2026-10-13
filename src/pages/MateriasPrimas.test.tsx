import { describe, expect, it } from 'vitest';
import {
  USUARIO_ALMACENISTA,
  USUARIO_TRABAJADOR,
  answerConfirmWith,
  chooseOption,
  dialogs,
  dom,
  exportedWorkbook,
  fireEvent,
  renderApp,
  screen,
  settle,
  tableRows,
  type,
  within,
} from '@/test/app-harness';

describe('Materias primas', () => {
  it('muestra el catálogo con stock y estabilidad al administrador', async () => {
    await renderApp('/materias-primas');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('muestra solo lectura al trabajador', async () => {
    await renderApp('/materias-primas', { userId: USUARIO_TRABAJADOR });

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('permite editar al almacenista', async () => {
    await renderApp('/materias-primas', { userId: USUARIO_ALMACENISTA });

    expect(screen.getByRole('button', { name: 'Nuevo registro' })).toBeInTheDocument();
    expect(screen.getAllByTitle('Editar')).toHaveLength(5);
  });

  it('filtra por texto y por rango de fechas', async () => {
    await renderApp('/materias-primas');

    type(screen.getByPlaceholderText('Buscar material...'), 'RESINA');
    expect(tableRows()).toMatchSnapshot('busqueda');

    type(screen.getByPlaceholderText('Buscar material...'), '');
    type(screen.getByLabelText('Fecha inicio'), '2026-01-20');
    expect(tableRows()).toMatchSnapshot('desde fecha');

    type(screen.getByLabelText('Fecha fin'), '2026-02-10');
    expect(tableRows()).toMatchSnapshot('entre fechas');

    type(screen.getByLabelText('Fecha inicio'), '');
    expect(tableRows()).toMatchSnapshot('hasta fecha');
  });

  it('ordena por cada columna y por las vistas rápidas', async () => {
    await renderApp('/materias-primas');

    for (const column of [/Unidad/, /Costo Unitario/, /Stock Actual/, /Estabilidad/, /Última Actualización/, /Material/]) {
      fireEvent.click(screen.getByRole('button', { name: column }));
      expect(tableRows()).toMatchSnapshot(`${column.source} ascendente`);

      fireEvent.click(screen.getByRole('button', { name: column }));
      expect(tableRows()).toMatchSnapshot(`${column.source} descendente`);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Priorizar críticos' }));
    expect(tableRows()).toMatchSnapshot('priorizar criticos');

    fireEvent.click(screen.getByRole('button', { name: 'Orden alfabético' }));
    expect(tableRows()).toMatchSnapshot('orden alfabetico');
  });

  it('valida y crea una materia prima', async () => {
    const api = await renderApp('/materias-primas');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo vacio');

    type(within(dialog).getByLabelText(/Nombre del material/), 'resina POLIÉSTER');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Completa todos los campos de la materia prima.')).toBeInTheDocument();

    await chooseOption(within(dialog).getByRole('combobox'), 'Litro (L)');
    type(within(dialog).getByLabelText(/Fecha de actualización/), '2026-03-14');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('El costo unitario debe ser mayor que cero.')).toBeInTheDocument();

    type(within(dialog).getByLabelText(/Costo unitario/), '18.4');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Ya existe una materia prima con ese nombre.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    type(within(dialog).getByLabelText(/Nombre del material/), ' Resina viniléster ');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tableRows()).toMatchSnapshot('catalogo tras crear');
  });

  it('edita una materia prima', async () => {
    const api = await renderApp('/materias-primas');

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con datos');

    type(within(dialog).getByLabelText(/Costo unitario/), '9.9');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('catalogo tras editar');
  });

  it('configura los umbrales de estabilidad', async () => {
    const api = await renderApp('/materias-primas');

    fireEvent.click(screen.getAllByRole('button', { name: /Semáforo/ })[0]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo de estabilidad');

    type(within(dialog).getByLabelText('Crítico hasta'), '60');
    fireEvent.click(within(dialog).getByRole('button', { name: /Guardar estabilidad/ }));
    expect(within(dialog).getByText('El límite de stock bajo debe ser mayor que el crítico.')).toBeInTheDocument();

    type(within(dialog).getByLabelText('Bajo hasta'), '70.5');
    expect(dom(dialog)).toMatchSnapshot('resumen de rangos');
    fireEvent.click(within(dialog).getByRole('button', { name: /Guardar estabilidad/ }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tableRows()).toMatchSnapshot('catalogo tras configurar');
  });

  it('elimina solo si el usuario confirma', async () => {
    const api = await renderApp('/materias-primas');

    answerConfirmWith(false);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.requests.slice(-2)).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('catalogo tras eliminar');
  });

  it('exporta a Excel lo que está en pantalla', async () => {
    await renderApp('/materias-primas');

    fireEvent.click(screen.getByRole('button', { name: 'Priorizar críticos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });

  it('conserva el estado del formulario al cancelar y lo limpia al cerrar con Escape', async () => {
    await renderApp('/materias-primas');

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cancelar una edicion');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cerrar con Escape');
  });
});