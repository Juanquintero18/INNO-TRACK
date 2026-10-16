import { describe, expect, it } from 'vitest';
import { USUARIO_TRABAJADOR, dom, fireEvent, renderApp, screen, settle, within } from '@/test/app-harness';

describe('Aviso de la política de cookies', () => {
  it('no aparece si el usuario ya aceptó la versión vigente', async () => {
    await renderApp('/dashboard');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('aparece al entrar si falta aceptarla y desaparece al aceptar', async () => {
    const api = await renderApp('/dashboard', { userId: USUARIO_TRABAJADOR, cookiesAceptadas: false });

    const aviso = screen.getByRole('alertdialog');
    expect(dom(aviso)).toMatchSnapshot();
    expect(within(aviso).getByRole('link', { name: 'política de cookies' })).toHaveAttribute('href', '/cookies');

    fireEvent.click(within(aviso).getByRole('button', { name: 'Aceptar y continuar' }));
    await settle(api);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.mutations()).toEqual([{ method: 'POST', path: '/api/accounts/politicas/cookies/aceptar/' }]);
  });

  it('no se cierra con Escape: hay que aceptar o cerrar sesión', async () => {
    await renderApp('/piezas', { cookiesAceptadas: false });

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(window.localStorage.getItem('inno_track_access_token')).toBeNull();
  });

  it('muestra el error si no se pudo registrar la aceptación', async () => {
    const api = await renderApp('/dashboard', { cookiesAceptadas: false });
    api.respondNext('POST', '/api/accounts/politicas/cookies/aceptar/', 500, { detail: 'Error del servidor.' });

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
    await settle(api);

    expect(within(screen.getByRole('alertdialog')).getByText('Error del servidor.')).toBeInTheDocument();
  });
});
