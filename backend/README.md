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