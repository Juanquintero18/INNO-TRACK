"""Importación masiva de usuarios para el motor de `apps.common.importing`.

El Excel no lleva contraseñas: guardarlas en una hoja de cálculo las expone a
cualquiera que reciba el archivo. Los usuarios importados quedan con una
contraseña inutilizable y la definen ellos mismos desde "¿Olvidaste tu
contraseña?" en el inicio de sesión.
"""

from __future__ import annotations

from django.contrib.auth.hashers import make_password

from apps.accounts.models import AppUser
from apps.accounts.permissions import ROLE_ADMIN, ROLE_ALMACENISTA, ROLE_TRABAJADOR
from apps.accounts.serializers import AppUserSerializer
from apps.common.importing import DuplicateTracker, ImportSpec, RowResult, email_format_error, normalize_lookup_key


ROLES = (ROLE_ADMIN, ROLE_ALMACENISTA, ROLE_TRABAJADOR)


class UsuarioImportSpec(ImportSpec):
    """Usuarios de la aplicación. Las mismas reglas del formulario, sin la contraseña."""

    headers = ["nombre", "apellido", "email", "rol"]
    aliases = {
        "nombres": "nombre",
        "apellidos": "apellido",
        "correo": "email",
        "correo electronico": "email",
        "e-mail": "email",
        "mail": "email",
        "usuario": "email",
        "perfil": "rol",
        "rol usuario": "rol",
        "rol del usuario": "rol",
    }
    sheet_title = "usuarios"
    template_file_name = "plantilla_usuarios.xlsx"
    example_rows = [
        ["Laura", "Gómez", "laura.gomez@innolution.com", "almacenista"],
        ["Andrés", "Villa", "andres.villa@innolution.com", "trabajador"],
    ]

    REQUIRED_MESSAGES = {
        "nombre": "El nombre es obligatorio.",
        "apellido": "El apellido es obligatorio.",
        "email": "El correo es obligatorio.",
        "rol": "El rol es obligatorio.",
    }

    def new_context(self) -> DuplicateTracker:
        return DuplicateTracker(AppUser.objects.values_list("email", flat=True), "el correo")

    def validate_row(self, values, raw_row, emails: DuplicateTracker) -> RowResult:
        datos = {campo: values[campo].strip() for campo in self.headers}
        errors = [self.REQUIRED_MESSAGES[campo] for campo, valor in datos.items() if not valor]

        if datos["email"]:
            error_email = email_format_error(datos["email"]) or emails.check(datos["email"])
            if error_email:
                errors.append(error_email)

        if datos["rol"]:
            # Acepta "Administrador", "ALMACENISTA", etc.; se guarda siempre en minúsculas.
            rol = normalize_lookup_key(datos["rol"])
            if rol in ROLES:
                datos["rol"] = rol
            else:
                errors.append(f"El rol '{datos['rol']}' no existe. Usa administrador, almacenista o trabajador.")

        return RowResult(errors=errors, payload=None if errors else datos)

    def save(self, payload, user):
        serializer = AppUserSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        # make_password(None) produce una contraseña inutilizable hasta que el usuario la restablezca.
        return AppUser.objects.create(**serializer.validated_data, contrasena=make_password(None))


USUARIOS_IMPORT = UsuarioImportSpec()
