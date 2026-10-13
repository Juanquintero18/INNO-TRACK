/**
 * Arnés para probar pantallas completas contra la API falsa.
 *
 * Monta la aplicación real (rutas, contextos y layout) en una ruta dada, con
 * la sesión de un usuario de prueba, y ofrece utilidades para capturar lo que
 * el usuario vería y lo que el frontend envía al backend.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import writeXlsxFile from 'write-excel-file/browser';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import App from '@/App';
import { createFakeApi, type FakeApi } from './fake-api';

export const USUARIO_ADMIN = 1;
export const USUARIO_ALMACENISTA = 2;
export const USUARIO_TRABAJADOR = 3;

/** Mensajes mostrados con window.alert y window.confirm durante la prueba. */
export const dialogs: string[] = [];

// Montar la aplicación completa es más lento que una prueba unitaria.
vi.setConfig({ testTimeout: 30_000 });

let confirmAnswer = true;

/** Define qué responde el usuario a los siguientes window.confirm. */
export function answerConfirmWith(answer: boolean) {
  confirmAnswer = answer;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-15T15:00:00Z') });
  dialogs.length = 0;
  confirmAnswer = true;

  vi.spyOn(window, 'alert').mockImplementation(message => {
    dialogs.push(`alert: ${message}`);
  });
  vi.spyOn(window, 'confirm').mockImplementation(message => {
    dialogs.push(`confirm: ${message}`);
    return confirmAnswer;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(writeXlsxFile).mockClear();
  window.localStorage.clear();
});

/** Espera a que no queden peticiones en curso ni actualizaciones de React pendientes. */
export async function settle(api: FakeApi) {
  for (let round = 0; round < 3; round += 1) {
    await waitFor(() => expect(api.pending()).toBe(0));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }
}

interface RenderAppOptions {
  userId?: number;
  /** Con `false` se monta la aplicación sin sesión iniciada. */
  authenticated?: boolean;
}

export async function renderApp(path: string, { userId = USUARIO_ADMIN, authenticated = true }: RenderAppOptions = {}) {
  const api = createFakeApi(userId);

  if (authenticated) {
    window.localStorage.setItem('inno_track_access_token', 'token-de-prueba');
  }

  vi.stubGlobal('fetch', vi.fn(api.fetch));
  window.history.pushState({}, '', path);

  render(<App />);
  await settle(api);

  return api;
}

/**
 * Copia del DOM visible lista para comparar.
 *
 * Se neutraliza lo que no afecta al usuario: los identificadores que React y
 * Radix generan en cada render, el orden o los espacios sobrantes de las
 * clases CSS (el navegador las trata como un conjunto) y la división interna
 * de un texto en varios nodos.
 */
export function dom(root: Element = document.body) {
  const copy = root.cloneNode(true) as Element;

  // Une los nodos de texto contiguos: en pantalla se leen igual, sin importar cómo se armó el texto.
  copy.normalize();

  for (const element of [copy, ...Array.from(copy.querySelectorAll('*'))]) {
    for (const attribute of Array.from(element.attributes)) {
      const normalized =
        attribute.name === 'class'
          ? Array.from(new Set(attribute.value.split(/\s+/).filter(Boolean))).sort().join(' ')
          : attribute.value.replace(/:r[0-9a-z]+:/g, ':id:');

      if (normalized !== attribute.value) element.setAttribute(attribute.name, normalized);
    }
  }

  return copy;
}

/** Texto de cada fila visible de una tabla, para verificar filtros y orden. */
export function tableRows(table: HTMLElement = screen.getAllByRole('table')[0]) {
  return within(table)
    .getAllByRole('row')
    .map(row =>
      Array.from(row.querySelectorAll('th,td'))
        .map(cell => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .join(' | ')
    );
}

export function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

/** Elige una opción de un Select de Radix a partir de su disparador. */
export async function chooseOption(trigger: HTMLElement, optionName: string | RegExp) {
  // jsdom no implementa eventos de puntero completos; el teclado abre la lista igual.
  fireEvent.keyDown(trigger, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

/** Hojas enviadas a la librería de Excel en la última exportación, y el nombre del archivo. */
export async function exportedWorkbook() {
  const writer = vi.mocked(writeXlsxFile);
  await waitFor(() => expect(writer).toHaveBeenCalled());

  const result = writer.mock.results.at(-1)?.value as { toFile: ReturnType<typeof vi.fn> };
  await waitFor(() => expect(result.toFile).toHaveBeenCalled());

  return {
    fileName: result.toFile.mock.calls.at(-1)?.[0] as string,
    sheets: writer.mock.calls.at(-1)?.[0],
  };
}

export { fireEvent, screen, waitFor, within };
