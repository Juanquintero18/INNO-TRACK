"""Vistas REST de autenticación y administración de usuarios."""

import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.accounts.models import AppUser
from apps.accounts.password_reset import send_password_changed_email, send_password_reset_email
from apps.accounts.permissions import AdminWritePermission
from apps.accounts.serializers import (
    AppUserSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    TokenRefreshSerializer,
)
from apps.accounts.throttling import (
    PasswordResetConfirmThrottle,
    PasswordResetEmailThrottle,
    PasswordResetIPThrottle,
)
from apps.audit.mixins import AuditedDestroyMixin


logger = logging.getLogger(__name__)


class LoginView(APIView):
    """Endpoint de login: valida credenciales y retorna token + usuario."""

    permission_classes = [AllowAny]

    def post(self, request):
        """Procesa autenticación inicial de un usuario."""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    """Endpoint para renovar token de acceso vigente."""

    permission_classes = [AllowAny]

    def post(self, request):
        """Emite un nuevo token a partir del token recibido."""
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """Solicita el correo de recuperación de contraseña.

    Responde lo mismo exista o no la cuenta, para no revelar qué correos están
    registrados en el sistema.
    """

    # Sin autenticación: un token vencido en el navegador no debe bloquear el flujo.
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetIPThrottle, PasswordResetEmailThrottle]

    def post(self, request):
        """Envía el enlace de recuperación si el correo pertenece a un usuario."""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for user in AppUser.objects.filter(email__iexact=serializer.validated_data["email"]):
            try:
                send_password_reset_email(user)
            except Exception:
                # El fallo se registra pero no se expone, para no delatar la cuenta.
                logger.exception("No se pudo enviar el correo de recuperacion al usuario %s.", user.pk)

        return Response(
            {"detail": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Define la nueva contraseña a partir del enlace recibido por correo."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmThrottle]

    def post(self, request):
        """Valida el enlace, guarda la contraseña y notifica al titular."""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        try:
            send_password_changed_email(user)
        except Exception:
            logger.exception("No se pudo enviar el aviso de cambio de contrasena al usuario %s.", user.pk)

        return Response(
            {"detail": "Tu contraseña fue actualizada. Ya puedes iniciar sesión."},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    """Retorna el perfil del usuario autenticado actual."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Serializa y devuelve el usuario resuelto por el backend auth."""
        serializer = AppUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AppUserViewSet(AuditedDestroyMixin, ModelViewSet):
    """CRUD de usuarios con escritura limitada a rol administrador y borrado auditado."""

    permission_classes = [AdminWritePermission]
    queryset = AppUser.objects.all().order_by("id")
    serializer_class = AppUserSerializer