import { api } from "../../api/axios";


export interface EstadoUnidad {
  id_estado: number;
  nombre_estado: string;
}

export interface Unidad {
  id_unidad: number;
  id_estado: number;
  uni_type_vehiculo: string;
  uni_observaciones: string | null;
  uni_placa: string;
  uni_placa_secundaria: string | null;
  estados_unidad: EstadoUnidad;
}

export interface UnidadesResponse {
  data: Unidad[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListarUnidadesParams {
  busqueda?: string;
  id_estado?: number;
  page?: number;
  limit?: number;
}

export async function listarUnidades(params?: ListarUnidadesParams): Promise<UnidadesResponse> {
  const { data } = await api.get<UnidadesResponse>("/unidades", { params });
  return data;
}

export interface CrearUnidadPayload {
  uni_placa: string;
  uni_type_vehiculo: string;
  id_estado: number;
  uni_placa_secundaria?: string;
  uni_observaciones?: string;
}

export async function crearUnidad(payload: CrearUnidadPayload): Promise<Unidad> {
  const { data } = await api.post<Unidad>("/unidades", payload);
  return data;
}

export async function actualizarUnidad(id: number, payload: Partial<CrearUnidadPayload>): Promise<Unidad> {
  const { data } = await api.put<Unidad>(`/unidades/${id}`, payload);
  return data;
}

export async function eliminarUnidad(id: number): Promise<void> {
  await api.delete(`/unidades/${id}`);
}