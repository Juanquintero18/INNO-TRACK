import { describe, expect, it } from 'vitest';
import {
  USUARIO_ALMACENISTA,
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

const SEARCH = 'Buscar por nombre, apellido, email o rol...';

describe('Usuarios', () => {
  it('muestra el listado al administrador', async () => {
    await renderApp('/usuarios');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('redirige al dashboard a quien no es administrador', async () => {
    await renderApp('/usuarios', { userId: USUARIO_ALMACENISTA });

    expect(window.location.pathname).toBe('/dashboard');
  });

  it('filtra por texto y ordena por columna', async () => {
    await renderApp('/usuarios');

    type(screen.getByPlaceholderText(SEARCH), 'ALMACEN');
    expect(tableRows()).toMatchSnapshot('busqueda por rol o correo');

    type(screen.getByPlaceholderText(SEARCH), '');
    fireEvent.click(screen.getByRole('button', { name: /Email/ }));
    expect(tableRows()).toMatchSnapshot('email ascendente');

    fireEvent.click(screen.getByRole('button', { name: /Email/ }));
    expect(tableRows()).toMatchSnapshot('email descendente');

    fireEvent.click(screen.getByRole('button', { name: /Rol/ }));
    expect(tableRows()).toMatchSnapshot('rol ascendente');
  });

  it('valida y crea un usuario', async () => {
    const api = await renderApp('/usuarios');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo vacio');

    type(within(dialog).getByLabelText(/^Nombre/), 'Nora');
    type(within(dialog).getByLabelText(/^Apellido/), 'Paz');
    type(within(dialog).getByLabelText(/^Correo electrónico/), 'ADMIN@innolution.test');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Completa todos los campos del usuario.')).toBeInTheDocument();

    await chooseOption(within(dialog).getByRole('combobox'), 'Almacenista');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('La contraseña es obligatoria para crear el usuario.')).toBeInTheDocument();

    type(within(dialog).getByLabelText(/^Contraseña/), ' Clave-Segura-9 ');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Ese correo de usuario ya existe.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    type(within(dialog).getByLabelText(/^Correo electrónico/), 'nora@innolution.test');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tableRows()).toMatchSnapshot('listado tras crear');
  });

  it('edita un usuario sin cambiar su contraseña', async () => {
    const api = await renderApp('/usuarios');

    fireEvent.click(screen.getAllByTitle('Editar')[2]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con datos');

    type(within(dialog).getByLabelText(/^Apellido/), 'Operador Senior');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('listado tras editar');
  });

  it('muestra el error del backend al guardar', async () => {
    const api = await renderApp('/usuarios');
    api.respondNext('PUT', '/api/accounts/users/', 400, { email: ['Introduzca una dirección de correo válida.'] });

    fireEvent.click(screen.getAllByTitle('Editar')[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(within(dialog).getByText('Introduzca una dirección de correo válida.')).toBeInTheDocument();
  });

  it('elimina solo si el usuario confirma', async () => {
    const api = await renderApp('/usuarios');

    answerConfirmWith(false);
    fireEvent.click(screen.getAllByTitle('Eliminar')[1]);
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    fireEvent.click(screen.getAllByTitle('Eliminar')[1]);
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.requests.slice(-2)).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('listado tras eliminar');
  });

  it('exporta a Excel sin incluir contraseñas', async () => {
    await renderApp('/usuarios');

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    const workbook = await exportedWorkbook();
    expect(workbook).toMatchSnapshot();
    expect(JSON.stringify(workbook)).not.toMatch(/contrase/i);
  });

  it('conserva el estado del formulario al cancelar y lo limpia al cerrar con Escape', async () => {
    await renderApp('/usuarios');

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cancelar una edicion');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cerrar con Escape');
  });
});