#!/usr/bin/env python
"""Punto de entrada CLI para comandos de administración de Django."""

import os
import sys


def main() -> None:
    """Configura settings y delega ejecución al comando solicitado."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django no esta instalado o no se pudo importar. Activa tu entorno virtual e instala requirements.txt."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()