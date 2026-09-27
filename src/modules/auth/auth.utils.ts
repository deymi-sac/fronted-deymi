export const ROLES = {
  ADMIN: 1,
  COORDINADOR_DE_TRANSPORTE: 2,
  SISTEMAS: 3,
  COORDINADOR_DE_ALMACEN: 4,
  FACTURACION: 5,
} as const;

export interface UsuarioActual {
  user_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  id_rol: number;
}

/** Roles con permiso de escritura en el módulo Almacén (el resto, ej. Facturación, solo lectura). */
export function puedeOperarAlmacen(usuario: UsuarioActual | null): boolean {
  if (!usuario) return false;
  return [ROLES.ADMIN, ROLES.SISTEMAS, ROLES.COORDINADOR_DE_ALMACEN].includes(
    usuario.id_rol as (typeof ROLES)[keyof typeof ROLES]
  );
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