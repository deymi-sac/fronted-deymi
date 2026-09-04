import { useNavigate } from "react-router-dom";
import { logout } from "./auth.api";

export function useLogout() {
  const navigate = useNavigate();

  async function cerrarSesion() {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        await logout(refreshToken);
      } catch {
        // Si falla la llamada al backend, igual limpiamos la sesión local
      }
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("usuario");
    navigate("/login");
  }

  return { cerrarSesion };
}