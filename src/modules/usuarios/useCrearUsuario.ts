import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crearUsuario } from "./usuarios.api";

export function useCrearUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}