import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarTiposDocumento,
  listarDocumentosConductor,
  crearDocumentoConductor,
  eliminarDocumentoConductor,
  listarDocumentosUnidad,
  crearDocumentoUnidad,
  eliminarDocumentoUnidad,
  obtenerProximosAVencer,
} from "./documentos.api";

export function useTiposDocumento() {
  return useQuery({ queryKey: ["tipos-documento"], queryFn: listarTiposDocumento });
}

export function useDocumentosConductor() {
  return useQuery({ queryKey: ["documentos-conductor"], queryFn: () => listarDocumentosConductor() });
}

export function useCrearDocumentoConductor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearDocumentoConductor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-conductor"] });
      queryClient.invalidateQueries({ queryKey: ["proximos-a-vencer"] });
    },
  });
}

export function useEliminarDocumentoConductor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarDocumentoConductor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-conductor"] });
      queryClient.invalidateQueries({ queryKey: ["proximos-a-vencer"] });
    },
  });
}

export function useDocumentosUnidad() {
  return useQuery({ queryKey: ["documentos-unidad"], queryFn: () => listarDocumentosUnidad() });
}

export function useCrearDocumentoUnidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearDocumentoUnidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-unidad"] });
      queryClient.invalidateQueries({ queryKey: ["proximos-a-vencer"] });
    },
  });
}

export function useEliminarDocumentoUnidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarDocumentoUnidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-unidad"] });
      queryClient.invalidateQueries({ queryKey: ["proximos-a-vencer"] });
    },
  });
}

export function useProximosAVencer(dias = 30) {
  return useQuery({ queryKey: ["proximos-a-vencer", dias], queryFn: () => obtenerProximosAVencer(dias) });
}