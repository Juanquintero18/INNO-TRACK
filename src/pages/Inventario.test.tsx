import { describe, expect, it, vi } from 'vitest';
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

const SEARCH = 'Buscar por material, referencia...';

describe('Inventario', () => {
  it('muestra los movimientos al administrador', async () => {
    await renderApp('/inventario');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('muestra solo lectura al trabajador', async () => {
    await renderApp('/inventario', { userId: USUARIO_TRABAJADOR });

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('filtra por texto, tipo y rango de fechas', async () => {
    await renderApp('/inventario');

    type(screen.getByPlaceholderText(SEARCH), 'oc-10');
    expect(tableRows()).toMatchSnapshot('busqueda por referencia');

    type(screen.getByPlaceholderText(SEARCH), 'CONTEO');
    expect(tableRows()).toMatchSnapshot('busqueda por motivo');

    type(screen.getByPlaceholderText(SEARCH), '');
    await chooseOption(screen.getByRole('combobox'), 'Salida');
    expect(tableRows()).toMatchSnapshot('solo salidas');

    await chooseOption(screen.getByRole('combobox'), 'Todos');
    type(screen.getByLabelText('Fecha inicio'), '2026-02-01');
    type(screen.getByLabelText('Fecha fin'), '2026-02-20');
    expect(tableRows()).toMatchSnapshot('entre fechas');
  });

  it('ordena por cada columna', async () => {
    await renderApp('/inventario');

    for (const column of [/Tipo/, /Material/, /Cantidad/, /Proveedor \/ Trabajador/, /Motivo/, /Referencia/, /Fecha/]) {
      fireEvent.click(screen.getByRole('button', { name: column }));
      expect(tableRows()).toMatchSnapshot(`${column.source} primer clic`);

      fireEvent.click(screen.getByRole('button', { name: column }));
      expect(tableRows()).toMatchSnapshot(`${column.source} segundo clic`);
    }
  });

  it('valida y crea una entrada con proveedor', async () => {
    const api = await renderApp('/inventario', { userId: USUARIO_ALMACENISTA });

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo vacio');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Completa los campos obligatorios del movimiento.')).toBeInTheDocument();

    await chooseOption(within(dialog).getAllByRole('combobox')[0], 'Gelcoat blanco');
    type(within(dialog).getByLabelText(/^Fecha/), '2026-03-14');
    type(within(dialog).getByLabelText(/^Referencia/), ' OC-2001 ');
    type(within(dialog).getByLabelText(/^Cantidad/), '0');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('La cantidad debe ser mayor que cero.')).toBeInTheDocument();

    type(within(dialog).getByLabelText(/^Cantidad/), '12.5');
    await chooseOption(within(dialog).getAllByRole('combobox')[2], 'FibraMax');
    type(within(dialog).getByLabelText('Motivo'), '  ');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tableRows()).toMatchSnapshot('movimientos tras crear');
  });

  it('impide salidas y ajustes que dejen el stock en negativo', async () => {
    const api = await renderApp('/inventario');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    const dialog = screen.getByRole('dialog');

    await chooseOption(within(dialog).getAllByRole('combobox')[0], 'Gelcoat blanco');
    await chooseOption(within(dialog).getAllByRole('combobox')[1], 'Salida');
    expect(dom(dialog)).toMatchSnapshot('dialogo de salida');

    type(within(dialog).getByLabelText(/^Fecha/), '2026-03-14');
    type(within(dialog).getByLabelText(/^Referencia/), 'PRD-0100');
    type(within(dialog).getByLabelText(/^Cantidad/), '9');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText(/dejaría el stock de Gelcoat blanco en negativo \(-1\.50\)/)).toBeInTheDocument();

    await chooseOption(within(dialog).getAllByRole('combobox')[1], 'Ajuste');
    expect(dom(dialog)).toMatchSnapshot('dialogo de ajuste');
    type(within(dialog).getByLabelText(/^Cantidad/), '0');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('El ajuste no puede ser cero.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    type(within(dialog).getByLabelText(/^Cantidad/), '-2');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
  });

  it('edita un movimiento y conserva su responsable según el tipo', async () => {
    const api = await renderApp('/inventario');

    fireEvent.click(screen.getAllByTitle('Editar')[3]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con datos');

    type(within(dialog).getByLabelText(/^Cantidad/), '25');
    type(within(dialog).getByLabelText('Motivo'), 'Consumo ajustado');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('movimientos tras editar');
  });

  it('muestra el error del backend al guardar', async () => {
    const api = await renderApp('/inventario');
    api.respondNext('PUT', '/api/inventory/movimientos/', 400, {
      cantidad: ["Este movimiento dejaría el stock de 'Resina poliéster' en negativo (-3.00)."],
    });

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(within(dialog).getByText(/en negativo \(-3\.00\)/)).toBeInTheDocument();
  });

  it('elimina solo si el usuario confirma', async () => {
    const api = await renderApp('/inventario');

    answerConfirmWith(false);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    fireEvent.click(screen.getAllByTitle('Eliminar')[1]);
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('movimientos tras eliminar');
  });

  it('importa movimientos desde un archivo: plantilla, vista previa y confirmación', async () => {
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(`${this.download} <- ${this.href}`);
    });
    window.URL.createObjectURL = vi.fn(() => 'blob:plantilla');
    window.URL.revokeObjectURL = vi.fn();

    const api = await renderApp('/inventario');

    fireEvent.click(screen.getByRole('button', { name: 'Importar Excel' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo inicial');

    fireEvent.click(within(dialog).getByRole('button', { name: /Descargar plantilla ejemplo/ }));
    await settle(api);
    expect(downloads).toMatchSnapshot('descarga de plantilla');

    const file = new File(['contenido'], 'movimientos.xlsx');
    fireEvent.change(within(dialog).getByLabelText('Archivo Excel'), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
    await settle(api);
    expect(dom(dialog)).toMatchSnapshot('vista previa con errores');
    expect(within(dialog).getByRole('button', { name: /Importar definitivamente/ })).toBeDisabled();

    api.respondNext('POST', '/api/inventory/movimientos/import/preview/', 400, { detail: 'El archivo está vacío.' });
    fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
    await settle(api);
    expect(within(dialog).getByText('El archivo está vacío.')).toBeInTheDocument();

    expect(api.mutations()).toMatchSnapshot('peticiones');
  });

  it('confirma la importación cuando la vista previa no tiene errores', async () => {
    const api = await renderApp('/inventario');
    const cleanPreview = { ...(await import('@/test/fixtures')).importPreview, can_import: true, invalid_rows: 0 };
    api.respondNext('POST', '/api/inventory/movimientos/import/preview/', 200, cleanPreview);

    fireEvent.click(screen.getByRole('button', { name: 'Importar Excel' }));
    const dialog = screen.getByRole('dialog');
    const file = new File(['contenido'], 'movimientos.xlsx');
    fireEvent.change(within(dialog).getByLabelText('Archivo Excel'), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
    await settle(api);

    api.respondNext('POST', '/api/inventory/movimientos/import/commit/', 400, { preview: { ...cleanPreview, can_import: false } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Importar definitivamente/ }));
    await settle(api);
    expect(within(dialog).getByText('Corrige los errores del archivo antes de importar definitivamente.')).toBeInTheDocument();

    api.respondNext('POST', '/api/inventory/movimientos/import/preview/', 200, cleanPreview);
    fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
    await settle(api);
    fireEvent.click(within(dialog).getByRole('button', { name: /Importar definitivamente/ }));
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.requests.filter(request => request.path.includes('/import/') || request.method !== 'GET').length).toBe(4);
    expect(api.requests.slice(-6).map(request => `${request.method} ${request.path}`)).toMatchSnapshot('recarga tras importar');
  });

  it('exporta a Excel lo que está en pantalla', async () => {
    await renderApp('/inventario');

    await chooseOption(screen.getByRole('combobox'), 'Entrada');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });

  it('conserva el estado del formulario al cancelar y lo limpia al cerrar con Escape', async () => {
    await renderApp('/inventario');

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

  it('conserva la vista previa de importación al cancelar y la limpia al cerrar con Escape', async () => {
    const api = await renderApp('/inventario');

    fireEvent.click(screen.getByRole('button', { name: 'Importar Excel' }));
    const file = new File(['contenido'], 'movimientos.xlsx');
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Archivo Excel'), { target: { files: [file] } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Analizar archivo/ }));
    await settle(api);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Importar Excel' }));
    expect(within(screen.getByRole('dialog')).getByText('Archivo listo para analizar: movimientos.xlsx')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('Vista previa por fila')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Importar Excel' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cerrar con Escape');
  });
});