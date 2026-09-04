import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "./auth.api";

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword });
}
