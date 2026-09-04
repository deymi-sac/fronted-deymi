import { api } from "../../api/axios";

export interface TipoDocumento {
  id_tipo_documento: number;
  nombre: string;
  aplica_a: string;
  dias_anticipacion_default: number;
}

export interface DocumentoConductor {
  id_documento: number;
  in_id_conductor: number;
  id_tipo_documento: number;
  fecha_vencimiento: string;
  dias_anticipacion: number | null;
  observaciones: string | null;
  archivo_url: string | null;
  tipos_documento: TipoDocumento;
  conductores_interno: { in_id_conductor: number; in_name: string; in_apellido: string };
}

export interface DocumentoUnidad {
  id_documento: number;
  id_unidad: number;
  id_tipo_documento: number;
  fecha_vencimiento: string;
  dias_anticipacion: number | null;
  observaciones: string | null;
  archivo_url: string | null;
  tipos_documento: TipoDocumento;
  unidades: { id_unidad: number; uni_placa: string; uni_placa_secundaria: string | null };
}

export interface ProximosAVencerResponse {
  conductores: DocumentoConductor[];
  unidades: DocumentoUnidad[];
}

export async function listarTiposDocumento(): Promise<TipoDocumento[]> {
  const { data } = await api.get<TipoDocumento[]>("/documentos/tipos");
  return data;
}

export async function listarDocumentosConductor(in_id_conductor?: number): Promise<DocumentoConductor[]> {
  const { data } = await api.get<DocumentoConductor[]>("/documentos/conductor", {
    params: in_id_conductor ? { in_id_conductor } : undefined,
  });
  return data;
}

export interface CrearDocConductorPayload {
  in_id_conductor: number;
  id_tipo_documento: number;
  fecha_vencimiento: string;
  dias_anticipacion?: number;
  observaciones?: string;
}

export async function crearDocumentoConductor(payload: CrearDocConductorPayload): Promise<DocumentoConductor> {
  const { data } = await api.post<DocumentoConductor>("/documentos/conductor", payload);
  return data;
}

export async function eliminarDocumentoConductor(id: number): Promise<void> {
  await api.delete(`/documentos/conductor/${id}`);
}

export async function listarDocumentosUnidad(id_unidad?: number): Promise<DocumentoUnidad[]> {
  const { data } = await api.get<DocumentoUnidad[]>("/documentos/unidad", {
    params: id_unidad ? { id_unidad } : undefined,
  });
  return data;
}

export interface CrearDocUnidadPayload {
  id_unidad: number;
  id_tipo_documento: number;
  fecha_vencimiento: string;
  dias_anticipacion?: number;
  observaciones?: string;
}

export async function crearDocumentoUnidad(payload: CrearDocUnidadPayload): Promise<DocumentoUnidad> {
  const { data } = await api.post<DocumentoUnidad>("/documentos/unidad", payload);
  return data;
}

export async function eliminarDocumentoUnidad(id: number): Promise<void> {
  await api.delete(`/documentos/unidad/${id}`);
}

export async function obtenerProximosAVencer(dias = 30): Promise<ProximosAVencerResponse> {
  const { data } = await api.get<ProximosAVencerResponse>("/documentos/proximos-a-vencer", { params: { dias } });
  return data;
}

export async function subirArchivo(archivo: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const { data } = await api.post<{ url: string }>("/documentos/subir-archivo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
}