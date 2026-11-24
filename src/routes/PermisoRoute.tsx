import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser, rutaInicioDelRol, tieneAlgunPermiso } from "../modules/auth/auth.utils";

/** Deja pasar a quien tenga al menos uno de los permisos; a los demás los lleva a su pantalla de inicio. */
export function PermisoRoute({ permisos }: { permisos: string[] }) {
  const usuario = getCurrentUser();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!tieneAlgunPermiso(permisos)) return <Navigate to={rutaInicioDelRol(usuario.id_rol)} replace />;
  return <Outlet />;
}
