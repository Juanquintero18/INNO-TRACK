/**
 * Flujo completo de una importación desde Excel, igual para todos los módulos:
 * abrir el diálogo, descargar la plantilla, analizar un archivo con errores y
 * confirmar uno limpio.
 */
import { expect, vi } from 'vitest';
import { dialogs, dom, fireEvent, renderApp, screen, settle, within } from './app-harness';
import { importPreviews } from './fixtures';

interface ImportFlowOptions {
  route: string;
  userId?: number;
  resourcePath: string;
  title: string;
  templateFileName: string;
  successMessage: string;
  /** Texto del botón que abre la importación, si la pantalla tiene más de una. */
  buttonName?: string;
}

export async function runImportFlow({
  route,
  userId,
  resourcePath,
  title,
  templateFileName,
  successMessage,
  buttonName = 'Importar Excel',
}: ImportFlowOptions) {
  const downloads: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
  window.URL.createObjectURL = vi.fn(() => 'blob:plantilla');
  window.URL.revokeObjectURL = vi.fn();

  const api = await renderApp(route, userId ? { userId } : {});

  fireEvent.click(screen.getByRole('button', { name: buttonName }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(title)).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: /Descargar plantilla ejemplo/ }));
  await settle(api);
  expect(downloads).toEqual([templateFileName]);

  const file = new File(['contenido'], 'datos.xlsx');
  fireEvent.change(within(dialog).getByLabelText('Archivo Excel'), { target: { files: [file] } });
  fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
  await settle(api);
  const previewDom = dom(dialog);
  expect(within(dialog).getByRole('button', { name: /Importar definitivamente/ })).toBeDisabled();

  const limpia = { ...importPreviews[resourcePath], can_import: true, invalid_rows: 0 };
  api.respondNext('POST', `${resourcePath}import/preview/`, 200, limpia);
  fireEvent.click(within(dialog).getByRole('button', { name: /Analizar archivo/ }));
  await settle(api);
  const before = api.requests.length;
  fireEvent.click(within(dialog).getByRole('button', { name: /Importar definitivamente/ }));
  await settle(api);

  expect(dialogs).toEqual([`alert: ${successMessage}`]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  return {
    previewDom,
    requestsAfterConfirm: api.requests.slice(before).map(request => `${request.method} ${request.path}`),
  };
}
