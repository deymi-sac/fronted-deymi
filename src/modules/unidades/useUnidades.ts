import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listarUnidades, type ListarUnidadesParams } from "./unidades.api";

export function useUnidades(params?: ListarUnidadesParams) {
  return useQuery({
    queryKey: ["unidades", params],
    queryFn: () => listarUnidades(params),
    placeholderData: keepPreviousData,
  });
}