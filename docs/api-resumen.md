# Resumen de API REST

Fecha: 2026-07-18
Alcance: listado resumido de endpoints observados en el backend.

## Base

- Healthcheck: GET /health/
- Usuario actual: GET /api/me/
- Login: POST /api/auth/login/
- Refresh token: POST /api/auth/refresh/

## Accounts

Prefijo: /api/accounts/

- Usuarios (router DRF):
  - GET /api/accounts/users/
  - POST /api/accounts/users/
  - GET /api/accounts/users/{id}/
  - PUT/PATCH /api/accounts/users/{id}/
  - DELETE /api/accounts/users/{id}/

## Audit

Prefijo: /api/audit/

- Logs (solo lectura + accion restore):
  - GET /api/audit/logs/
  - GET /api/audit/logs/{id}/
  - POST /api/audit/logs/{id}/restore/

## Inventory

Prefijo: /api/inventory/

- Unidades de medida:
  - GET /api/inventory/unidades-medida/
  - POST /api/inventory/unidades-medida/
  - GET /api/inventory/unidades-medida/{id}/
  - PUT/PATCH /api/inventory/unidades-medida/{id}/
  - DELETE /api/inventory/unidades-medida/{id}/

- Proveedores:
  - GET /api/inventory/proveedores/
  - POST /api/inventory/proveedores/
  - GET /api/inventory/proveedores/{id}/
  - PUT/PATCH /api/inventory/proveedores/{id}/
  - DELETE /api/inventory/proveedores/{id}/

- Trabajadores:
  - GET /api/inventory/trabajadores/
  - POST /api/inventory/trabajadores/
  - GET /api/inventory/trabajadores/{id}/
  - PUT/PATCH /api/inventory/trabajadores/{id}/
  - DELETE /api/inventory/trabajadores/{id}/

- Materias primas:
  - GET /api/inventory/materias-primas/
  - POST /api/inventory/materias-primas/
  - GET /api/inventory/materias-primas/{id}/
  - PUT/PATCH /api/inventory/materias-primas/{id}/
  - DELETE /api/inventory/materias-primas/{id}/
  - PUT /api/inventory/materias-primas/{id}/stability-thresholds/
  - PUT /api/inventory/materias-primas/piezas-materiales/

- Movimientos:
  - GET /api/inventory/movimientos/
  - POST /api/inventory/movimientos/
  - GET /api/inventory/movimientos/{id}/
  - PUT/PATCH /api/inventory/movimientos/{id}/
  - DELETE /api/inventory/movimientos/{id}/

- Importacion de movimientos:
  - GET /api/inventory/movimientos/import/template/
  - POST /api/inventory/movimientos/import/preview/
  - POST /api/inventory/movimientos/import/commit/

## Production

Prefijo: /api/production/

- Proyectos:
  - GET /api/production/proyectos/
  - POST /api/production/proyectos/
  - GET /api/production/proyectos/{id}/
  - PUT/PATCH /api/production/proyectos/{id}/
  - DELETE /api/production/proyectos/{id}/

- Ordenes:
  - GET /api/production/ordenes/
  - POST /api/production/ordenes/
  - GET /api/production/ordenes/{id}/
  - PUT/PATCH /api/production/ordenes/{id}/
  - DELETE /api/production/ordenes/{id}/

- Piezas:
  - GET /api/production/piezas/
  - POST /api/production/piezas/
  - GET /api/production/piezas/{id}/
  - PUT/PATCH /api/production/piezas/{id}/
  - DELETE /api/production/piezas/{id}/

- Pieza materia prima:
  - GET /api/production/pieza-materias-primas/
  - POST /api/production/pieza-materias-primas/
  - GET /api/production/pieza-materias-primas/{id}/
  - PUT/PATCH /api/production/pieza-materias-primas/{id}/
  - DELETE /api/production/pieza-materias-primas/{id}/

- Pieza historial:
  - GET /api/production/pieza-historial/
  - POST /api/production/pieza-historial/
  - GET /api/production/pieza-historial/{id}/
  - PUT/PATCH /api/production/pieza-historial/{id}/
  - DELETE /api/production/pieza-historial/{id}/

## Nota

Este resumen esta orientado a navegacion rapida del equipo. Para contratos exactos de payload, se recomienda documentar serializers en la siguiente iteracion.
