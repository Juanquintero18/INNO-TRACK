"""Vistas de consulta y restauración de registros auditados."""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import AdminWritePermission
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer
from apps.audit.services import restore_audit_log


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Expone logs de auditoría y acción de restauración por registro."""

    permission_classes = [AdminWritePermission]
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Restaura entidad original desde snapshot del log seleccionado."""
        audit_log = self.get_object()

        try:
            result = restore_audit_log(audit_log, request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "detail": "Registro restaurado correctamente.",
                "entityType": result.entity_type,
                "entityId": result.entity_id,
            },
            status=status.HTTP_200_OK,
        )
