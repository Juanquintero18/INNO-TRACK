"""Comando de mantenimiento para migrar contraseñas legacy a hash Django."""

from django.contrib.auth.hashers import identify_hasher, make_password
from django.core.management.base import BaseCommand

from apps.accounts.models import AppUser


class Command(BaseCommand):
    help = "Convierte contrasenas en texto plano de la tabla usuario a hashes compatibles con Django."

    def handle(self, *args, **options):
        """Recorre usuarios y hashea únicamente las contraseñas no hasheadas."""
        updated = 0

        for user in AppUser.objects.all():
            password = user.contrasena or ""

            try:
                identify_hasher(password)
                continue
            except Exception:
                # Si no tiene formato de hash reconocido, se migra a hash seguro.
                user.contrasena = make_password(password)
                user.save(update_fields=["contrasena"])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Contrasenas actualizadas: {updated}"))