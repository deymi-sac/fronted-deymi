import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";

// ---------- Roles y permisos ----------

export interface Rol {
  id: number;
  nombre: string;
  /** Rol que trae el sistema: no se renombra ni se elimina */
  base: boolean;
  /** Administrador: siempre con todos los permisos */
  fijo: boolean;
  usuarios: number;
  permisos: string[];
}

export interface ModuloPermisos {
  modulo: string;
  /** Comercial y Administración se editan aquí; Transporte y Almacén se manejan con sus roles de siempre */
  editable: boolean;
  permisos: { nombre: string; descripcion: string | null }[];
}

export const listarRoles = () => api.get<Rol[]>("/roles").then((r) => r.data);
export const catalogoPermisos = () => api.get<ModuloPermisos[]>("/permisos").then((r) => r.data);
export const crearRol = (d: { nombre: string; permisos: string[] }) => api.post<Rol>("/roles", d).then((r) => r.data);
export const renombrarRol = (id: number, nombre: string) => api.patch<Rol>(`/roles/${id}`, { nombre }).then((r) => r.data);
export const guardarPermisosRol = (id: number, permisos: string[]) => api.put<Rol>(`/roles/${id}/permisos`, { permisos }).then((r) => r.data);
export const eliminarRol = (id: number) => api.delete(`/roles/${id}`).then(() => undefined);

export const useRoles = () => useQuery({ queryKey: ["roles"], queryFn: listarRoles });
export const useCatalogoPermisos = () => useQuery({ queryKey: ["permisos"], queryFn: catalogoPermisos, staleTime: 5 * 60_000 });

// ---------- Auditoría ----------

export type OrigenActividad = "ADMIN" | "OPERACION" | "PAGO";

export interface Movimiento {
  clave: string;
  origen: OrigenActividad;
  fechaHora: string;
  usuarioId: number;
  usuario: string;
  accion: string;
  /** Sobre qué: Rol, Usuario, la operación o el pago */
  referencia: string;
  descripcion: string;
  motivo: string | null;
}

export interface Acceso {
  id: number;
  fechaHora: string;
  usuarioId: number | null;
  usuarioIntentado: string;
  exitoso: boolean;
  motivoFallo: string | null;
  ip: string | null;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
  paginas: number;
}

export interface FiltroActividad {
  pagina: number;
  usuarioId?: number | undefined;
  origen?: OrigenActividad | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
  buscar?: string | undefined;
}

export interface FiltroAccesos {
  pagina: number;
  exitoso?: boolean | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
  buscar?: string | undefined;
}

/** Los filtros vacíos no se envían. */
const sinVacios = (f: object) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ""));

export const listarActividad = (f: FiltroActividad) => api.get<Pagina<Movimiento>>("/auditoria", { params: sinVacios({ ...f, tamano: 25 }) }).then((r) => r.data);
export const listarAccesos = (f: FiltroAccesos) => api.get<Pagina<Acceso>>("/auditoria/accesos", { params: sinVacios({ ...f, tamano: 25 }) }).then((r) => r.data);

export const useActividad = (f: FiltroActividad) => useQuery({ queryKey: ["auditoria", "actividad", f], queryFn: () => listarActividad(f), placeholderData: keepPreviousData });
export const useAccesos = (f: FiltroAccesos, activo: boolean) =>
  useQuery({ queryKey: ["auditoria", "accesos", f], queryFn: () => listarAccesos(f), placeholderData: keepPreviousData, enabled: activo });
