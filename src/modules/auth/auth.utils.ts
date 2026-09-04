export const ROLES = {
  ADMIN: 1,
  COORDINADOR_DE_TRANSPORTE: 2,
} as const;

export interface UsuarioActual {
  user_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  id_rol: number;
}

export function getCurrentUser(): UsuarioActual | null {
  const usuario = localStorage.getItem("usuario");

  if (!usuario) {
    return null;
  }

  try {
    return JSON.parse(usuario) as UsuarioActual;
  } catch {
    return null;
  }
}