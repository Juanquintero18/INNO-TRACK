"""Límites de frecuencia para los endpoints públicos de recuperación de contraseña."""

import hashlib

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class PasswordResetIPThrottle(AnonRateThrottle):
    """Limita cuántas solicitudes de recuperación puede hacer una misma IP."""

    scope = "password_reset"


class PasswordResetEmailThrottle(SimpleRateThrottle):
    """Evita inundar un mismo buzón aunque las solicitudes vengan de varias IP."""

    scope = "password_reset_email"

    def get_cache_key(self, request, view):
        data = request.data
        email = str(data.get("email", "") if hasattr(data, "get") else "").strip().lower()

        if not email:
            return None

        return self.cache_format % {
            "scope": self.scope,
            "ident": hashlib.sha256(email.encode("utf-8")).hexdigest(),
        }


class PasswordResetConfirmThrottle(AnonRateThrottle):
    """Limita los intentos de usar enlaces de recuperación desde una misma IP."""

    scope = "password_reset_confirm"
