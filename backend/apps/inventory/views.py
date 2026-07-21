"""Vistas REST del módulo de inventario.

Incluye CRUD de catálogos, movimientos y endpoints de importación masiva.
"""

from django.db import transaction
from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import AdminOrAlmacenistaWritePermission, AdminWritePermission
from apps.audit.services import create_audit_log
from apps.inventory.import_services import (
    build_movimiento_import_preview,
    build_movimiento_import_template_response,
    import_movimientos,
)
from apps.inventory.models import (
    DEFAULT_STOCK_BAJO_MAX,
    DEFAULT_STOCK_CRITICO_MAX,
    MateriaPrima,
    MateriaPrimaPiezaConfig,
    MateriaPrimaStabilityThreshold,
    MovimientoInventario,
    Proveedor,
    TrabajadorProduccion,
    UnidadMedida,
)
from apps.inventory.serializers import (
    MateriaPrimaSerializer,
    MateriaPrimaPiezasMaterialesSerializer,
    MateriaPrimaStabilityThresholdSerializer,
    MovimientoInventarioSerializer,
    ProveedorSerializer,
    TrabajadorProduccionSerializer,
    UnidadMedidaSerializer,
)


class BaseInventoryViewSet(ModelViewSet):
    """Base CRUD con borrado auditado para entidades de inventario."""

    permission_classes = [AdminWritePermission]

    def perform_destroy(self, instance):
        """Registra auditoría antes de eliminar definitivamente."""
        create_audit_log(instance, self.request.user)
        instance.delete()


class UnidadMedidaViewSet(BaseInventoryViewSet):
    """CRUD de unidades de medida."""

    queryset = UnidadMedida.objects.all()
    serializer_class = UnidadMedidaSerializer


class ProveedorViewSet(BaseInventoryViewSet):
    """CRUD de proveedores con escritura para admin/almacenista."""

    permission_classes = [AdminOrAlmacenistaWritePermission]
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer


class TrabajadorProduccionViewSet(BaseInventoryViewSet):
    """CRUD del catálogo de trabajadores de producción."""

    queryset = TrabajadorProduccion.objects.all()
    serializer_class = TrabajadorProduccionSerializer


class MateriaPrimaViewSet(BaseInventoryViewSet):
    """CRUD de materias primas y acciones de configuración asociadas."""

    permission_classes = [AdminOrAlmacenistaWritePermission]
    queryset = MateriaPrima.objects.select_related("unidad_medida", "stability_config", "pieza_config").annotate(
        piezas_usage_count=Count("piezas_materia_prima", distinct=True)
    ).all().order_by("id")
    serializer_class = MateriaPrimaSerializer

    @action(detail=True, methods=["put"], url_path="stability-thresholds")
    def stability_thresholds(self, request, pk=None):
        """Actualiza umbrales de estabilidad de una materia prima puntual."""
        materia = self.get_object()
        config, _created = MateriaPrimaStabilityThreshold.objects.get_or_create(
            materia_prima=materia,
            defaults={
                "stock_critico_max": DEFAULT_STOCK_CRITICO_MAX,
                "stock_bajo_max": DEFAULT_STOCK_BAJO_MAX,
            },
        )
        serializer = MateriaPrimaStabilityThresholdSerializer(config, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        materia.refresh_from_db()
        return Response(MateriaPrimaSerializer(materia).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["put"], url_path="piezas-materiales", permission_classes=[AdminWritePermission])
    def piezas_materiales(self, request):
        """Define qué materias primas quedan habilitadas para nuevas piezas."""
        serializer = MateriaPrimaPiezasMaterialesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        enabled_ids = set(serializer.validated_data["enabled_materia_ids"])
        existing_ids = set(MateriaPrima.objects.values_list("id", flat=True))
        unknown_ids = sorted(enabled_ids - existing_ids)

        # Se valida antes de la transacción para no dejar cambios parciales por IDs inválidos.
        if unknown_ids:
            unknown_text = ", ".join(str(item) for item in unknown_ids)
            return Response(
                {"enabled_materia_ids": [f"Hay materias primas inexistentes en la selección: {unknown_text}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        disabled_ids = existing_ids - enabled_ids

        with transaction.atomic():
            # Ausencia de config = habilitada. Solo persistimos explícitamente las deshabilitadas.
            MateriaPrimaPiezaConfig.objects.filter(materia_prima_id__in=enabled_ids).delete()

            for materia_id in disabled_ids:
                MateriaPrimaPiezaConfig.objects.update_or_create(
                    materia_prima_id=materia_id,
                    defaults={"enabled_for_piezas": False},
                )

        # Respuesta autoritativa para sincronizar el estado completo en frontend.
        refreshed_data = MateriaPrimaSerializer(self.get_queryset(), many=True).data
        return Response(refreshed_data, status=status.HTTP_200_OK)


class MovimientoInventarioViewSet(BaseInventoryViewSet):
    """CRUD de movimientos; fija usuario actor en create/update."""

    permission_classes = [AdminOrAlmacenistaWritePermission]
    queryset = MovimientoInventario.objects.select_related(
        "materia_prima",
        "proveedor",
        "usuario",
        "trabajador_produccion",
    ).all()
    serializer_class = MovimientoInventarioSerializer

    def perform_create(self, serializer):
        """Asigna automáticamente el usuario autenticado al crear."""
        serializer.save(usuario=self.request.user)

    def perform_update(self, serializer):
        """Actualiza usuario actor en cada modificación de movimiento."""
        serializer.save(usuario=self.request.user)


class MovimientoInventarioImportBaseView(APIView):
    """Base para endpoints de importación con parser multipart."""

    permission_classes = [AdminOrAlmacenistaWritePermission]
    parser_classes = [MultiPartParser, FormParser]

    def _get_uploaded_file(self):
        """Obtiene el archivo subido o responde con error de validación."""
        uploaded_file = self.request.FILES.get("file")
        if uploaded_file is None:
            return None, Response({"detail": "Selecciona un archivo Excel o CSV."}, status=status.HTTP_400_BAD_REQUEST)
        return uploaded_file, None


class MovimientoInventarioImportTemplateView(APIView):
    """Entrega plantilla oficial de importación de movimientos."""

    permission_classes = [AdminOrAlmacenistaWritePermission]

    def get(self, _request):
        """Descarga de archivo ejemplo para carga masiva."""
        return build_movimiento_import_template_response()


class MovimientoInventarioImportPreviewView(MovimientoInventarioImportBaseView):
    """Valida archivo de importación y retorna vista previa detallada."""

    def post(self, request):
        uploaded_file, error_response = self._get_uploaded_file()
        if error_response is not None:
            return error_response

        try:
            preview = build_movimiento_import_preview(uploaded_file.name, uploaded_file.read())
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(preview, status=status.HTTP_200_OK)


class MovimientoInventarioImportCommitView(MovimientoInventarioImportBaseView):
    """Confirma importación y crea movimientos en lote atómico."""

    def post(self, request):
        uploaded_file, error_response = self._get_uploaded_file()
        if error_response is not None:
            return error_response

        try:
            result = import_movimientos(uploaded_file.name, uploaded_file.read(), request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not result["preview"]["can_import"]:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_201_CREATED)