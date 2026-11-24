import type { ReactNode } from "react";
import { PieTabla } from "./PieTabla";
import { usePaginado } from "../../lib/usePaginado";

/** Barra de páginas bajo una lista: "N registros · página X de Y" y las flechas. No aparece si todo cabe en una página. */
export function BarraPaginas({ total, pagina, paginas, onPagina }: { total: number; pagina: number; paginas: number; onPagina: (p: number) => void }) {
  if (paginas <= 1) return null;
  return (
    <PieTabla pagina={pagina} paginas={paginas} onPagina={onPagina}>
      {total} registros
    </PieTabla>
  );
}

/** Muestra de a 10 los elementos de una lista que ya llegó completa, con sus botones de página debajo. */
export function Paginado<T>({ items, children }: { items: T[] | undefined; children: (visibles: T[]) => ReactNode }) {
  const p = usePaginado(items);
  return (
    <>
      {children(p.visibles)}
      <BarraPaginas total={p.total} pagina={p.pagina} paginas={p.paginas} onPagina={p.setPagina} />
    </>
  );
}
