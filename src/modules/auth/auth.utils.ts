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
  return (
    usuario.id_rol === ROLES.ADMIN ||
    usuario.id_rol === ROLES.SISTEMAS ||
    usuario.id_rol === ROLES.COORDINADOR_DE_ALMACEN
  );
}

/** Facturación también puede editar la ficha de Clientes (tarifas, datos, productos), aunque no opera el resto del almacén. */
export function puedeEditarClientesAlmacen(usuario: UsuarioActual | null): boolean {
  return puedeOperarAlmacen(usuario) || usuario?.id_rol === ROLES.FACTURACION;
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