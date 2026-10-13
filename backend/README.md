# Backend

Backend de INNO-TRACK con Django, Django REST Framework y PostgreSQL, conectado al esquema real de la base de datos.

## Estructura

```text
backend/
  manage.py
  requirements.txt
  .env.example
  config/
  apps/
    accounts/
    audit/
    inventory/
    production/
```

## Apps

- `accounts`: autenticacion, usuario y permisos.
- `audit`: auditoria persistente de eliminaciones y restauraciones.
- `inventory`: materias primas, proveedores, trabajadores y movimientos.
- `production`: proyectos, ordenes, piezas y trazabilidad.

## Estado actual

- La autenticacion usa la tabla real `usuario`.
- Las contraseñas existentes fueron hasheadas para compatibilidad con Django.
- La auditoria ya no depende de `localStorage`: se guarda en PostgreSQL en la tabla `auditoria_eliminacion`.
- Las eliminaciones de usuarios, proveedores, trabajadores, materias primas, movimientos y piezas generan un log persistente y se pueden restaurar desde la API.

## Auditoria persistente

- Tabla: `auditoria_eliminacion`
- Endpoint de consulta: `GET /api/audit/logs/`
- Endpoint de restauracion: `POST /api/audit/logs/{id}/restore/`
- Cada log guarda: tipo de entidad, id original, etiqueta legible, snapshot JSON del registro, usuario que elimino y marcas de restauracion.

## Recuperacion de contrasena

- `POST /api/auth/password-reset/` con `{ "email": "..." }`: envia un correo con el enlace. Responde lo mismo exista o no la cuenta.
- `POST /api/auth/password-reset/confirm/` con `{ "uid", "token", "password" }`: guarda la nueva contrasena y avisa por correo al titular.
- El enlace apunta a `FRONTEND_URL/restablecer-contrasena`, vence en `PASSWORD_RESET_TIMEOUT_SECONDS` (30 minutos por defecto) y deja de servir apenas la contrasena cambia. No guarda nada en la base de datos.
- La nueva contrasena debe cumplir `AUTH_PASSWORD_VALIDATORS` (minimo 8 caracteres, no solo numeros, no comun, no parecida al nombre o correo).
- Limites por hora: 10 solicitudes por IP, 3 por correo y 10 confirmaciones por IP.
- Por defecto el correo se imprime en la consola del servidor. Para enviarlo de verdad configura `EMAIL_BACKEND` y los datos SMTP en `.env` (ver `.env.example`).
- Las sesiones ya abiertas no se cierran al cambiar la contrasena: sus tokens siguen vigentes hasta que vencen (`API_TOKEN_MAX_AGE_SECONDS`, 8 horas por defecto).

## Pruebas

- `./.venv/Scripts/python.exe backend/manage.py test apps --settings=config.settings_test`
- Usan SQLite en memoria y crean las tablas legacy desde los modelos, asi que no tocan PostgreSQL.
- Las pruebas de cada app comparan las respuestas de la API con los archivos de `tests_golden/`. Si una respuesta cambia, la prueba falla; para aceptar un cambio intencional se borra el archivo correspondiente y se vuelve a ejecutar.

## Puesta en marcha

1. Crear y activar el entorno virtual del proyecto en `.venv`.
2. Instalar dependencias con `./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt`.
3. Copiar `.env.example` a `.env` y ajustar credenciales locales.
4. Ejecutar `./.venv/Scripts/python.exe backend/manage.py migrate`.
5. Ejecutar `./.venv/Scripts/python.exe backend/manage.py runserver`.

## Nota de entorno

- El backend validado en este repositorio usa `.venv`.
- Existe un directorio `venv/` en algunas maquinas, pero puede no tener todas las dependencias requeridas.
- Si aparece `ModuleNotFoundError: No module named 'decouple'`, normalmente se esta usando el entorno equivocado.