import { describe, expect, it } from 'vitest';
import {
  USUARIO_TRABAJADOR,
  answerConfirmWith,
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

describe('Trabajadores', () => {
  it('muestra el listado completo al administrador', async () => {
    await renderApp('/trabajadores');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('oculta las acciones de edición a quien no puede editar', async () => {
    await renderApp('/trabajadores', { userId: USUARIO_TRABAJADOR });

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('filtra por texto y ordena por columna', async () => {
    await renderApp('/trabajadores');

    type(screen.getByPlaceholderText('Buscar por nombre o código...'), 'trb-0');
    expect(tableRows()).toMatchSnapshot('busqueda por codigo');

    type(screen.getByPlaceholderText('Buscar por nombre o código...'), '');
    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }));
    expect(tableRows()).toMatchSnapshot('nombre ascendente');

    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }));
    expect(tableRows()).toMatchSnapshot('nombre descendente');

    fireEvent.click(screen.getByRole('button', { name: /Código/ }));
    expect(tableRows()).toMatchSnapshot('codigo ascendente');
  });

  it('valida y crea un trabajador', async () => {
    const api = await renderApp('/trabajadores');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo trabajador' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo vacio');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Completa el código y el nombre del trabajador.')).toBeInTheDocument();

    type(within(dialog).getByLabelText(/Código del trabajador/), 'trb-001');
    type(within(dialog).getByLabelText(/Nombre completo/), 'Duplicado');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Ese código de trabajador ya existe.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    type(within(dialog).getByLabelText(/Código del trabajador/), '  TRB-020 ');
    type(within(dialog).getByLabelText(/Nombre completo/), ' Nora Paz ');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tableRows()).toMatchSnapshot('listado tras crear');
  });

  it('edita un trabajador existente', async () => {
    const api = await renderApp('/trabajadores');

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con datos');

    type(within(dialog).getByLabelText(/Nombre completo/), 'Laura Ríos Vega');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('listado tras editar');
  });

  it('muestra el error del backend al guardar', async () => {
    const api = await renderApp('/trabajadores');
    api.respondNext('POST', '/api/inventory/trabajadores/', 400, { codigo_trabajador: ['Código inválido.'] });

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo trabajador' }));
    const dialog = screen.getByRole('dialog');
    type(within(dialog).getByLabelText(/Código del trabajador/), 'TRB-030');
    type(within(dialog).getByLabelText(/Nombre completo/), 'Iván Mora');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(within(dialog).getByText('Código inválido.')).toBeInTheDocument();
  });

  it('elimina solo si el usuario confirma', async () => {
    const api = await renderApp('/trabajadores');

    answerConfirmWith(false);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.requests.slice(-2)).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('listado tras eliminar');
  });

  it('exporta a Excel lo que está en pantalla', async () => {
    await renderApp('/trabajadores');

    type(screen.getByPlaceholderText('Buscar por nombre o código...'), 'a');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });

  it('conserva el estado del formulario al cancelar y lo limpia al cerrar con Escape', async () => {
    await renderApp('/trabajadores');

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo trabajador' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cancelar una edicion');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo trabajador' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cerrar con Escape');
  });
});