from django.db import models


class AuditLog(models.Model):
    ACTION_DELETE = "delete"

    ENTITY_PIEZA = "pieza"
    ENTITY_MATERIA_PRIMA = "materia-prima"
    ENTITY_MOVIMIENTO = "movimiento-inventario"
    ENTITY_PROVEEDOR = "proveedor"
    ENTITY_TRABAJADOR = "trabajador"
    ENTITY_USUARIO = "usuario"

    ACTION_CHOICES = [
        (ACTION_DELETE, "Eliminacion"),
    ]

    ENTITY_CHOICES = [
        (ENTITY_PIEZA, "Pieza"),
        (ENTITY_MATERIA_PRIMA, "Materia prima"),
        (ENTITY_MOVIMIENTO, "Movimiento de inventario"),
        (ENTITY_PROVEEDOR, "Proveedor"),
        (ENTITY_TRABAJADOR, "Trabajador"),
        (ENTITY_USUARIO, "Usuario"),
    ]

    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default=ACTION_DELETE)
    entity_type = models.CharField(max_length=50, choices=ENTITY_CHOICES)
    entity_id = models.IntegerField()
    entity_label = models.CharField(max_length=255)
    snapshot = models.JSONField()
    deleted_at = models.DateTimeField(auto_now_add=True)
    deleted_by_id = models.IntegerField(blank=True, null=True)
    deleted_by_nombre = models.CharField(max_length=255, blank=True)
    restored_at = models.DateTimeField(blank=True, null=True)
    restored_by_id = models.IntegerField(blank=True, null=True)
    restored_by_nombre = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "auditoria_eliminacion"
        ordering = ["-deleted_at", "-id"]
        indexes = [
            models.Index(fields=["entity_type"], name="audit_entity_type_idx"),
            models.Index(fields=["entity_id"], name="audit_entity_id_idx"),
            models.Index(fields=["deleted_at"], name="audit_deleted_at_idx"),
            models.Index(fields=["restored_at"], name="audit_restored_at_idx"),
            models.Index(fields=["entity_type", "entity_id"], name="audit_entity_pair_idx"),
        ]

