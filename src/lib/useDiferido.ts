import { useEffect, useMemo, useState } from "react";

/**
 * El valor, pero recién cuando deja de cambiar por `ms` milisegundos (para no consultar en cada tecla).
 * Se compara por contenido (JSON): un objeto armado en cada render no reinicia la espera.
 */
export function useDiferido<T>(valor: T, ms = 400) {
  const clave = JSON.stringify(valor);
  const [diferido, setDiferido] = useState(clave);
  useEffect(() => {
    const t = setTimeout(() => setDiferido(clave), ms);
    return () => clearTimeout(t);
  }, [clave, ms]);
  return useMemo(() => JSON.parse(diferido ?? "null") as T, [diferido]);
}
