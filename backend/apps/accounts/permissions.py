from rest_framework.permissions import SAFE_METHODS, BasePermission


class AdminWritePermission(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)

        if user is None or not getattr(user, "is_authenticated", False):
            return False

        if request.method in SAFE_METHODS:
            return True

        return getattr(user, "rol", None) == "administrador"