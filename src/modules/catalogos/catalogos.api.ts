import { api } from "../../api/axios";

export interface EstadoUnidad {
  id_estado: number;
  nombre_estado: string;
}

export async function listarEstadosUnidad(): Promise<EstadoUnidad[]> {
  const { data } = await api.get<EstadoUnidad[]>("/catalogos/estados-unidad");
  return data;
}

export async function crearEstadoUnidad(nombre_estado: string): Promise<EstadoUnidad> {
  const { data } = await api.post<EstadoUnidad>("/catalogos/estados-unidad", { nombre_estado });
  return data;
}

export async function actualizarEstadoUnidad(id: number, nombre_estado: string): Promise<EstadoUnidad> {
  const { data } = await api.put<EstadoUnidad>(`/catalogos/estados-unidad/${id}`, { nombre_estado });
  return data;
}

export async function eliminarEstadoUnidad(id: number): Promise<void> {
  await api.delete(`/catalogos/estados-unidad/${id}`);
}