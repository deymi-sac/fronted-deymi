import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../modules/auth/auth.utils";

interface RoleRouteProps {
  allowedRoles: number[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const usuario = getCurrentUser();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(usuario.id_rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}