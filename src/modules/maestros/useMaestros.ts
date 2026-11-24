import { useQuery } from "@tanstack/react-query";
import * as api from "./maestros.api";

const CLAVE = ["maestros"] as const;

export const useClientes = () => useQuery({ queryKey: [...CLAVE, "clientes"], queryFn: api.listarClientes });
export const useProveedores = () => useQuery({ queryKey: [...CLAVE, "proveedores"], queryFn: api.listarProveedores });
export const useConceptos = () => useQuery({ queryKey: [...CLAVE, "conceptos"], queryFn: api.listarConceptos });
export const useCatalogos = () => useQuery({ queryKey: [...CLAVE, "catalogos"], queryFn: api.obtenerCatalogos });
export const useEmpresa = () => useQuery({ queryKey: [...CLAVE, "empresa"], queryFn: api.obtenerEmpresa });
export const useNumeracion = () => useQuery({ queryKey: [...CLAVE, "numeracion"], queryFn: api.listarNumeracion });
