import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser, rutaInicioDelRol } from "../modules/auth/auth.utils";

interface RoleRouteProps {
  allowedRoles: number[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const usuario = getCurrentUser();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Sin permiso: se lleva a cada rol a su propia pantalla de inicio.
  if (!allowedRoles.includes(usuario.id_rol)) {
    return <Navigate to={rutaInicioDelRol(usuario.id_rol)} replace />;
  }

  return <Outlet />;
}