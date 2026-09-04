import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarUsuarios,
  actualizarUsuario,
  cambiarPasswordUsuario,
  desactivarUsuario,
  eliminarUsuarioPermanente,
  type ListarUsuariosParams,
  type ActualizarUsuarioPayload,
} from "./usuarios.api";


export function useUsuarios(params?: ListarUsuariosParams) {
  return useQuery({
    queryKey: ["usuarios", params],
    queryFn: () => listarUsuarios(params),
  });
}

export function useActualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ActualizarUsuarioPayload }) =>
      actualizarUsuario(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useCambiarPasswordUsuario() {
  return useMutation({
    mutationFn: ({ id, nuevaContrasena }: { id: number; nuevaContrasena: string }) =>
      cambiarPasswordUsuario(id, nuevaContrasena),
  });
}

export function useDesactivarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: desactivarUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useEliminarUsuarioPermanente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarUsuarioPermanente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}