import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crearConductor } from "./conductores.api";

export function useCrearConductor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearConductor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
    },
  });
}