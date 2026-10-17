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
import { runImportFlow } from '@/test/import-flow';

const SEARCH = 'Buscar por nombre, trace ID, orden o proyecto...';

/** El diálogo activo: Radix oculta a los lectores de pantalla los que quedan debajo. */
const topDialog = () => screen.getByRole('dialog');

describe('Piezas', () => {
  it('muestra las piezas con su costo y estado al administrador', async () => {
    await renderApp('/piezas');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('el trabajador puede editar pero no configurar materiales', async () => {
    await renderApp('/piezas', { userId: USUARIO_TRABAJADOR });

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
  });

  it('el almacenista solo consulta y recibe un aviso si intenta crear', async () => {
    const api = await renderApp('/piezas', { userId: USUARIO_ALMACENISTA });

    expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
    expect(screen.getAllByTitle('Ver detalle')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Nueva pieza' }));

    expect(dialogs).toEqual(['alert: No tienes permisos para editar en el módulo de Piezas.']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.mutations()).toEqual([]);
  });

  it('filtra por texto y por rango de fechas de QC', async () => {
    await renderApp('/piezas');

    for (const term of ['plataforma', 'tr-000', 'ORD-002', 'kalahari', 'no existe']) {
      type(screen.getByPlaceholderText(SEARCH), term);
      expect(tableRows()).toMatchSnapshot(`busqueda ${term}`);
    }

    type(screen.getByPlaceholderText(SEARCH), '');
    type(screen.getByLabelText('Fecha inicio'), '2026-02-01');
    expect(tableRows()).toMatchSnapshot('qc desde');

    type(screen.getByLabelText('Fecha inicio'), '');
    type(screen.getByLabelText('Fecha fin'), '2026-02-01');
    expect(tableRows()).toMatchSnapshot('qc hasta');
  });

  it('ordena por cada columna', async () => {
    await renderApp('/piezas');

    for (const column of [/Nombre/, /Proyecto/, /Orden/, /Fecha Gelcoat/, /Fecha QC/, /Peso Real/, /Costo Total/, /Estado/, /Trace ID/]) {
      fireEvent.click(screen.getByRole('button', { name: column }));
      expect(tableRows()).toMatchSnapshot(`${column.source} primer clic`);

      fireEvent.click(screen.getByRole('button', { name: column }));
      expect(tableRows()).toMatchSnapshot(`${column.source} segundo clic`);
    }
  });

  it('muestra el detalle de una pieza y el detalle de cada evento de su historial', async () => {
    await renderApp('/piezas');

    fireEvent.click(screen.getAllByTitle('Ver detalle')[1]);
    expect(dom(topDialog())).toMatchSnapshot('detalle de la pieza');

    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Ver cambios' }));
    expect(dom(topDialog())).toMatchSnapshot('evento de edicion');

    fireEvent.keyDown(topDialog(), { key: 'Escape' });
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Ver detalle' }));
    expect(dom(topDialog())).toMatchSnapshot('evento de creacion');
  });

  it('muestra el resumen de un evento antiguo y las piezas sin historial ni datos', async () => {
    await renderApp('/piezas');

    fireEvent.click(screen.getAllByTitle('Ver detalle')[2]);
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Ver resumen' }));
    expect(dom(topDialog())).toMatchSnapshot('evento antiguo');

    fireEvent.keyDown(topDialog(), { key: 'Escape' });
    fireEvent.keyDown(topDialog(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByTitle('Ver detalle')[0]);
    expect(dom(topDialog())).toMatchSnapshot('pieza sin datos');
  });

  it('valida y crea una pieza con materiales', async () => {
    const api = await renderApp('/piezas', { userId: USUARIO_TRABAJADOR });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva pieza' }));
    const form = topDialog();
    expect(dom(form)).toMatchSnapshot('dialogo vacio');

    fireEvent.click(within(form).getByRole('button', { name: 'Guardar' }));
    expect(within(form).getByText('Completa los campos principales de la pieza.')).toBeInTheDocument();

    type(within(form).getByLabelText(/^Trace ID/), ' tr-0001 ');
    type(within(form).getByLabelText(/^Nombre de la pieza/), ' Curva doble ');
    await chooseOption(within(form).getAllByRole('combobox')[0], 'Aquaventura');
    await chooseOption(within(form).getAllByRole('combobox')[1], 'ORD-002');
    await chooseOption(within(form).getAllByRole('combobox')[2], 'Carlos Operador');
    type(within(form).getByLabelText(/^Fecha gelcoat/), '2026-03-12');
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar' }));
    expect(within(form).getByText('Ese trace ID ya existe.')).toBeInTheDocument();

    // Cambiar de proyecto limpia la orden elegida.
    await chooseOption(within(form).getAllByRole('combobox')[0], 'Kalahari');
    type(within(form).getByLabelText(/^Trace ID/), 'TR-0050');
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar' }));
    expect(within(form).getByText('Completa los campos principales de la pieza.')).toBeInTheDocument();
    await chooseOption(within(form).getAllByRole('combobox')[1], 'ORD-010');

    fireEvent.click(within(form).getByRole('button', { name: /Añadir materiales/ }));
    expect(dom(topDialog())).toMatchSnapshot('dialogo de materiales');

    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Agregar material' }));
    expect(within(topDialog()).getByText('Selecciona una materia prima y una cantidad válida.')).toBeInTheDocument();

    await chooseOption(within(topDialog()).getByRole('combobox'), 'Resina poliéster');
    type(within(topDialog()).getByLabelText(/^Cantidad/), '0');
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Agregar material' }));
    expect(within(topDialog()).getByText('La cantidad debe ser mayor que cero.')).toBeInTheDocument();

    type(within(topDialog()).getByLabelText(/^Cantidad/), '12.5');
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Agregar material' }));

    fireEvent.click(within(form).getByRole('button', { name: /Añadir materiales/ }));
    await chooseOption(within(topDialog()).getByRole('combobox'), 'Gelcoat blanco');
    type(within(topDialog()).getByLabelText(/^Cantidad/), '2');
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Agregar material' }));

    fireEvent.click(within(form).getByRole('button', { name: /Añadir materiales/ }));
    await chooseOption(within(topDialog()).getByRole('combobox'), 'Desmoldante');
    type(within(topDialog()).getByLabelText(/^Cantidad/), '1');
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Agregar material' }));
    expect(dom(form)).toMatchSnapshot('formulario con tres materiales');

    fireEvent.click(within(form).getAllByRole('button', { name: 'Quitar' })[1]);
    type(within(form).getByLabelText(/^Peso real/), '30.25');
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(api.requests.slice(-4).map(request => `${request.method} ${request.path}`).sort()).toMatchSnapshot('recarga de produccion');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tableRows()).toMatchSnapshot('listado tras crear');
  });

  it('edita una pieza que conserva un material deshabilitado', async () => {
    const api = await renderApp('/piezas');

    fireEvent.click(screen.getAllByTitle('Editar')[3]);
    const form = topDialog();
    expect(dom(form)).toMatchSnapshot('dialogo con datos');

    fireEvent.click(within(form).getByRole('button', { name: 'Actualizar' }));
    expect(within(form).getByText('Completa los campos principales de la pieza.')).toBeInTheDocument();

    type(within(form).getByLabelText(/^Fecha gelcoat/), '2026-02-25');
    type(within(form).getByLabelText(/^Peso real/), '0');
    fireEvent.click(within(form).getByRole('button', { name: 'Actualizar' }));
    expect(within(form).getByText('El peso real debe ser mayor que cero.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    type(within(form).getByLabelText(/^Peso real/), '82.4');
    type(within(form).getByLabelText(/^Fecha QC/), '');
    fireEvent.click(within(form).getAllByRole('button', { name: 'Quitar' })[1]);
    fireEvent.click(within(form).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tableRows()).toMatchSnapshot('listado tras editar');
  });

  it('muestra el error del backend y luego guarda la edición', async () => {
    const api = await renderApp('/piezas');
    api.respondNext('PUT', '/api/production/piezas/', 400, { peso_real: ['Asegúrese de que no haya más de 10 dígitos.'] });

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Actualizar' }));
    await settle(api);
    expect(within(topDialog()).getByText('Asegúrese de que no haya más de 10 dígitos.')).toBeInTheDocument();

    type(within(topDialog()).getByLabelText(/^Nombre de la pieza/), 'Tobogán curva A2');
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('listado tras editar');
  });

  it('configura qué materiales se pueden usar en piezas', async () => {
    const api = await renderApp('/piezas');

    fireEvent.click(screen.getByRole('button', { name: /Configurar materiales/ }));
    const dialog = topDialog();
    expect(dom(dialog)).toMatchSnapshot('dialogo inicial');

    for (const checkbox of within(dialog).getAllByRole('checkbox', { checked: true })) {
      fireEvent.click(checkbox);
    }
    expect(dom(dialog)).toMatchSnapshot('advertencia por materiales en uso');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar configuración' }));
    expect(within(dialog).getByText('Debes dejar al menos una materia prima habilitada para piezas.')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Habilitar Desmoldante para piezas' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Habilitar Catalizador MEKP para piezas' }));

    answerConfirmWith(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar configuración' }));
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    api.respondNext('PUT', '/api/inventory/materias-primas/piezas-materiales/', 404, { detail: 'No encontrado.' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar configuración' }));
    await settle(api);
    expect(within(dialog).getByText(/El backend activo no reconoce este endpoint todavía/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar configuración' }));
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Con casi todo deshabilitado, el formulario de pieza ofrece solo lo habilitado.
    fireEvent.click(screen.getByRole('button', { name: 'Nueva pieza' }));
    fireEvent.click(within(topDialog()).getByRole('button', { name: /Añadir materiales/ }));
    fireEvent.keyDown(within(topDialog()).getByRole('combobox'), { key: 'Enter' });
    expect((await screen.findAllByRole('option')).map(option => option.textContent)).toEqual(['Catalizador MEKP', 'Desmoldante']);
  });

  it('elimina solo si el usuario confirma', async () => {
    const api = await renderApp('/piezas');

    answerConfirmWith(false);
    fireEvent.click(screen.getAllByTitle('Eliminar')[1]);
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    fireEvent.click(screen.getAllByTitle('Eliminar')[1]);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(tableRows()).toMatchSnapshot('listado tras eliminar');
  });

  it('exporta a Excel las piezas visibles y sus materiales', async () => {
    await renderApp('/piezas');

    type(screen.getByPlaceholderText(SEARCH), 'tr-00');
    fireEvent.click(screen.getByRole('button', { name: /Costo Total/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });

  it('conserva el estado del formulario al cancelar y lo limpia al cerrar con Escape', async () => {
    await renderApp('/piezas');

    fireEvent.click(screen.getAllByTitle('Editar')[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva pieza' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cancelar una edicion');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva pieza' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('tras cerrar con Escape');
  });

  it('conserva lo escrito en el diálogo de materiales al cancelar', async () => {
    await renderApp('/piezas');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva pieza' }));
    const form = topDialog();
    fireEvent.click(within(form).getByRole('button', { name: /Añadir materiales/ }));
    await chooseOption(within(topDialog()).getByRole('combobox'), 'Fibra de vidrio');
    type(within(topDialog()).getByLabelText(/^Cantidad/), '7');
    fireEvent.click(within(topDialog()).getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(within(form).getByRole('button', { name: /Añadir materiales/ }));
    expect(dom(topDialog())).toMatchSnapshot('tras cancelar');

    fireEvent.keyDown(topDialog(), { key: 'Escape' });
    fireEvent.click(within(form).getByRole('button', { name: /Añadir materiales/ }));
    expect(dom(topDialog())).toMatchSnapshot('tras cerrar con Escape');
  });

  it('el trabajador importa piezas desde Excel', async () => {
    const result = await runImportFlow({
      route: '/piezas',
      userId: USUARIO_TRABAJADOR,
      resourcePath: '/api/production/piezas/',
      title: 'Importar Excel de piezas',
      templateFileName: 'plantilla_piezas.xlsx',
      successMessage: 'Se importaron 2 piezas correctamente.',
    });

    expect(result.previewDom).toMatchSnapshot('vista previa con errores');
    expect(result.requestsAfterConfirm).toMatchSnapshot('confirmacion y recarga');
  });

  it('no muestra la importación al almacenista', async () => {
    await renderApp('/piezas', { userId: USUARIO_ALMACENISTA });

    expect(screen.queryByRole('button', { name: 'Importar Excel' })).not.toBeInTheDocument();
  });
});
