import { useEffect, type RefObject } from "react";

/**
 * Cierra una ventana con la tecla Esc, pero solo si es la que está arriba de todas:
 * así Esc cierra primero el formulario abierto sobre un detalle, no los dos a la vez.
 */
export function useEscape(ventana: RefObject<HTMLElement | null>, onCerrar: () => void) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const abiertas = document.querySelectorAll('[role="dialog"]');
      if (abiertas[abiertas.length - 1] === ventana.current) onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [ventana, onCerrar]);
}
