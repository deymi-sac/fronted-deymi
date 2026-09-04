import { api } from "../../api/axios";

export interface LoginPayload {
  correo: string;
  contrasena: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: {
    user_id: number;
    nombre: string;
    apellido: string;
    correo: string;
    id_rol: number;
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refreshToken });
}