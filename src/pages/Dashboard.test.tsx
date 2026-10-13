import { describe, expect, it } from 'vitest';
import {
  USUARIO_ALMACENISTA,
  USUARIO_TRABAJADOR,
  dom,
  exportedWorkbook,
  fireEvent,
  renderApp,
  screen,
} from '@/test/app-harness';

describe('Dashboard', () => {
  it('muestra el resumen completo, con el menú del administrador', async () => {
    await renderApp('/dashboard');

    expect(dom()).toMatchSnapshot();
  });

  it('adapta el menú lateral al rol de almacenista', async () => {
    await renderApp('/dashboard', { userId: USUARIO_ALMACENISTA });

    expect(dom(screen.getByRole('complementary'))).toMatchSnapshot();
  });

  it('adapta el menú lateral al rol de trabajador', async () => {
    await renderApp('/dashboard', { userId: USUARIO_TRABAJADOR });

    expect(dom(screen.getByRole('complementary'))).toMatchSnapshot();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bienvenido, Carlos');
  });

  it('oculta y muestra el panel superior, y colapsa el menú lateral', async () => {
    await renderApp('/dashboard');

    fireEvent.click(screen.getByRole('button', { name: /Ocultar panel/ }));
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Mostrar panel/ }));
    expect(screen.getByRole('banner')).toBeInTheDocument();

    const sidebar = screen.getByRole('complementary');
    fireEvent.click(sidebar.querySelectorAll('button')[1]);
    expect(dom(sidebar)).toMatchSnapshot('menu colapsado');
    expect(screen.getByRole('main').className).toMatchSnapshot('margen del contenido');
  });

  it('cierra la sesión y vuelve al login', async () => {
    await renderApp('/dashboard');

    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }));

    expect(window.location.pathname).toBe('/');
    expect(window.localStorage.getItem('inno_track_access_token')).toBeNull();
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  });

  it('exporta a Excel las cifras del resumen', async () => {
    await renderApp('/dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(await exportedWorkbook()).toMatchSnapshot();
  });
});
