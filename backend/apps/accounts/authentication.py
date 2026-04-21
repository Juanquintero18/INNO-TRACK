from django.conf import settings
from django.core import signing
from django.core.signing import BadSignature, SignatureExpired
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.models import AppUser


TOKEN_SALT = "accounts.api.token"


def build_access_token(user: AppUser) -> str:
    payload = {
        "user_id": user.pk,
        "email": user.email,
        "rol": user.rol,
    }
    return signing.dumps(payload, salt=TOKEN_SALT)


def read_access_token(token: str) -> dict:
    max_age = getattr(settings, "API_TOKEN_MAX_AGE_SECONDS", 60 * 60 * 8)
    return signing.loads(token, salt=TOKEN_SALT, max_age=max_age)


class AppUserTokenAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth = get_authorization_header(request).split()

        if not auth:
            return None

        if auth[0].decode("utf-8") != self.keyword:
            return None

        if len(auth) != 2:
            raise AuthenticationFailed("Token invalido.")

        token = auth[1].decode("utf-8")

        try:
            payload = read_access_token(token)
        except SignatureExpired as exc:
            raise AuthenticationFailed("El token expiro.") from exc
        except BadSignature as exc:
            raise AuthenticationFailed("El token no es valido.") from exc

        try:
            user = AppUser.objects.get(pk=payload["user_id"])
        except AppUser.DoesNotExist as exc:
            raise AuthenticationFailed("El usuario del token no existe.") from exc

        return user, token