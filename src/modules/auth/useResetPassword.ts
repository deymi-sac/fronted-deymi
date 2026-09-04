import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { resetPassword } from "./auth.api";

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => navigate("/login"),
  });
}
