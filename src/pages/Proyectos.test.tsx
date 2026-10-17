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
import { runImportFlow } from '@/test/import-flow';

const PROJECT_SEARCH = 'Buscar proyecto por nombre, codigo o estado...';
const ORDER_SEARCH = 'Buscar orden por codigo o estado...';

const tables = () => screen.getAllByRole('table');
const projectRows = () => tableRows(tables()[0]);
const orderRows = () => tableRows(tables()[1]);
const statusFilters = () => within(screen.getByRole('main')).getAllByRole('combobox');

/** Selecciona un proyecto haciendo clic en su fila. */
const selectProject = (name: string) => fireEvent.click(within(tables()[0]).getByText(name));

describe('Proyectos', () => {
  it('empieza sin proyecto seleccionado y pide elegir uno', async () => {
    await renderApp('/proyectos');

    expect(dom(screen.getByRole('main'))).toMatchSnapshot();
    expect(screen.getByText('Selecciona un proyecto en la tabla de proyectos para ver su dashboard.')).toBeInTheDocument();
    expect(screen.getByText('Aun no hay un proyecto seleccionado.')).toBeInTheDocument();
  });

  it('muestra el dashboard del proyecto seleccionado y permite quitar la selección', async () => {
    await renderApp('/proyectos');

    selectProject('Aquaventura');
    const dashboard = screen.getByText('Dashboard del proyecto').closest('.rounded-lg.border') as HTMLElement;
    expect(dom(dashboard)).toMatchSnapshot('dashboard de Aquaventura');

    fireEvent.click(screen.getByRole('button', { name: /Quitar selección/ }));
    expect(screen.getByText('Selecciona un proyecto en la tabla de proyectos para ver su dashboard.')).toBeInTheDocument();
    expect(screen.getByText('Aun no hay un proyecto seleccionado.')).toBeInTheDocument();
  });

  it('las métricas del dashboard cambian según el proyecto', async () => {
    await renderApp('/proyectos');
    const kpis = () =>
      Array.from(document.querySelectorAll('main .grid > .rounded-lg.border.p-4')).map(kpi =>
        kpi.textContent?.replace(/\s+/g, ' ').trim()
      );

    selectProject('Aquaventura');
    expect(kpis()).toMatchSnapshot('Aquaventura');

    selectProject('Kalahari');
    expect(kpis()).toMatchSnapshot('Kalahari');

    selectProject('Sin órdenes');
    expect(kpis()).toMatchSnapshot('Sin ordenes');
  });

  it('quita la selección si el proyecto seleccionado se elimina', async () => {
    const api = await renderApp('/proyectos');

    selectProject('Sin órdenes');
    fireEvent.click(screen.getAllByTitle('Eliminar proyecto')[3]);
    await settle(api);

    expect(screen.getByText('Selecciona un proyecto en la tabla de proyectos para ver su dashboard.')).toBeInTheDocument();
  });

  it('redirige al dashboard a quien no es administrador', async () => {
    await renderApp('/proyectos', { userId: USUARIO_ALMACENISTA });

    expect(window.location.pathname).toBe('/dashboard');
  });

  it('filtra y ordena los proyectos', async () => {
    await renderApp('/proyectos');

    type(screen.getByPlaceholderText(PROJECT_SEARCH), 'KAL');
    expect(projectRows()).toMatchSnapshot('busqueda por codigo');

    type(screen.getByPlaceholderText(PROJECT_SEARCH), 'no existe');
    expect(projectRows()).toMatchSnapshot('sin resultados');

    type(screen.getByPlaceholderText(PROJECT_SEARCH), '');
    await chooseOption(statusFilters()[0], 'Activo');
    expect(projectRows()).toMatchSnapshot('solo activos');

    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]);
    type(screen.getByLabelText('Inicio desde'), '2026-01-01');
    type(screen.getByLabelText('Inicio hasta'), '2026-01-31');
    expect(projectRows()).toMatchSnapshot('inicio en enero');

    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]);
    for (const column of ['Codigo', 'Estado', 'Inicio', 'Ordenes', 'Nombre']) {
      fireEvent.click(within(tables()[0]).getByRole('button', { name: column }));
      expect(projectRows()).toMatchSnapshot(`${column} primer clic`);

      fireEvent.click(within(tables()[0]).getByRole('button', { name: column }));
      expect(projectRows()).toMatchSnapshot(`${column} segundo clic`);
    }
  });

  it('muestra las órdenes y el resumen del proyecto seleccionado', async () => {
    await renderApp('/proyectos');

    selectProject('Laguna Azul');
    expect(dom(screen.getByRole('main'))).toMatchSnapshot('proyecto finalizado');

    selectProject('Sin órdenes');
    expect(dom(screen.getByRole('main'))).toMatchSnapshot('proyecto sin ordenes');
  });

  it('filtra y ordena las órdenes del proyecto', async () => {
    await renderApp('/proyectos');
    selectProject('Aquaventura');

    type(screen.getByPlaceholderText(ORDER_SEARCH), 'proceso');
    expect(orderRows()).toMatchSnapshot('busqueda por estado');

    type(screen.getByPlaceholderText(ORDER_SEARCH), '');
    await chooseOption(statusFilters()[1], 'Abierta');
    expect(orderRows()).toMatchSnapshot('solo abiertas');

    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[1]);
    type(screen.getByLabelText('Creación desde'), '2026-02-01');
    expect(orderRows()).toMatchSnapshot('creadas desde febrero');

    type(screen.getByLabelText('Creación desde'), '');
    type(screen.getByLabelText('Creación hasta'), '2026-01-31');
    expect(orderRows()).toMatchSnapshot('creadas hasta enero');

    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[1]);
    for (const column of ['Codigo', 'Estado', 'Piezas', 'Fecha']) {
      fireEvent.click(within(tables()[1]).getByRole('button', { name: column }));
      expect(orderRows()).toMatchSnapshot(`${column} primer clic`);

      fireEvent.click(within(tables()[1]).getByRole('button', { name: column }));
      expect(orderRows()).toMatchSnapshot(`${column} segundo clic`);
    }
  });

  it('valida y crea un proyecto, que queda seleccionado', async () => {
    const api = await renderApp('/proyectos');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo proyecto' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo vacio');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('El nombre del proyecto es obligatorio.')).toBeInTheDocument();

    type(within(dialog).getByLabelText(/^Nombre/), ' Río Lento ');
    type(within(dialog).getByLabelText('Codigo'), 'aq-01');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Ese codigo de proyecto ya existe.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    type(within(dialog).getByLabelText('Codigo'), ' RL-05 ');
    await chooseOption(within(dialog).getByRole('combobox'), 'Pausado');
    type(within(dialog).getByLabelText('Fecha inicio'), '2026-04-01');
    type(within(dialog).getByLabelText('Descripcion'), '  Atracción familiar.  ');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(dom(screen.getByRole('main'))).toMatchSnapshot('pantalla tras crear');
  });

  it('edita un proyecto y muestra el error del backend', async () => {
    const api = await renderApp('/proyectos');
    api.respondNext('PUT', '/api/production/proyectos/', 400, { nombre: ['Este campo no puede estar en blanco.'] });

    fireEvent.click(screen.getAllByTitle('Editar proyecto')[3]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con datos');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);
    expect(within(dialog).getByText('Este campo no puede estar en blanco.')).toBeInTheDocument();

    type(within(dialog).getByLabelText('Codigo'), 'SO-09');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(projectRows()).toMatchSnapshot('proyectos tras editar');
  });

  it('no deja eliminar proyectos con órdenes y elimina los que no tienen', async () => {
    const api = await renderApp('/proyectos');

    fireEvent.click(screen.getAllByTitle('Eliminar proyecto')[0]);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(false);
    fireEvent.click(screen.getAllByTitle('Eliminar proyecto')[3]);
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    api.respondNext('DELETE', '/api/production/proyectos/', 400, { detail: 'No se puede eliminar este proyecto.' });
    fireEvent.click(screen.getAllByTitle('Eliminar proyecto')[3]);
    await settle(api);

    fireEvent.click(screen.getAllByTitle('Eliminar proyecto')[3]);
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(projectRows()).toMatchSnapshot('proyectos tras eliminar');
  });

  it('valida y crea una orden en otro proyecto, que pasa a estar seleccionado', async () => {
    const api = await renderApp('/proyectos');
    selectProject('Aquaventura');

    fireEvent.click(screen.getByRole('button', { name: 'Nueva orden' }));
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con el proyecto seleccionado');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('El codigo de la orden es obligatorio.')).toBeInTheDocument();

    type(within(dialog).getByLabelText(/^Codigo de orden/), 'ord-001');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByText('Ese codigo de orden ya existe dentro del proyecto seleccionado.')).toBeInTheDocument();
    expect(api.mutations()).toEqual([]);

    await chooseOption(within(dialog).getAllByRole('combobox')[0], 'KAL-02 - Kalahari');
    await chooseOption(within(dialog).getAllByRole('combobox')[1], 'En proceso');
    type(within(dialog).getByLabelText('Fecha de creacion'), '2026-03-14');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(orderRows()).toMatchSnapshot('ordenes de Kalahari');
    expect(projectRows()).toMatchSnapshot('conteo de ordenes actualizado');
  });

  it('edita una orden y la mueve de proyecto', async () => {
    const api = await renderApp('/proyectos');
    selectProject('Aquaventura');

    fireEvent.click(screen.getAllByTitle('Editar orden')[1]);
    const dialog = screen.getByRole('dialog');
    expect(dom(dialog)).toMatchSnapshot('dialogo con datos');

    await chooseOption(within(dialog).getAllByRole('combobox')[0], 'Sin órdenes');
    type(within(dialog).getByLabelText('Fecha de creacion'), '');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Actualizar' }));
    await settle(api);

    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(dom(screen.getByRole('main'))).toMatchSnapshot('pantalla tras mover la orden');
  });

  it('no deja eliminar órdenes con piezas y elimina las que no tienen', async () => {
    const api = await renderApp('/proyectos');
    selectProject('Aquaventura');

    fireEvent.click(screen.getAllByTitle('Eliminar orden')[0]);
    expect(api.mutations()).toEqual([]);

    selectProject('Laguna Azul');
    answerConfirmWith(false);
    fireEvent.click(screen.getByTitle('Eliminar orden'));
    await settle(api);
    expect(api.mutations()).toEqual([]);

    answerConfirmWith(true);
    api.respondNext('DELETE', '/api/production/ordenes/', 400, { detail: 'No se puede eliminar esta orden.' });
    fireEvent.click(screen.getByTitle('Eliminar orden'));
    await settle(api);

    fireEvent.click(screen.getByTitle('Eliminar orden'));
    await settle(api);

    expect(dialogs).toMatchSnapshot('mensajes');
    expect(api.mutations()).toMatchSnapshot('peticiones');
    expect(orderRows()).toMatchSnapshot('ordenes tras eliminar');
  });

  it('exporta a Excel los proyectos visibles con todas sus órdenes', async () => {
    await renderApp('/proyectos');

    type(screen.getByPlaceholderText(PROJECT_SEARCH), 'a');
    fireEvent.click(within(tables()[0]).getByRole('button', { name: 'Inicio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });

  it('abre los formularios de alta siempre limpios, aunque antes se cancelara una edición', async () => {
    await renderApp('/proyectos');

    fireEvent.click(screen.getAllByTitle('Editar proyecto')[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo proyecto' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('nuevo proyecto');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    selectProject('Kalahari');
    fireEvent.click(screen.getByTitle('Editar orden'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva orden' }));
    expect(dom(screen.getByRole('dialog'))).toMatchSnapshot('nueva orden');
  });

  it('importa proyectos desde Excel', async () => {
    const result = await runImportFlow({
      route: '/proyectos',
      buttonName: 'Importar proyectos',
      resourcePath: '/api/production/proyectos/',
      title: 'Importar Excel de proyectos',
      templateFileName: 'plantilla_proyectos.xlsx',
      successMessage: 'Se importaron 2 proyectos correctamente.',
    });

    expect(result.previewDom).toMatchSnapshot('vista previa con errores');
    expect(result.requestsAfterConfirm).toMatchSnapshot('confirmacion y recarga');
  });

  it('importa órdenes desde Excel enlazadas a su proyecto', async () => {
    const result = await runImportFlow({
      route: '/proyectos',
      buttonName: 'Importar órdenes',
      resourcePath: '/api/production/ordenes/',
      title: 'Importar Excel de órdenes',
      templateFileName: 'plantilla_ordenes.xlsx',
      successMessage: 'Se importaron 2 órdenes correctamente.',
    });

    expect(result.previewDom).toMatchSnapshot('vista previa con errores');
    expect(result.requestsAfterConfirm).toMatchSnapshot('confirmacion y recarga');
  });
});
