"""Endpoints de importación (plantilla, vista previa y confirmación) para cualquier `ImportSpec`."""

from django.urls import path
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.importing import ImportSpec, analyze_import, build_template_response, run_import


class ImportTemplateView(APIView):
    """Entrega la plantilla de ejemplo de la importación."""

    spec: ImportSpec | None = None

    def get(self, _request):
        return build_template_response(self.spec)


class ImportUploadView(APIView):
    """Base de los endpoints que reciben el archivo como formulario multipart."""

    spec: ImportSpec | None = None
    parser_classes = [MultiPartParser, FormParser]

    def read_upload(self) -> tuple[str, bytes]:
        """Nombre y contenido del archivo subido; responde 400 si no llegó ninguno."""
        uploaded_file = self.request.FILES.get("file")
        if uploaded_file is None:
            raise ValidationError({"detail": "Selecciona un archivo Excel o CSV."})
        return uploaded_file.name, uploaded_file.read()


class ImportPreviewView(ImportUploadView):
    """Valida el archivo y retorna la vista previa fila por fila, sin guardar nada."""

    def post(self, request):
        file_name, file_bytes = self.read_upload()

        try:
            preview, _payloads = analyze_import(self.spec, file_name, file_bytes)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(preview, status=status.HTTP_200_OK)


class ImportCommitView(ImportUploadView):
    """Confirma la importación y crea todos los registros en una sola transacción."""

    def post(self, request):
        file_name, file_bytes = self.read_upload()

        try:
            result = run_import(self.spec, file_name, file_bytes, request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not result["preview"]["can_import"]:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_201_CREATED)


def import_urls(prefix: str, spec: ImportSpec, permission_class, name: str) -> list:
    """Rutas `<prefix>/import/template|preview|commit/` de una importación.

    Deben ir antes de las rutas del router, para que `import/` no se tome como un ID.
    """
    options = {"spec": spec, "permission_classes": [permission_class]}

    return [
        path(f"{prefix}/import/template/", ImportTemplateView.as_view(**options), name=f"{name}-import-template"),
        path(f"{prefix}/import/preview/", ImportPreviewView.as_view(**options), name=f"{name}-import-preview"),
        path(f"{prefix}/import/commit/", ImportCommitView.as_view(**options), name=f"{name}-import-commit"),
    ]
