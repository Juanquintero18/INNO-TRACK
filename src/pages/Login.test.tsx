import { describe, expect, it } from 'vitest';
import { dom, fireEvent, renderApp, screen, settle, type } from '@/test/app-harness';

describe('Login y rutas', () => {
  it('muestra el formulario de acceso cuando no hay sesión', async () => {
    await renderApp('/', { authenticated: false });

    expect(dom()).toMatchSnapshot();
  });

  it('envía a la pantalla de acceso al abrir una ruta privada sin sesión', async () => {
    await renderApp('/piezas', { authenticated: false });

    expect(window.location.pathname).toBe('/');
  });

  it('lleva al dashboard a quien ya tiene sesión', async () => {
    await renderApp('/');

    expect(window.location.pathname).toBe('/dashboard');
  });

  it('muestra la página 404 en rutas desconocidas', async () => {
    await renderApp('/no-existe');

    expect(dom(document.getElementById('root') ?? document.body)).toMatchSnapshot();
  });

  it('muestra el error del backend con credenciales incorrectas', async () => {
    const api = await renderApp('/', { authenticated: false });

    type(screen.getByLabelText('Correo electrónico'), 'admin@innolution.test');
    type(screen.getByLabelText('Contraseña'), 'clave-equivocada');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));
    await settle(api);

    expect(screen.getByText('Credenciales incorrectas.')).toBeInTheDocument();
    expect(window.localStorage.getItem('inno_track_access_token')).toBeNull();
  });

  it('inicia sesión, guarda el token y carga los datos', async () => {
    const api = await renderApp('/', { authenticated: false });
    const before = api.requests.length;

    type(screen.getByLabelText('Correo electrónico'), 'admin@innolution.test');
    type(screen.getByLabelText('Contraseña'), 'clave-correcta');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));
    await settle(api);

    expect(window.location.pathname).toBe('/dashboard');
    expect(window.localStorage.getItem('inno_track_access_token')).toBe('token-nuevo');
    expect(api.requests[before]).toMatchSnapshot('peticion de login');
    expect(
      api.requests
        .slice(before + 1)
        .map(request => `${request.method} ${request.path}`)
        .sort()
    ).toMatchSnapshot('carga de datos');
  });
});
