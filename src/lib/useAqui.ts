import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Qué botón resaltar al llegar desde el "siguiente paso" de una operación (?aqui=registrar, ?aqui=aprobar…).
 * Devuelve una función: aqui("aprobar") es true si ese es el botón que toca.
 *
 * Al pulsar el botón resaltado (clase "brillo") se quitan de la dirección los parámetros que lo marcan
 * (`quitar`), para que el "👉 Aquí" no se quede en un paso ya hecho. Los enlaces resaltados no cuentan:
 * esos llevan a otra pantalla.
 */
export function useAqui(quitar: string[] = ["aqui"]) {
  const [parametros, setParametros] = useSearchParams();
  const valor = parametros.get("aqui");
  const claves = quitar.join(",");

  useEffect(() => {
    function alClic(e: MouseEvent) {
      const elemento = e.target instanceof Element ? e.target : null;
      if (!elemento?.closest(".brillo") || elemento.closest("a")) return;
      setParametros(
        (actuales) => {
          const nuevos = new URLSearchParams(actuales);
          for (const k of claves.split(",")) nuevos.delete(k);
          return nuevos;
        },
        { replace: true }
      );
    }
    document.addEventListener("click", alClic);
    return () => document.removeEventListener("click", alClic);
  }, [claves, setParametros]);

  return (clave: string) => valor === clave;
}
