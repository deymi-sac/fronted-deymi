import { api } from "../../api/axios";

export interface Usuario {
  user_id: number;
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  activo: boolean;
  creado_en: string;
  roles: { id_rol: number; nombre_rol: string };
}

export interface UsuariosResponse {
  data: Usuario[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListarUsuariosParams {
  page?: number;
  limit?: number;
}

export async function listarUsuarios(params?: ListarUsuariosParams): Promise<UsuariosResponse> {
  const { data } = await api.get<UsuariosResponse>("/usuarios", { params });
  return data;
}

export interface CrearUsuarioPayload {
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  contrasena: string;
  id_rol: number;
}

export async function crearUsuario(payload: CrearUsuarioPayload): Promise<Usuario> {
  const { data } = await api.post<Usuario>("/usuarios", payload);
  return data;
}

export interface ActualizarUsuarioPayload {
  nombre?: string;
  apellido?: string;
  correo?: string;
  id_rol?: number;
  activo?: boolean;
}

export async function actualizarUsuario(id: number, payload: ActualizarUsuarioPayload): Promise<Usuario> {
  const { data } = await api.put<Usuario>(`/usuarios/${id}`, payload);
  return data;
}

export async function cambiarPasswordUsuario(id: number, nuevaContrasena: string): Promise<{ mensaje: string }> {
  const { data } = await api.patch<{ mensaje: string }>(`/usuarios/${id}/password`, { nuevaContrasena });
  return data;
}

export async function desactivarUsuario(id: number): Promise<void> {
  await api.delete(`/usuarios/${id}`);
}

export async function eliminarUsuarioPermanente(id: number): Promise<void> {
  await api.delete(`/usuarios/${id}/permanente`);
}