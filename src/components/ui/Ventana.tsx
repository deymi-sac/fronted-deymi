import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useEscape } from "../../lib/useEscape";

/**
 * Ventana para ver un detalle (pago, cobro, factura…): título con su botón de cerrar, contenido que se desplaza y,
 * si se pasa `pie`, una franja de botones abajo. Se cierra con Esc o tocando fuera. En el celular sube desde abajo.
 */
export function Ventana({ titulo, onCerrar, children, pie, ancho = "max-w-2xl" }: { titulo: ReactNode; onCerrar: () => void; children: ReactNode; pie?: ReactNode; ancho?: string }) {
  const ventana = useRef<HTMLDivElement>(null);
  useEscape(ventana, onCerrar);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        ref={ventana}
        className={`flex max-h-[92vh] w-full ${ancho} flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {pie && <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{pie}</footer>}
      </div>
    </div>
  );
}
