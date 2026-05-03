/**
 * Cliente HTTP minimo del frontend.
 *
 * Centraliza la URL base, el almacenamiento del token y la traduccion de
 * errores comunes del backend a mensajes manejables por la interfaz.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const ACCESS_TOKEN_KEY = 'inno_track_access_token';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

/** Recupera el token persistido para adjuntarlo en peticiones autenticadas. */
export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Guarda el token emitido por el backend despues de un login o refresh. */
export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

/** Elimina el token local cuando la sesion deja de ser valida. */
export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

type ApiRequestOptions = RequestInit & {
  json?: unknown;
  omitAuth?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { json, headers, omitAuth = false, ...rest } = options;
  const token = getAccessToken();

  // Se prepara una unica forma de invocar fetch para que toda la app comparta
  // cabeceras, serializacion JSON y manejo de autorizacion.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(!omitAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      // Se intenta leer los formatos de error que el backend retorna con mas
      // frecuencia para mostrarlos tal cual en formularios y alertas.
      const payload = await response.json();
      if (typeof payload?.detail === 'string') message = payload.detail;
      else if (typeof payload?.non_field_errors?.[0] === 'string') message = payload.non_field_errors[0];
      else if (typeof payload?.[0] === 'string') message = payload[0];
      else if (payload && typeof payload === 'object') {
        const firstValue = Object.values(payload)[0];
        if (typeof firstValue === 'string') message = firstValue;
        else if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') message = firstValue[0];
      }
    } catch {
      // No JSON body.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    // DELETE y algunas acciones del backend no retornan cuerpo.
    return undefined as T;
  }

  return response.json() as Promise<T>;
}