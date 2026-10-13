/**
 * Lógica de la importación masiva de movimientos desde Excel o CSV:
 * descarga de la plantilla, vista previa y confirmación.
 */
import { useState, type FormEvent } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { apiFetch, ENDPOINTS } from '@/lib/api';
import type { MovimientoImportCommitResult, MovimientoImportPreview } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

const IMPORT_URL = `${ENDPOINTS.movimientos}import/`;
const TEMPLATE_FILE_NAME = 'plantilla_movimientos_inventario.xlsx';

/** Sube el archivo al endpoint indicado como formulario multipart. */
function postFile(path: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch(path, { method: 'POST', body: formData });
}

/** Dispara la descarga de un archivo recibido como blob. */
function downloadBlob(blob: Blob, fileName: string) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = downloadUrl;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(downloadUrl);
}

export function useMovimientosImport() {
  const { refreshInventoryData } = useAppData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MovimientoImportPreview | null>(null);
  const [error, setError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const reset = () => {
    setSelectedFile(null);
    setPreview(null);
    setError('');
  };

  /** Cerrar con la X o Escape descarta el archivo; el botón Cancelar solo oculta el diálogo. */
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  /** Un archivo nuevo invalida la vista previa anterior. */
  const selectFile = (file: File | null) => {
    setSelectedFile(file);
    setPreview(null);
    setError('');
  };

  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    setError('');

    try {
      const response = await apiFetch(`${IMPORT_URL}template/`);

      if (!response.ok) {
        throw new Error('No se pudo descargar la plantilla de movimientos.');
      }

      downloadBlob(await response.blob(), TEMPLATE_FILE_NAME);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, 'No se pudo descargar la plantilla.'));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  /** Envía el archivo para validarlo y muestra la vista previa fila por fila. */
  const analyzeFile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Selecciona un archivo Excel o CSV antes de analizarlo.');
      return;
    }

    setIsPreviewLoading(true);
    setError('');

    try {
      const response = await postFile(`${IMPORT_URL}preview/`, selectedFile);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'No se pudo analizar el archivo.');
      }

      setPreview(payload as MovimientoImportPreview);
    } catch (previewError) {
      setPreview(null);
      setError(getErrorMessage(previewError, 'No se pudo analizar el archivo.'));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  /** Crea los movimientos del archivo ya validado y recarga el inventario. */
  const confirmImport = async () => {
    if (!selectedFile || !preview?.can_import) {
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const response = await postFile(`${IMPORT_URL}commit/`, selectedFile);
      const payload = await response.json();

      if (!response.ok) {
        // El backend devuelve la vista previa actualizada cuando el archivo dejó de ser válido.
        if (payload?.preview) {
          setPreview(payload.preview as MovimientoImportPreview);
        }
        throw new Error('Corrige los errores del archivo antes de importar definitivamente.');
      }

      const result = payload as MovimientoImportCommitResult;
      await refreshInventoryData();
      setIsOpen(false);
      reset();
      window.alert(`Se importaron ${result.created_count} movimientos correctamente.`);
    } catch (importError) {
      setError(getErrorMessage(importError, 'No se pudo completar la importación.'));
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isOpen,
    selectedFile,
    preview,
    error,
    isPreviewLoading,
    isImporting,
    isDownloadingTemplate,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    handleOpenChange,
    selectFile,
    downloadTemplate,
    analyzeFile,
    confirmImport,
  };
}

export type MovimientosImportController = ReturnType<typeof useMovimientosImport>;
