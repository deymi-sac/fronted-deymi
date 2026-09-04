import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listarEstadosUnidad, crearEstadoUnidad, actualizarEstadoUnidad, eliminarEstadoUnidad } from "./catalogos.api";

export function useEstadosUnidad() {
  return useQuery({
    queryKey: ["estados-unidad"],
    queryFn: listarEstadosUnidad,
  });
}

export function useCrearEstadoUnidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearEstadoUnidad,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["estados-unidad"] }),
  });
}

export function useActualizarEstadoUnidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nombre_estado }: { id: number; nombre_estado: string }) =>
      actualizarEstadoUnidad(id, nombre_estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["estados-unidad"] }),
  });
}

export function useEliminarEstadoUnidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarEstadoUnidad,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["estados-unidad"] }),
  });
}