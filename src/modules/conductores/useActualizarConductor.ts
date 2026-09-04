import { useMutation, useQueryClient } from "@tanstack/react-query";
import { actualizarConductor } from "./conductores.api";

export function useActualizarConductor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof actualizarConductor>[1] }) =>
      actualizarConductor(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
    },
  });
}