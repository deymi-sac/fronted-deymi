import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listarConductores, type ListarConductoresParams } from "./conductores.api";

export function useConductores(params?: ListarConductoresParams) {
  return useQuery({
    queryKey: ["conductores", params],
    queryFn: () => listarConductores(params),
    placeholderData: keepPreviousData,
  });
}