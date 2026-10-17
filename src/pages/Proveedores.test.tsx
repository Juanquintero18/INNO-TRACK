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
  type,
  within,
} from '@/test/app-harness';

const SEARCH = 'Buscar por nombre, correo, teléfono o dirección...';

/** Nombres de los proveedores en el orden en que aparecen sus tarjetas. */
const cardNames = () => screen.queryAllByRole('heading', { level: 3 }).map(heading => heading.textContent);

describe('Proveedores', () => {
  it('muestra el directorio al administrador', async () => {
    await renderApp('/proveedores');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('el almacenista puede entrar y el trabajador es redirigido', async () => {
    await renderApp('/proveedores', { userId: USUARIO_ALMACENISTA });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Proveedores');
  });

  it('redirige al dashboard a quien no tiene acceso al módulo', async () => {
    await renderApp('/proveedores', { userId: USUARIO_TRABAJADOR });

    expect(window.location.pathname).toBe('/dashboard');
  });

  it('filtra por cualquier dato de contacto y ordena', async () => {
    await renderApp('/proveedores');

    type(screen.getByPlaceholderText(SEARCH), 'bogotá');
    expect(cardNames()).toMatchSnapshot('busqueda por direccion');

    type(screen.getByPlaceholderText(SEARCH), 'no existe');
    expect(cardNames()).toEqual([]);
    expect(screen.getByText('No hay proveedores que coincidan con el filtro actual.')).toBeInTheDocument();

    type(screen.getByPlaceholderText(SEARCH), '');
    fireEvent.click(screen.getByRole('button', { name: 'ASC' }));
    expect(cardNames()).toMatchSnapshot('nombre descendente');

    await chooseOption(screen.getByRole('combobox'), 'Teléfono');
    expect(cardNames()).toMatchSnapshot('telefono ascendente');
    expect(screen.getByRole('button', { name: 'ASC' })).toBeInTheDocument();
  });

  it('valida y crea un proveedor', async () => {
    const api = await renderApp('/proveedores');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo vacio');

    type(within(dialog).getByLabelText('Nombre del proveedor'), 'Pinturas Norte');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Completa todos los campos del proveedor.')).toBeInTheDocument();

    type(within(dialog).getByLabelText('Teléfono'), '6045551212');
    type(within(dialog).getByLabelText('Correo electrónico'), 'VENTAS@quimica.test');
    type(within(dialog).getByLabelText('Dirección'), 'Medellín');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Ese correo del proveedor ya existe.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    type(within(dialog).getByLabelText('Correo electrónico'), ' hola@pinturasnorte.test ');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cardNames()).toMatchSnapshot('directorio tras crear');
  });

  it('edita un proveedor con datos incompletos', async () => {
    const api = await renderApp('/proveedores');

    fireEvent.click(screen.getAllByTitle('Editar')[2]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con datos');

    type(within(dialog).getByLabelText('Teléfono'), '6055557788');
    type(within(dialog).getByLabelText('Dirección'), 'Cartagena');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(dom(screen.getByRole('main'))).toMatchSnapshot('directorio tras editar');
  });

  it('elimina solo si el usuario confirma y muestra el error del backend', async () => {
    const api = await renderApp('/proveedores');

    answerConfirmWith(false);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    api.respondNext('DELETE', '/api/inventory/proveedores/', 400, { detail: 'Tiene movimientos asociados.' });
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);
    expect(cardNames()).toHaveLength(3);

    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(cardNames()).toMatchSnapshot('directorio tras eliminar');
  });

  it('exporta a Excel lo que está en pantalla', async () => {
    await renderApp('/proveedores');

    fireEvent.click(screen.getByRole('button', { name: 'ASC' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });

  it('conserva el estado del formulario al cancelar y lo limpia al cerrar con Escape', async () => {
    await renderApp('/proveedores');

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cancelar una edicion');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cerrar con Escape');
  });

  it('importa proveedores desde Excel: plantilla, vista previa y confirmación', async () => {
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
    window.URL.createObjectURL = vi.fn(() => 'blob:plantilla');
    window.URL.revokeObjectURL = vi.fn();

    const api = await renderApp('/proveedores', { userId: USUARIO_ALMACENISTA });

    fireEvent.click(screen.getByRole('button', { name: 'Importar Excel' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Importar Excel de proveedores')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Descargar plantilla ejemplo/ }));
    await settle(api);
    expect(downloads).toEqual(['plantilla_proveedores.xlsx']);

    const file = new File(['contenido'], 'proveedores.xlsx');
    fireEvent.change(within(dialog).getByLabelText('Archivo Excel'), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
    await settle(api);
    expect(dom(dialog)).toMatchSnapshot('vista previa con errores');
    expect(within(dialog).getByRole('button', { name: /Importar definitivamente/ })).toBeDisabled();

    const { importPreviews } = await import('@/test/fixtures');
    const limpia = { ...importPreviews['/api/inventory/proveedores/'], can_import: true, invalid_rows: 0 };
    api.respondNext('POST', '/api/inventory/proveedores/import/preview/', 200, limpia);
    fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
    await settle(api);
    const before = api.requests.length;
    fireEvent.click(within(dialog).getByRole('button', { name: /Importar definitivamente/ }));
    await settle(api);

    expect(dialogs).toEqual(['alert: Se importaron 2 proveedores correctamente.']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.requests.slice(before).map(request => `${request.method} ${request.path}`)).toMatchSnapshot('confirmacion y recarga');
  });
});
