from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[("delete", "Eliminacion")], default="delete", max_length=20)),
                (
                    "entity_type",
                    models.CharField(
                        choices=[
                            ("pieza", "Pieza"),
                            ("materia-prima", "Materia prima"),
                            ("movimiento-inventario", "Movimiento de inventario"),
                            ("proveedor", "Proveedor"),
                            ("trabajador", "Trabajador"),
                            ("usuario", "Usuario"),
                        ],
                        max_length=50,
                    ),
                ),
                ("entity_id", models.IntegerField()),
                ("entity_label", models.CharField(max_length=255)),
                ("snapshot", models.JSONField()),
                ("deleted_at", models.DateTimeField(auto_now_add=True)),
                ("deleted_by_id", models.IntegerField(blank=True, null=True)),
                ("deleted_by_nombre", models.CharField(blank=True, max_length=255)),
                ("restored_at", models.DateTimeField(blank=True, null=True)),
                ("restored_by_id", models.IntegerField(blank=True, null=True)),
                ("restored_by_nombre", models.CharField(blank=True, max_length=255)),
            ],
            options={
                "db_table": "auditoria_eliminacion",
                "ordering": ["-deleted_at", "-id"],
            },
        ),
    ]