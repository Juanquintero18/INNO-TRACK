"""Mixins de auditoría para los ViewSets de dominio."""

from apps.audit.services import create_audit_log


class AuditedDestroyMixin:
    """Guarda en la auditoría una copia del registro antes de eliminarlo.

    Solo sirve para modelos registrados en `apps.audit.services.AUDITED_MODELS`.
    """

    def perform_destroy(self, instance):
        create_audit_log(instance, self.request.user)
        instance.delete()
