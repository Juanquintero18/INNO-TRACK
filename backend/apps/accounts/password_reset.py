"""Recuperación de contraseña por correo para usuarios de la aplicación.

El enlace enviado al usuario lleva un token firmado que:
- vence según `settings.PASSWORD_RESET_TIMEOUT`;
- deja de servir en cuanto la contraseña cambia (un solo uso);
- no requiere guardar nada en la base de datos.
"""

from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.password_validation import (
    UserAttributeSimilarityValidator,
    get_default_password_validators,
    validate_password,
)
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import format_html
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from apps.accounts.models import AppUser


class AppUserPasswordResetTokenGenerator(PasswordResetTokenGenerator):
    """Adapta el generador de Django a la tabla legacy `usuario`."""

    key_salt = "apps.accounts.password_reset.AppUserPasswordResetTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        # Incluir la contraseña vigente invalida el token apenas esta cambia.
        return f"{user.pk}{user.contrasena}{timestamp}{user.email or ''}"


password_reset_token_generator = AppUserPasswordResetTokenGenerator()


def build_password_reset_url(user: AppUser) -> str:
    """Arma el enlace del frontend donde el usuario define su nueva contraseña."""

    query = urlencode(
        {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": password_reset_token_generator.make_token(user),
        }
    )
    return f"{settings.FRONTEND_URL.rstrip('/')}/restablecer-contrasena?{query}"


def get_user_for_reset(uid: str, token: str) -> AppUser | None:
    """Retorna el usuario solo si el enlace es auténtico y sigue vigente."""

    try:
        user_id = int(force_str(urlsafe_base64_decode(uid)))
    except (TypeError, ValueError, OverflowError):
        return None

    user = AppUser.objects.filter(pk=user_id).first()

    if user is None or not password_reset_token_generator.check_token(user, token):
        return None

    return user


def validate_new_password(password: str, user: AppUser) -> None:
    """Aplica AUTH_PASSWORD_VALIDATORS comparando contra los campos de AppUser."""

    validators = [
        UserAttributeSimilarityValidator(user_attributes=("nombre", "apellido", "email"))
        if isinstance(validator, UserAttributeSimilarityValidator)
        else validator
        for validator in get_default_password_validators()
    ]
    validate_password(password, user=user, password_validators=validators)


def send_password_reset_email(user: AppUser) -> None:
    """Envía el correo con el enlace para restablecer la contraseña."""

    url = build_password_reset_url(user)
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60

    message = (
        f"Hola {user.nombre},\n\n"
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta de INNO-TRACK.\n\n"
        "Abre este enlace para crear una contraseña nueva:\n"
        f"{url}\n\n"
        f"El enlace vence en {minutes} minutos y solo se puede usar una vez.\n\n"
        "Si no hiciste esta solicitud, ignora este correo: tu contraseña actual seguirá funcionando.\n"
    )
    html_message = format_html(
        "<p>Hola {},</p>"
        "<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de INNO-TRACK.</p>"
        '<p><a href="{}">Crear una contraseña nueva</a></p>'
        "<p>El enlace vence en {} minutos y solo se puede usar una vez.</p>"
        "<p>Si no hiciste esta solicitud, ignora este correo: tu contraseña actual seguirá funcionando.</p>",
        user.nombre,
        url,
        minutes,
    )

    send_mail(
        subject="Restablece tu contraseña de INNO-TRACK",
        message=message,
        from_email=None,
        recipient_list=[user.email],
        html_message=html_message,
    )


def send_password_changed_email(user: AppUser) -> None:
    """Avisa al titular de la cuenta que su contraseña fue cambiada."""

    changed_at = timezone.localtime().strftime("%d/%m/%Y a las %H:%M")

    send_mail(
        subject="Tu contraseña de INNO-TRACK fue cambiada",
        message=(
            f"Hola {user.nombre},\n\n"
            f"La contraseña de tu cuenta de INNO-TRACK se cambió el {changed_at} (hora de Colombia).\n\n"
            "Si no fuiste tú, avisa de inmediato al administrador del sistema.\n"
        ),
        from_email=None,
        recipient_list=[user.email],
    )
