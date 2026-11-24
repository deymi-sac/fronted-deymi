import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { notificar } from "./toast";

export function mensajeDeError(err: unknown): string {
  if (!isAxiosError(err)) return "No se pudo guardar";
  const data = err.response?.data as { error?: string; detalles?: { campo: string; mensaje: string }[] } | undefined;
  const detalle = data?.detalles?.map((d) => d.mensaje).join(". ");
  return detalle || data?.error || "No se pudo guardar";
}

/**
 * Envía un formulario: al terminar bien refresca las consultas de `modulo` (["maestros"], ["tarifas"]…)
 * y llama a `onListo`. Si falla, deja el mensaje del servidor en `error` para mostrarlo en el formulario.
 */
export function useEnviar<R>(modulo: string, accion: () => Promise<R>, onListo: (resultado: R) => void) {
  const queryClient = useQueryClient();
  const guardar = useMutation({
    mutationFn: accion,
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: [modulo] });
      notificar("Guardado");
      onListo(resultado);
    },
  });
  return {
    guardando: guardar.isPending,
    error: guardar.isError ? mensajeDeError(guardar.error) : null,
    enviar: () => guardar.mutate(),
  };
}
