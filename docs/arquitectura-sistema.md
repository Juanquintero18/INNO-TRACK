# Arquitectura del sistema INNO_TRACK

Fecha: 2026-07-18
Alcance: panorama general de frontend, backend, autenticacion y flujo principal de datos.

## 1. Vision general

INNO_TRACK esta compuesto por dos bloques principales:

- Frontend SPA en React + TypeScript (Vite).
- Backend API REST en Django + Django REST Framework.

La persistencia de datos se realiza en PostgreSQL. El frontend consume la API usando peticiones HTTP con token Bearer.

## 2. Estructura de alto nivel

- src/: aplicacion frontend.
- backend/: proyecto Django con apps de dominio.
- public/: recursos estaticos del frontend.

## 3. Backend (Django)

## 3.1 Punto de entrada

El enrutador principal define:

- Healthcheck en /health/.
- Autenticacion en /api/auth/login/ y /api/auth/refresh/.
- Usuario actual en /api/me/.
- Rutas por modulo en /api/accounts/, /api/audit/, /api/inventory/, /api/production/.

## 3.2 Modulos de dominio

- accounts:
  - Login, refresh de token y consulta de usuario actual.
  - CRUD de usuarios.
- audit:
  - Consulta de logs de eliminacion.
  - Restauracion de entidades eliminadas.
- inventory:
  - Catalogos: unidades de medida, proveedores, trabajadores, materias primas.
  - Movimientos de inventario.
  - Importacion de movimientos (template, preview, commit).
- production:
  - Proyectos, ordenes y piezas.
  - Relacion pieza-materia prima.
  - Historial de cambios de piezas.

## 3.3 Permisos por rol (escritura)

Reglas de escritura detectadas:

- administrador:
  - Puede escribir en todos los modulos.
- trabajador:
  - Puede escribir en modulos de produccion donde se aplica AdminOrTrabajadorWritePermission.
- almacenista:
  - Puede escribir en endpoints con AdminOrAlmacenistaWritePermission (inventario, proveedores, materias primas y movimientos segun vista).

Nota: las operaciones de lectura permiten acceso autenticado general (segun configuracion y permisos de cada vista).

## 3.4 Configuracion relevante

Variables backend importantes:

- DJANGO_SECRET_KEY
- DJANGO_DEBUG
- DJANGO_ALLOWED_HOSTS
- DB_NAME
- DB_USER
- DB_PASSWORD
- DB_HOST
- DB_PORT
- API_TOKEN_MAX_AGE_SECONDS
- CORS_ALLOWED_ORIGINS

## 4. Frontend (React)

## 4.1 Inicializacion

- main.tsx monta App en el elemento root.
- App.tsx monta providers globales y el arbol de rutas.

## 4.2 Providers principales

- AuthProvider:
  - Maneja sesion, login/logout y reglas de acceso por modulo.
  - Rehidrata usuario con /api/me/ al iniciar.
- AppDataProvider:
  - Centraliza listas maestras de inventario, produccion, usuarios y auditoria.
  - Expone helpers como deleteEntity, restoreDeletedItem y getStockLevel.

## 4.3 Cliente API

El cliente de API:

- Usa VITE_API_BASE_URL (fallback a http://127.0.0.1:8000).
- Adjunta Authorization: Bearer token cuando aplica.
- Normaliza mensajes de error para UI.

## 5. Flujo de autenticacion

1. Usuario envia email y password desde Login.
2. Frontend hace POST a /api/auth/login/.
3. Backend retorna token de acceso y usuario serializado.
4. Frontend guarda token en localStorage.
5. Frontend consume /api/me/ para validar sesion al recargar.
6. Si /api/me/ falla, se limpia token y sesion local.

## 6. Flujo operativo principal

- Inventario:
  - Se cargan unidades, materias primas, movimientos, proveedores y trabajadores.
  - El stock se calcula en frontend con entradas - salidas + ajustes.
- Produccion:
  - Se cargan usuarios, proyectos, ordenes y piezas.
- Auditoria:
  - Se consumen logs restaurables.
  - Al restaurar una entidad se refrescan los modulos impactados.

## 7. Comandos de trabajo (resumen)

Frontend:

- npm i
- npm run dev
- npm run test

Backend:

- ./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
- ./.venv/Scripts/python.exe backend/manage.py migrate
- ./.venv/Scripts/python.exe backend/manage.py runserver --noreload

## 8. Siguiente iteracion recomendada

Para continuar la documentacion sin tocar logica:

1. Documentar modelos y relaciones por app (campos clave y reglas).
2. Documentar serializers con contratos de entrada/salida.
3. Documentar cada pagina del frontend con sus dependencias de contexto.
4. Agregar guia de pruebas (frontend y backend) con casos minimos.
