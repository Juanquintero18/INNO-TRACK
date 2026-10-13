/**
 * Estado de un formulario de diálogo: valores de los campos y mensaje de error.
 */
import { useState } from 'react';

export function useFormState<Values extends Record<string, string>>(emptyValues: Values) {
  const [values, setValues] = useState<Values>(emptyValues);
  const [error, setError] = useState('');

  /** Cambia un campo y borra el error visible, porque el usuario ya está corrigiendo. */
  const setField = (field: keyof Values, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  /** Carga valores nuevos (o deja el formulario vacío) y borra el error. */
  const reset = (nextValues: Values = emptyValues) => {
    setValues(nextValues);
    setError('');
  };

  return { values, setValues, setField, error, setError, reset };
}
