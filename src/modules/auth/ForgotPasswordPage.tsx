import { useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { useForgotPassword } from "./useForgotPassword";
import { TurnstileWidget } from "./TurnstileWidget";

export function ForgotPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const { mutate, isPending, isSuccess, error } = useForgotPassword();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaToken) return;
    mutate({ correo, captchaToken });
  }

  const mensajeError = isAxiosError(error)
    ? error.response?.data?.error
    : error
    ? "Error al solicitar la recuperación"
    : null;

  return (
    <div className="relative flex h-screen items-center justify-center bg-black px-4">
      <img
        src="/bg-login.avif"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-80"
      />

      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-8 py-6 text-white">
        <span className="text-lg font-semibold">DeymiTool</span>
      </header>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-black/50 p-8 text-white backdrop-blur-md"
      >
        <h1 className="mb-2 text-xl font-semibold">Recuperar contraseña</h1>

        {isSuccess ? (
          <p className="mb-4 text-sm text-white/80">
            Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-white/70">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <input
              type="email"
              placeholder="Correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
            />

            <TurnstileWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

            {mensajeError && <p className="mb-4 text-sm text-red-400">{mensajeError}</p>}

            <button
              type="submit"
              disabled={isPending || !captchaToken}
              className="w-full rounded-md bg-white py-2 font-medium text-black hover:bg-white/90 disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Enviar enlace"}
            </button>
          </>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-white/70 hover:text-white">
            Volver a iniciar sesión
          </Link>
        </div>
      </form>
    </div>
  );
}
