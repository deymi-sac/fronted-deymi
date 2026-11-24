import { Navigate, Outlet } from "react-router-dom";

/** ¿La sesión guardada es de antes de que el sistema guardara los permisos del rol? */
function sesionSinPermisos(): boolean {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") ?? "null") as { permisos?: string[] } | null;
    return !!usuario && !usuario.permisos;
  } catch {
    return false;
  }
}

export function ProtectedRoute() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Se vuelve a iniciar sesión una sola vez, para que la pantalla conozca los permisos del rol
  if (sesionSinPermisos()) {
    for (const clave of ["accessToken", "refreshToken", "usuario"]) localStorage.removeItem(clave);
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
