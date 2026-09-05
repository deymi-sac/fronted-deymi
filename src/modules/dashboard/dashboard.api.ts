import { api } from "../../api/axios";

export interface EstadoServicio {
  id_estado: number;
  nombre_estado: string;
}

export interface Unidad {
  id_unidad: number;
  id_estado: number;
  uni_type_vehiculo: string;
  uni_placa: string;
  uni_placa_secundaria: string | null;
}

export interface ConductorInterno {
  in_id_conductor: number;
  in_name: string;
  in_apellido: string;
  in_brevete_num: string | null;
  in_type_brevete: string | null;
  in_dni: string;
  in_telefono: string | null;
  in_email: string | null;
  in_status: boolean;
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
}

export interface UnidadTercero {
  id_unit_terceros: number;
  in_id_conductor: number;
  unit_type_vehiculo: string;
  unit_observaciones: string | null;
  unit_placa: string;
  unit_placa_secundaria: string | null;
  conductores_terceros: ConductorTercero;
}

export interface ServicioConductor {
  id_asignacion: number;
  id_service: number;
  in_id_conductor: number;
  fecha_asignacion: string;
  fecha_fin: string | null;
  motivo_fin: string | null;
  estado: string;
  user_id: number;
  conductores_interno: ConductorInterno;
}

export interface Servicio {
  id_service: number;
  id_unidad: number | null;
  id_unit_terceros: number | null;
  id_estado: number;
  user_id: number;
  referencia: string | null;
  fecha: string;
  cliente: string | null;
  observaciones: string | null;

  estados_servicio: EstadoServicio;

  unidades: Unidad | null;

  unidades_terceros: UnidadTercero | null;

  servicio_conductores: ServicioConductor[];
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

export async function obtenerServiciosDashboard(): Promise<Servicio[]> {
  const { data } = await api.get<ServiciosResponse>("/servicios", {
    params: {
      page: 1,
      limit: 1000,
    },
  });

  return data.data;
}