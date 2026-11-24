import type { ReactNode } from "react";
import { usePaginado } from "../../lib/usePaginado";
import { BarraPaginas } from "./Paginado";

export interface Columna<T> {
  titulo: ReactNode;
  celda: (fila: T) => ReactNode;
  className?: string;
  alinear?: "derecha" | "centro";
}

const alineacion = (a?: "derecha" | "centro") => (a === "derecha" ? "text-right" : a === "centro" ? "text-center" : "text-left");

/**
 * Tabla de un listado: encabezado en mayúsculas, filas con línea suave, y (opcional) clic en la fila.
 * Si la lista llega completa, la muestra de a 10 con sus botones de página; los listados que ya pagina el servidor
 * llevan `paginar={false}` o llegan con 10 filas, y no muestran barra.
 */
export function Tabla<T>({
  columnas,
  filas,
  claveFila,
  onFila,
  vacio = "No hay registros",
  cargando = false,
  paginar = true,
}: {
  columnas: Columna<T>[];
  filas: T[] | undefined;
  claveFila: (fila: T) => string | number;
  onFila?: (fila: T) => void;
  vacio?: ReactNode;
  cargando?: boolean;
  /** false: las filas ya vienen paginadas de otra parte */
  paginar?: boolean;
}) {
  const p = usePaginado(filas);
  const visibles = paginar ? p.visibles : (filas ?? []);
  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {columnas.map((c, i) => (
              <th key={i} className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${alineacion(c.alinear)} ${c.className ?? ""}`}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cargando &&
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
                {columnas.map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-slate-100" />
                  </td>
                ))}
              </tr>
            ))}
          {!cargando && filas?.length === 0 && (
            <tr>
              <td colSpan={columnas.length} className="px-4 py-10 text-center text-sm text-slate-400">
                {vacio}
              </td>
            </tr>
          )}
          {!cargando &&
            visibles.map((f) => (
              <tr key={claveFila(f)} onClick={onFila ? () => onFila(f) : undefined} className={onFila ? "cursor-pointer transition hover:bg-slate-50" : ""}>
                {columnas.map((c, j) => (
                  <td key={j} className={`px-4 py-3 align-middle ${alineacion(c.alinear)} ${c.className ?? ""}`}>
                    {c.celda(f)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
    {paginar && <BarraPaginas total={p.total} pagina={p.pagina} paginas={p.paginas} onPagina={p.setPagina} />}
    </>
  );
}
