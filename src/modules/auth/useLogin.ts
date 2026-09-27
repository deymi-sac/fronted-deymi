import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { login } from "./auth.api";
import { ROLES } from "./auth.utils";

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
      const esSoloAlmacen =
        data.usuario.id_rol === ROLES.COORDINADOR_DE_ALMACEN || data.usuario.id_rol === ROLES.FACTURACION;
      navigate(esSoloAlmacen ? "/almacen/dashboard" : "/dashboard");
    },
  });
}