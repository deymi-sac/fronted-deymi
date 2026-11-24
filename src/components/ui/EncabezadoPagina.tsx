import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Encabezado de una pantalla: flecha para volver (opcional), título con su subtítulo y las acciones a la derecha. */
export function EncabezadoPagina({
  titulo,
  subtitulo,
  acciones,
  volverA,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
  volverA?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {volverA && (
          <Link to={volverA} className="mt-0.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200" aria-label="Volver">
            <ArrowLeft size={18} />
          </Link>
        )}
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{titulo}</h1>
          {subtitulo && <div className="mt-1 text-sm text-slate-500">{subtitulo}</div>}
        </div>
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
