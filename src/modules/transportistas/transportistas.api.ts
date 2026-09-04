import { api } from "../../api/axios";

export interface UnidadTercero {
  id_unit_terceros: number;
  in_id_conductor: number;
  unit_type_vehiculo: string;
  unit_observaciones: string | null;
  unit_placa: string;
  unit_placa_secundaria: string | null;
}

export interface ConductorTercero {
  in_id_conductor: number;
  id_transportista: number;
  in_name: string;
  in_apellido: string;
  in_brevete_num: string | null;
  in_type_brevete: string | null;
  in_dni: string;
  in_observaciones: string | null;

  unidades_terceros: UnidadTercero[];
}

export interface Transportista {
  id_transportista: number;
  tex_razon_social: string;
  tex_ruc: string;
  tex_nombre_comercial: string | null;
  tex_telefono: string | null;
  tex_email: string | null;
  tex_status_homolo: boolean;
  tex_observaciones: string | null;

  conductores_terceros: ConductorTercero[];

  _count?: {
    conductores_terceros: number;
  };
}

export interface TransportistasResponse {
  data: Transportista[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListarTransportistasParams {
  busqueda?: string;
  page?: number;
  limit?: number;
}

export async function listarTransportistas(
  params?: ListarTransportistasParams
): Promise<TransportistasResponse> {
  const { data } = await api.get<TransportistasResponse>(
    "/transportistas",
    {
      params,
    }
  );

  return data;
}

export async function obtenerTransportista(
  id: number
): Promise<Transportista> {
  const { data } = await api.get<Transportista>(
    `/transportistas/${id}`
  );

  return data;
}

export interface CrearTransportistaPayload {
  tex_razon_social: string;
  tex_ruc: string;
  tex_nombre_comercial?: string;
  tex_telefono?: string;
  tex_email?: string;
  tex_status_homolo?: boolean;
  tex_observaciones?: string;
}

export async function crearTransportista(
  payload: CrearTransportistaPayload
): Promise<Transportista> {
  const { data } = await api.post<Transportista>(
    "/transportistas",
    payload
  );

  return data;
}

export async function actualizarTransportista(
  id: number,
  payload: Partial<CrearTransportistaPayload>
): Promise<Transportista> {
  const { data } = await api.put<Transportista>(
    `/transportistas/${id}`,
    payload
  );

  return data;
}

export async function eliminarTransportista(
  id: number
): Promise<void> {
  await api.delete(`/transportistas/${id}`);
}

export async function listarConductoresDeTransportista(id_transportista: number): Promise<ConductorTercero[]> {
  const { data } = await api.get<ConductorTercero[]>(`/transportistas/${id_transportista}/conductores`);
  return data;
}