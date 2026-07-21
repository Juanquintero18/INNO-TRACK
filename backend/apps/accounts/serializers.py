"""Serializers de autenticación y usuarios del dominio accounts.

Este módulo concentra:
- Serialización de usuario para CRUD.
- Validación de credenciales de inicio de sesión.
- Renovación de token de acceso para sesiones activas.
"""

from rest_framework import serializers
from django.contrib.auth.hashers import check_password, identify_hasher
from django.contrib.auth.hashers import make_password

from apps.accounts.authentication import build_access_token, read_access_token
from apps.accounts.models import AppUser


class AppUserSerializer(serializers.ModelSerializer):
    """Serializa usuarios y aplica hash de contraseña al crear/editar."""

    contrasena = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = AppUser
        fields = ["id", "nombre", "apellido", "email", "rol", "contrasena"]

    def create(self, validated_data):
        """Crea el usuario garantizando que la contraseña no quede en texto plano."""
        password = validated_data.pop("contrasena", "")
        if not password:
            raise serializers.ValidationError({"contrasena": "La contraseña es obligatoria."})
        validated_data["contrasena"] = make_password(password)
        return AppUser.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """Actualiza campos del usuario y re-hashea contraseña si se envía."""
        password = validated_data.pop("contrasena", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.contrasena = make_password(password)

        instance.save()
        return instance


def password_matches(raw_password: str, stored_password: str) -> bool:
    """Valida contraseña soportando hashes Django y valores legacy en texto plano."""

    if not stored_password:
        return False

    try:
        identify_hasher(stored_password)
        return check_password(raw_password, stored_password)
    except Exception:
        # Compatibilidad con registros históricos no hasheados.
        return raw_password == stored_password


class LoginSerializer(serializers.Serializer):
    """Valida credenciales y retorna token + usuario serializado."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        """Autentica al usuario contra la tabla real y emite token de acceso."""
        email = attrs["email"]
        password = attrs["password"]

        try:
            user = AppUser.objects.get(email=email)
        except AppUser.DoesNotExist as exc:
            raise serializers.ValidationError("Credenciales incorrectas.") from exc

        if not password_matches(password, user.contrasena):
            raise serializers.ValidationError("Credenciales incorrectas.")

        return {
            "access": build_access_token(user),
            "user": AppUserSerializer(user).data,
        }


class TokenRefreshSerializer(serializers.Serializer):
    """Renueva el token de acceso a partir de un token vigente."""

    token = serializers.CharField()

    def validate(self, attrs):
        """Lee el token recibido, valida usuario asociado y emite uno nuevo."""
        token = attrs["token"]
        payload = read_access_token(token)

        try:
            user = AppUser.objects.get(pk=payload["user_id"])
        except AppUser.DoesNotExist as exc:
            raise serializers.ValidationError("El usuario del token no existe.") from exc

        return {
            "access": build_access_token(user),
            "user": AppUserSerializer(user).data,
        }