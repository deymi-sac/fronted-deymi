import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crearUnidad } from "./unidades.api";

export function useCrearUnidad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearUnidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
    },
  });
}