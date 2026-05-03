from rest_framework.permissions import SAFE_METHODS, BasePermission


ROLE_ADMIN = "administrador"
ROLE_TRABAJADOR = "trabajador"
ROLE_ALMACENISTA = "almacenista"


class RoleBasedWritePermission(BasePermission):
    allowed_write_roles: set[str] = set()

    def has_permission(self, request, view):
        user = getattr(request, "user", None)

        if user is None or not getattr(user, "is_authenticated", False):
            return False

        if request.method in SAFE_METHODS:
            return True

        return getattr(user, "rol", None) in self.allowed_write_roles


class AdminWritePermission(RoleBasedWritePermission):
    allowed_write_roles = {ROLE_ADMIN}


class AdminOrAlmacenistaWritePermission(RoleBasedWritePermission):
    allowed_write_roles = {ROLE_ADMIN, ROLE_ALMACENISTA}


class AdminOrTrabajadorWritePermission(RoleBasedWritePermission):
    allowed_write_roles = {ROLE_ADMIN, ROLE_TRABAJADOR}