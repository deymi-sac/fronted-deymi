import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { btnSecundario } from "../../lib/estilos";

/** Pie de una tabla paginada: resumen a la izquierda y navegación de páginas a la derecha. */
export function PieTabla({ pagina, paginas, onPagina, children }: { pagina: number; paginas: number; onPagina: (p: number) => void; children?: ReactNode }) {
  if (!children && paginas <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        {children}
        {paginas > 1 && <> · página {pagina} de {paginas}</>}
      </span>
      {paginas > 1 && (
        <div className="flex gap-2">
          <button type="button" onClick={() => onPagina(pagina - 1)} disabled={pagina <= 1} className={btnSecundario} aria-label="Página anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => onPagina(pagina + 1)} disabled={pagina >= paginas} className={btnSecundario} aria-label="Página siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
