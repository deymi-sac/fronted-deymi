/** Mínimo que pide el backend para el motivo de una corrección */
export const MIN_MOTIVO = 5;
export const motivoValido = (motivo: string) => motivo.trim().length >= MIN_MOTIVO;
