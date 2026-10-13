"""Configuración para pruebas automatizadas.

Las tablas del dominio son legacy (`managed = False`) y varias migraciones
dependen de que ya existan, así que las pruebas no pueden construir la base
con `migrate`. Aquí se usa SQLite en memoria, sin migraciones, y el runner
crea todas las tablas a partir de los modelos.

Uso: python backend/manage.py test apps --settings=config.settings_test
"""

from config.settings import *  # noqa: F401,F403
from config.settings import INSTALLED_APPS


SECRET_KEY = "clave-solo-para-pruebas"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

MIGRATION_MODULES = {app.rsplit(".", 1)[-1]: None for app in INSTALLED_APPS}

TEST_RUNNER = "config.test_runner.LegacyTablesTestRunner"

FRONTEND_URL = "http://frontend.test"

# Hash rápido: las pruebas crean muchos usuarios y no necesitan uno costoso.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
