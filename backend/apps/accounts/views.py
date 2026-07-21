"""Vistas REST de autenticación y administración de usuarios."""

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.accounts.models import AppUser
from apps.accounts.permissions import AdminWritePermission
from apps.accounts.serializers import AppUserSerializer, LoginSerializer, TokenRefreshSerializer
from apps.audit.services import create_audit_log


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


class CurrentUserView(APIView):
    """Retorna el perfil del usuario autenticado actual."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Serializa y devuelve el usuario resuelto por el backend auth."""
        serializer = AppUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AppUserViewSet(ModelViewSet):
    """CRUD de usuarios con escritura limitada a rol administrador."""

    permission_classes = [AdminWritePermission]
    queryset = AppUser.objects.all().order_by("id")
    serializer_class = AppUserSerializer

    def perform_destroy(self, instance):
        """Registra auditoría de eliminación antes de borrar usuario."""
        create_audit_log(instance, self.request.user)
        instance.delete()