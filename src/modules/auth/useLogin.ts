import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { login } from "./auth.api";
import { rutaInicioDelRol } from "./auth.utils";

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));

      // Coordinador de Almacén y Facturación no tienen nada que hacer en el
      // dashboard de transporte — los llevamos directo al suyo.
      navigate(rutaInicioDelRol(data.usuario.id_rol));
    },
  });
}