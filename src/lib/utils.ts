/**
 * Helper para combinar clases condicionales y resolver conflictos de Tailwind.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  // `clsx` arma la cadena y `twMerge` elimina utilidades de Tailwind conflictivas.
  return twMerge(clsx(inputs));
}
