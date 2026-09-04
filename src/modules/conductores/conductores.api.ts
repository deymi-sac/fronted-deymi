import { api } from "../../api/axios";

export interface Conductor {
  in_id_conductor: number;
  in_name: string;
  in_apellido: string;
  in_dni: string;
  in_brevete_num: string | null;
  in_type_brevete: string | null;
  in_telefono: string | null;
  in_email: string | null;
  in_status: boolean;
  in_observaciones: string | null;
}

export interface ConductoresResponse {
  data: Conductor[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListarConductoresParams {
  busqueda?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export async function listarConductores(params?: ListarConductoresParams): Promise<ConductoresResponse> {
  const { data } = await api.get<ConductoresResponse>("/conductores", { params });
  return data;
}

export interface CrearConductorPayload {
  in_name: string;
  in_apellido: string;
  in_dni: string;
  in_brevete_num?: string;
  in_type_brevete?: string;
  in_telefono?: string;
  in_email?: string;
  in_observaciones?: string;
}

export async function crearConductor(payload: CrearConductorPayload): Promise<Conductor> {
  const { data } = await api.post<Conductor>("/conductores", payload);
  return data;
}

export async function actualizarConductor(id: number, payload: Partial<CrearConductorPayload>): Promise<Conductor> {
  const { data } = await api.put<Conductor>(`/conductores/${id}`, payload);
  return data;
}

export async function eliminarConductor(id: number): Promise<void> {
  await api.delete(`/conductores/${id}`);
}