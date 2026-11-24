import { useState } from "react";

/** Ninguna lista muestra más de esto por página. */
export const POR_PAGINA = 10;

/** Pagina en pantalla una lista que ya está completa. Si cambia el largo (ej. al filtrar), vuelve a la primera página. */
export function usePaginado<T>(items: T[] | undefined) {
  const lista = items ?? [];
  const [pagina, setPagina] = useState(1);
  const [largo, setLargo] = useState(lista.length);
  if (lista.length !== largo) {
    setLargo(lista.length);
    setPagina(1);
  }
  const paginas = Math.max(Math.ceil(lista.length / POR_PAGINA), 1);
  const actual = Math.min(pagina, paginas);
  return { visibles: lista.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA), pagina: actual, paginas, total: lista.length, setPagina };
}
