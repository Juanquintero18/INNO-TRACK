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
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = AppUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AppUserViewSet(ModelViewSet):
    permission_classes = [AdminWritePermission]
    queryset = AppUser.objects.all().order_by("id")
    serializer_class = AppUserSerializer

    def perform_destroy(self, instance):
        create_audit_log(instance, self.request.user)
        instance.delete()