/**
 * Lógica de una importación masiva desde Excel o CSV: descarga de la
 * plantilla, vista previa y confirmación.
 *
 * Sirve para cualquier recurso cuyo backend exponga
 * `<recurso>/import/template|preview|commit/` (ver backend/apps/common/import_views.py).
 */
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import type { ImportCommitResult, ImportPreview } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

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

interface UseExcelImportOptions {
  /** Ruta del recurso en la API, por ejemplo `/api/inventory/proveedores/`. */
  resourcePath: string;
  /** Nombre con el que se guarda la plantilla descargada. */
  templateFileName: string;
  /** Mensaje de éxito, según cuántos registros se crearon. */
  successMessage: (createdCount: number) => string;
  /** Recarga los datos afectados después de importar. */
  onImported: () => Promise<void>;
}

export function useExcelImport({ resourcePath, templateFileName, successMessage, onImported }: UseExcelImportOptions) {
  const importUrl = `${resourcePath}import/`;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
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
      const response = await apiFetch(`${importUrl}template/`);

      if (!response.ok) {
        throw new Error('No se pudo descargar la plantilla de movimientos.');
      }

      downloadBlob(await response.blob(), templateFileName);
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
      const response = await postFile(`${importUrl}preview/`, selectedFile);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'No se pudo analizar el archivo.');
      }

      setPreview(payload as ImportPreview);
    } catch (previewError) {
      setPreview(null);
      setError(getErrorMessage(previewError, 'No se pudo analizar el archivo.'));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  /** Crea los registros del archivo ya validado y recarga los datos afectados. */
  const confirmImport = async () => {
    if (!selectedFile || !preview?.can_import) {
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const response = await postFile(`${importUrl}commit/`, selectedFile);
      const payload = await response.json();

      if (!response.ok) {
        // El backend devuelve la vista previa actualizada cuando el archivo dejó de ser válido.
        if (payload?.preview) {
          setPreview(payload.preview as ImportPreview);
        }
        throw new Error('Corrige los errores del archivo antes de importar definitivamente.');
      }

      const result = payload as ImportCommitResult;
      await onImported();
      setIsOpen(false);
      reset();
      window.alert(successMessage(result.created_count));
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

export type ExcelImportController = ReturnType<typeof useExcelImport>;
