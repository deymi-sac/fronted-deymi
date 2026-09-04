import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import {
  listarTransportistas,
  actualizarTransportista,
  eliminarTransportista,
  type ListarTransportistasParams,
  type CrearTransportistaPayload,
} from "./transportistas.api";

export function useTransportistas(
  params?: ListarTransportistasParams
) {
  return useQuery({
    queryKey: ["transportistas", params],

    queryFn: () =>
      listarTransportistas(params),

    placeholderData: keepPreviousData,
  });
}

export function useActualizarTransportista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CrearTransportistaPayload> }) =>
      actualizarTransportista(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportistas"] });
    },
  });
}

export function useEliminarTransportista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eliminarTransportista,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportistas"] });
    },
  });
}