"""Permisos basados en rol para operaciones de escritura.

Todas las clases permiten lectura en métodos seguros y restringen escritura
según el rol funcional definido en AppUser.rol.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


ROLE_ADMIN = "administrador"
ROLE_TRABAJADOR = "trabajador"
ROLE_ALMACENISTA = "almacenista"


class RoleBasedWritePermission(BasePermission):
    """Clase base reusable para validar escritura por conjunto de roles."""

    allowed_write_roles: set[str] = set()

    def has_permission(self, request, view):
        """Autoriza lectura para autenticados y escritura según allowed_write_roles."""
        user = getattr(request, "user", None)

        if user is None or not getattr(user, "is_authenticated", False):
            return False

        if request.method in SAFE_METHODS:
            return True

        return getattr(user, "rol", None) in self.allowed_write_roles


class AdminWritePermission(RoleBasedWritePermission):
    """Solo administradores pueden crear, editar o eliminar."""

    allowed_write_roles = {ROLE_ADMIN}


class AdminOrAlmacenistaWritePermission(RoleBasedWritePermission):
    """Permite escritura a administrador y almacenista."""

    allowed_write_roles = {ROLE_ADMIN, ROLE_ALMACENISTA}


class AdminOrTrabajadorWritePermission(RoleBasedWritePermission):
    """Permite escritura a administrador y trabajador de producción."""

    allowed_write_roles = {ROLE_ADMIN, ROLE_TRABAJADOR}