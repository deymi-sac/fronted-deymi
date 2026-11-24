import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  tono: "exito" | "error" | "info";
  mensaje: string;
  /** Texto en negrita antes del mensaje (ej. "Siguiente paso") */
  titulo?: string;
  /** Botón que lleva a otra pantalla */
  enlace?: { texto: string; ruta: string };
}

let toasts: Toast[] = [];
let siguiente = 1;
const oyentes = new Set<() => void>();

function emitir() {
  oyentes.forEach((o) => o());
}

export function cerrarToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitir();
}

export function notificar(
  mensaje: string,
  tono: Toast["tono"] = "exito",
  opciones: { titulo?: string; enlace?: Toast["enlace"]; duracion?: number } = {}
) {
  const id = siguiente++;
  // Un aviso con título (ej. "Siguiente paso") reemplaza al anterior del mismo título: el paso viejo ya no vale
  const vigentes = opciones.titulo ? toasts.filter((t) => t.titulo !== opciones.titulo) : toasts;
  toasts = [...vigentes, { id, tono, mensaje, titulo: opciones.titulo, enlace: opciones.enlace }];
  emitir();
  setTimeout(() => cerrarToast(id), opciones.duracion ?? 3500);
}

export function useToasts() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => toasts
  );
}
