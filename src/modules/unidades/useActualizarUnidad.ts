import { useMutation, useQueryClient } from "@tanstack/react-query";
import { actualizarUnidad } from "./unidades.api";

export function useActualizarUnidad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof actualizarUnidad>[1] }) =>
      actualizarUnidad(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
    },
  });
}