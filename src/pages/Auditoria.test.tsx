import { describe, expect, it } from 'vitest';
import {
  USUARIO_TRABAJADOR,
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
} from '@/test/app-harness';

const SEARCH = 'Buscar por registro, módulo o usuario...';

const dateInputs = () => Array.from(document.querySelectorAll<HTMLInputElement>('main input[type="date"]'));

describe('Auditoría', () => {
  it('muestra el registro de eliminaciones al administrador', async () => {
    await renderApp('/auditoria');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('redirige al dashboard a quien no es administrador', async () => {
    await renderApp('/auditoria', { userId: USUARIO_TRABAJADOR });

    expect(window.location.pathname).toBe('/dashboard');
  });

  it('filtra por texto, por módulo y por fechas', async () => {
    await renderApp('/auditoria');

    type(screen.getByPlaceholderText(SEARCH), 'CARLA');
    expect(tableRows()).toMatchSnapshot('busqueda por usuario');

    type(screen.getByPlaceholderText(SEARCH), 'inventario');
    expect(tableRows()).toMatchSnapshot('busqueda por modulo');

    type(screen.getByPlaceholderText(SEARCH), 'no existe');
    expect(tableRows()).toMatchSnapshot('sin resultados');

    type(screen.getByPlaceholderText(SEARCH), '');
    await chooseOption(screen.getByRole('combobox'), 'Proveedores');
    expect(tableRows()).toMatchSnapshot('solo proveedores');

    await chooseOption(screen.getByRole('combobox'), 'Todos');
    type(dateInputs()[0], '2026-02-12');
    type(dateInputs()[1], '2026-02-25');
    expect(tableRows()).toMatchSnapshot('entre fechas');
    expect(screen.getByText('Resultados filtrados: 3')).toBeInTheDocument();
  });

  it.each([
    ['pieza', 0],
    ['movimiento de inventario', 1],
    ['materia prima', 2],
    ['trabajador', 3],
    ['usuario', 4],
    ['proveedor', 5],
  ])('muestra el detalle de un registro eliminado de tipo %s', async (_tipo, index) => {
    await renderApp('/auditoria');

    fireEvent.click(screen.getAllByRole('button', { name: /Ver detalle/ })[index]);

    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot();
  });

  it('restaura una pieza y recarga producción y auditoría', async () => {
    const api = await renderApp('/auditoria');
    const before = api.requests.length;

    fireEvent.click(screen.getAllByRole('button', { name: /Deshacer/ })[0]);
    await settle(api);

    expect(api.requests.slice(before).map(request => `${request.method} ${request.path}`)).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('registro tras restaurar');
  });

  it('restaura un proveedor y recarga inventario y auditoría', async () => {
    const api = await renderApp('/auditoria');
    const before = api.requests.length;

    const buttons = screen.getAllByRole('button', { name: /Deshacer|Restaurado/ });
    expect(buttons[4]).toBeDisabled();
    fireEvent.click(buttons[5]);
    await settle(api);

    expect(api.requests.slice(before).map(request => `${request.method} ${request.path}`)).toMatchSnapshot('peticiones');
  });

  it('muestra el error del backend al restaurar', async () => {
    const api = await renderApp('/auditoria');
    api.respondNext('POST', '/api/audit/logs/', 400, { detail: 'Este registro ya fue restaurado.' });

    fireEvent.click(screen.getAllByRole('button', { name: /Deshacer/ })[0]);
    await settle(api);

    expect(dialogs).toEqual(['alert: Este registro ya fue restaurado.']);
    expect(screen.getAllByRole('button', { name: /Deshacer/ })[0]).toBeEnabled();
  });

  it('exporta a Excel lo que está en pantalla', async () => {
    await renderApp('/auditoria');

    type(dateInputs()[0], '2026-02-12');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });
});
