import {
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";

import {
  listarTransportistas,
  type ListarTransportistasParams,
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