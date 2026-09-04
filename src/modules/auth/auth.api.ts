import { api } from "../../api/axios";

export interface LoginPayload {
  correo: string;
  contrasena: string;
  captchaToken: string;
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

export interface ForgotPasswordPayload {
  correo: string;
  captchaToken: string;
}

export interface ResetPasswordPayload {
  token: string;
  contrasena: string;
  captchaToken: string;
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<{ mensaje: string }> {
  const { data } = await api.post("/auth/forgot-password", payload);
  return data;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<{ mensaje: string }> {
  const { data } = await api.post("/auth/reset-password", payload);
  return data;
}