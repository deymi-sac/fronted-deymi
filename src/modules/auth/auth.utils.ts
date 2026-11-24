export const ROLES = {
  ADMIN: 1,
  COORDINADOR_DE_TRANSPORTE: 2,
  SISTEMAS: 3,
  COORDINADOR_DE_ALMACEN: 4,
  FACTURACION: 5,
  COMERCIAL: 6,
  RESPONSABLE_DE_PAGOS: 7,
  CONTABILIDAD: 8,
  GERENCIA: 9,
  FACTURACION_COMERCIAL: 10,
} as const;

export interface UsuarioActual {
  user_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  id_rol: number;
  /** Nombre del rol y lo que puede hacer (los entrega el backend al iniciar sesión) */
  rol?: string;
  permisos?: string[];
}

/** Roles que usan el módulo de transporte (servicios, conductores, unidades, transportistas, documentos). */
export const ROLES_TRANSPORTE: number[] = [ROLES.ADMIN, ROLES.SISTEMAS, ROLES.COORDINADOR_DE_TRANSPORTE];

/** Roles que usan el módulo Almacén (el backend decide qué puede escribir cada uno). */
export const ROLES_ALMACEN: number[] = [ROLES.ADMIN, ROLES.SISTEMAS, ROLES.COORDINADOR_DE_ALMACEN, ROLES.FACTURACION];

/** Roles que usan el módulo Comercial (maestros, tarifas, proformas); el backend valida el permiso de cada acción. */
export const ROLES_COMERCIAL: number[] = [
  ROLES.ADMIN,
  ROLES.SISTEMAS,
  ROLES.FACTURACION_COMERCIAL,
  ROLES.COMERCIAL,
  ROLES.RESPONSABLE_DE_PAGOS,
  ROLES.CONTABILIDAD,
  ROLES.GERENCIA,
];

/** Pantalla de inicio de cada rol: Coordinador de Almacén y Facturación no usan el Dashboard de transporte. */
export function rutaInicioDelRol(id_rol: number): string {
  const porRol = (() => {
    if (id_rol === ROLES.CONTABILIDAD || id_rol === ROLES.GERENCIA) return "/comercial/panel";
    if (id_rol === ROLES.COMERCIAL) return "/comercial/proformas";
    if (id_rol === ROLES.RESPONSABLE_DE_PAGOS) return "/comercial/pagos";
    return id_rol === ROLES.COORDINADOR_DE_ALMACEN || id_rol === ROLES.FACTURACION ? "/almacen/dashboard" : "/dashboard";
  })();
  // Roles de Transporte/Almacén: su pantalla de siempre. El resto (incluidos los roles propios): la primera a la que su permiso da acceso
  if (ROLES_TRANSPORTE.includes(id_rol) || ROLES_ALMACEN.includes(id_rol)) return porRol;
  const alcanzable = PANTALLAS_POR_PERMISO.find(([permiso]) => tienePermiso(permiso));
  return alcanzable ? alcanzable[1] : "/sin-acceso";
}

/** Primera pantalla a la que lleva cada permiso, en orden de preferencia (para quien no tiene una pantalla de inicio propia). */
const PANTALLAS_POR_PERMISO: [string, string][] = [
  ["panel_comercial", "/comercial/panel"],
  ["proformas_ver", "/comercial/proformas"],
  ["operaciones_ver", "/comercial/operaciones"],
  ["pagos_ver", "/comercial/pagos"],
  ["liquidaciones_ver", "/comercial/liquidaciones"],
  ["facturas_ver", "/comercial/facturas"],
  ["cobros_ver", "/comercial/cobranza"],
  ["reportes_comercial", "/comercial/reportes"],
  ["maestros_ver", "/comercial/maestros"],
  ["tarifas_ver", "/comercial/tarifas"],
  ["usuarios_roles", "/roles"],
  ["auditoria_ver", "/auditoria"],
];

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

/** ¿Su rol tiene este permiso? (solo decide qué botones se muestran; el backend vuelve a validar). */
export function tienePermiso(permiso: string): boolean {
  return getCurrentUser()?.permisos?.includes(permiso) ?? false;
}

/** ¿Tiene al menos uno de estos permisos? */
export function tieneAlgunPermiso(permisos: string[]): boolean {
  const propios = getCurrentUser()?.permisos;
  return !!propios && permisos.some((p) => propios.includes(p));
}

/** Con cualquiera de estos permisos se entra al módulo Comercial. */
export const PERMISOS_ENTRADA_COMERCIAL = [
  "maestros_ver", "tarifas_ver", "proformas_ver", "operaciones_ver", "pagos_ver", "liquidaciones_ver",
  "facturas_ver", "cobros_ver", "panel_comercial", "reportes_comercial",
];
