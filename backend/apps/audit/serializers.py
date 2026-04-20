from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditActorSerializer(serializers.Serializer):
    id = serializers.IntegerField(allow_null=True)
    nombre = serializers.CharField(allow_blank=True)


class AuditLogSerializer(serializers.ModelSerializer):
    deletedBy = serializers.SerializerMethodField()
    restoredBy = serializers.SerializerMethodField()
    entityType = serializers.CharField(source="entity_type")
    entityId = serializers.IntegerField(source="entity_id")
    entityLabel = serializers.CharField(source="entity_label")
    deletedAt = serializers.DateTimeField(source="deleted_at")
    restoredAt = serializers.DateTimeField(source="restored_at", allow_null=True)
    data = serializers.JSONField(source="snapshot")
    isRestored = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "action",
            "entityType",
            "entityId",
            "entityLabel",
            "deletedAt",
            "deletedBy",
            "restoredAt",
            "restoredBy",
            "isRestored",
            "data",
        ]

    def get_deletedBy(self, obj: AuditLog):
        return {
            "id": obj.deleted_by_id,
            "nombre": obj.deleted_by_nombre,
        }

    def get_restoredBy(self, obj: AuditLog):
        return {
            "id": obj.restored_by_id,
            "nombre": obj.restored_by_nombre,
        } if obj.restored_at else None

    def get_isRestored(self, obj: AuditLog):
        return obj.restored_at is not None
