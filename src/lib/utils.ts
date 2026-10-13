/**
 * Helper para combinar clases condicionales y resolver conflictos de Tailwind.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  // `clsx` arma la cadena y `twMerge` elimina utilidades de Tailwind conflictivas.
  return twMerge(clsx(inputs));
}

/** Mensaje de un error capturado, o un texto de respaldo si no es un Error. */
export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
