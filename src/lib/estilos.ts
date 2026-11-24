import { inputClassGenerico } from "../modules/almacen/almacen.utils";

/** Campo de formulario a todo el ancho de su columna. */
export const inputClass = `w-full ${inputClassGenerico}`;

/** Celda de una tabla editable: más compacta que un campo normal. */
export const inputCelda = `${inputClass} px-2! py-1.5! text-xs!`;

export const btnPrimario =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const btnPeligro =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50";

export const btnExito =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50";
