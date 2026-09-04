import { api } from "../../api/axios";

export interface Servicio {
  id_service: number;
  referencia: string;
  cliente: string | null;
  fecha: string;
  observaciones: string | null;
  id_estado: number;

  estados_servicio?: {
    id_estado: number;
    nombre_estado: string;
  } | null;

  unidades?: {
    id_unidad: number;
    uni_placa: string;
    uni_placa_secundaria?: string | null;
    uni_type_vehiculo?: string;
  } | null;

  unidades_terceros?: {
    id_unit_terceros: number;
    unit_placa: string;
    unit_placa_secundaria?: string | null;
    unit_type_vehiculo: string;

    conductores_terceros?: {
      in_id_conductor: number;
      in_name: string;
      in_apellido: string;
      in_dni: string;
      in_brevete_num?: string | null;
    } | null;
  } | null;

  servicio_conductores?: {
    in_id_conductor: number;
    estado: string;

    conductores_interno?: {
      in_id_conductor: number;
      in_name: string;
      in_apellido: string;
      in_brevete_num?: string | null;
    } | null;
  }[];
}

export interface ServiciosResponse {
  data: Servicio[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListarServiciosParams {
  busqueda?: string;
  id_estado?: number;
  page?: number;
  limit?: number;
}


// ============================================================
// LISTAR SERVICIOS
// ============================================================

export async function obtenerServicios(
  params: ListarServiciosParams = {},
): Promise<ServiciosResponse> {
  const response = await api.get<ServiciosResponse>(
    "/servicios",
    {
      params: {
        busqueda:
          params.busqueda || undefined,
        id_estado: params.id_estado,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    },
  );

  return response.data;
}


// ============================================================
// CREAR SERVICIO INTERNO
// ============================================================

export interface CrearServicioInternoPayload {
  tipo: "interno";
  referencia: string;
  fecha: string;
  cliente?: string;
  observaciones?: string;
  id_estado: number;
  id_unidad: number;
  in_id_conductor: number;
}

export async function crearServicioInterno(
  payload: CrearServicioInternoPayload,
): Promise<Servicio> {
  const { data } = await api.post<Servicio>(
    "/servicios",
    payload,
  );

  return data;
}


// ============================================================
// CREAR SERVICIO DE TERCERO
// ============================================================

export interface CrearServicioTerceroPayload {
  tipo: "tercero";
  referencia: string;
  fecha: string;
  cliente?: string;
  observaciones?: string;
  id_estado: number;

  transportista: {
    razon_social: string;
    ruc: string;
    nombre_comercial?: string;
    status_homologacion?: boolean;
  };

  conductor: {
    nombre: string;
    apellido: string;
    dni: string;
    brevete_num?: string;
    type_brevete?: string;
  };

  unidad: {
    placa: string;
    placa_secundaria?: string;
    tipo_vehiculo: string;
  };
}

export async function crearServicioTercero(
  payload: CrearServicioTerceroPayload,
): Promise<Servicio> {
  const { data } = await api.post<Servicio>(
    "/servicios/tercero-completo",
    payload,
  );

  return data;
}

export interface CambiarEstadoServicioPayload {
  id_estado: number;
}

export async function cambiarEstadoServicio(
  id: number,
  payload: CambiarEstadoServicioPayload,
): Promise<Servicio> {
  const { data } = await api.patch<Servicio>(
    `/servicios/${id}/estado`,
    payload,
  );

  return data;
}

export interface ReasignarConductorPayload {
  in_id_conductor: number;
}

export async function reasignarConductor(
  id: number,
  payload: ReasignarConductorPayload,
): Promise<Servicio> {
  const { data } = await api.patch<Servicio>(
    `/servicios/${id}/conductor`,
    payload,
  );

  return data;
}

export async function eliminarServicio(
  id: number,
): Promise<void> {
  await api.delete(`/servicios/${id}`);
}

// ============================================================
// ENVIAR CORREO DEL SERVICIO
// ============================================================

export async function enviarCorreoServicio(
  id: number,
  correo: string,
): Promise<{ message: string; correo: string }> {
  const { data } = await api.post<{ message: string; correo: string }>(
    `/servicios/${id}/enviar-correo`,
    { correo },
  );

  return data;
}