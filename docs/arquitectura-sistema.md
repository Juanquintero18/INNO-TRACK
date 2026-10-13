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

## 4.4 Organizacion del codigo

El frontend separa lo que se ve de la logica y de las reglas del dominio:

- src/pages/: una pantalla por ruta. Solo guarda filtros y orden, y compone las piezas de su modulo.
- src/features/<modulo>/: lo propio de cada modulo.
  - use<Algo>Form.ts: logica de un formulario (validacion, guardado, apertura y cierre).
  - <Algo>Dialog(s).tsx y <Algo>Table.tsx: vistas sin logica de negocio; reciben el controlador del hook.
  - <modulo>-list.ts o -utils.ts: funciones puras de filtro, orden y hojas de Excel.
- src/components/data/ y src/components/form/: piezas compartidas (encabezado ordenable, busqueda, rango de fechas, campos, dialogo de formulario).
- src/hooks/: useSort, useFormState y useModulePermission.
- src/lib/: cliente API y rutas (api.ts), fechas (dates.ts), orden (sorting.ts), reglas del dominio (domain-utils.ts), exportacion (excel-export.ts) y tipos (types.ts).

Regla de los dialogos: cerrar con la X o Escape limpia el formulario; el boton Cancelar solo lo oculta. Es el comportamiento historico y las pruebas lo fijan.

En el backend, la logica que no es de serializacion vive fuera de los serializers:

- apps/production/historial.py: construccion y lectura del historial de cambios de piezas.
- apps/inventory/services.py: efecto de un movimiento sobre el stock y materiales habilitados para piezas.
- apps/audit/mixins.py: AuditedDestroyMixin, para los ViewSets cuyo borrado queda en auditoria.

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

## 8. Pruebas

Las pruebas fijan el comportamiento actual del sistema: si un cambio lo altera, fallan.

Frontend (`npm run test`):

- src/pages/*.test.tsx montan la aplicacion completa en cada ruta contra una API falsa en memoria (src/test/fake-api.ts) y comparan lo que se ve, lo que se envia al backend, los avisos y las hojas de Excel con las capturas de src/pages/__snapshots__/.
- Si un cambio de interfaz es intencional, las capturas se regraban con `npx vitest run -u` y se revisa el diff antes de confirmarlo.

Backend (`./.venv/Scripts/python.exe backend/manage.py test apps --settings=config.settings_test`):

- Usan SQLite en memoria; no tocan PostgreSQL.
- Comparan cada respuesta de la API con su archivo en backend/tests_golden/. Para regrabar una respuesta a proposito, se borra su archivo y se vuelve a ejecutar la prueba.

## 9. Siguiente iteracion recomendada

Para continuar la documentacion sin tocar logica:

1. Documentar modelos y relaciones por app (campos clave y reglas).
2. Documentar serializers con contratos de entrada/salida.
3. Documentar cada pagina del frontend con sus dependencias de contexto.
