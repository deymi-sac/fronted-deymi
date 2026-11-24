import { useRef, type ReactNode } from "react";
import { Save, X } from "lucide-react";
import { btnPrimario, btnSecundario } from "../../lib/estilos";
import { useEscape } from "../../lib/useEscape";

/** Ventana de formulario: título, campos en dos columnas, error del servidor y botones. */
export function Modal({
  titulo,
  onCerrar,
  onGuardar,
  guardando,
  error,
  textoGuardar = "Guardar",
  ancho = "max-w-xl",
  libre = false,
  aviso,
  deshabilitado = false,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  onGuardar: () => void;
  guardando: boolean;
  error: string | null;
  textoGuardar?: string;
  /** Clase de ancho máximo (por defecto, max-w-xl) */
  ancho?: string;
  /** Sin grilla de dos columnas: el contenido arma su propio diseño */
  libre?: boolean;
  /** Texto al pie, a la izquierda (ej. lo que falta llenar) */
  aviso?: string;
  /** Desactiva el botón de guardar */
  deshabilitado?: boolean;
  children: ReactNode;
}) {
  const ventana = useRef<HTMLFormElement>(null);
  useEscape(ventana, onCerrar);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        ref={ventana}
        role="dialog"
        aria-modal="true"
        onSubmit={(e) => {
          e.preventDefault();
          if (!deshabilitado) onGuardar();
        }}
        className={`max-h-[90vh] w-full ${ancho} overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className={libre ? "space-y-5 p-6" : "grid gap-4 p-6 sm:grid-cols-2"}>
          {error && <p className={`rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 ${libre ? "" : "sm:col-span-2"}`}>{error}</p>}
          {children}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {aviso && <p className="mr-auto text-xs text-slate-500">{aviso}</p>}
          <button type="button" onClick={onCerrar} className={btnSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando || deshabilitado} className={btnPrimario}>
            <Save size={16} /> {guardando ? "Guardando..." : textoGuardar}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Campo({ label, ayuda, requerido, className, children }: { label: string; ayuda?: string; requerido?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {requerido && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-400">{ayuda}</span>}
    </label>
  );
}
