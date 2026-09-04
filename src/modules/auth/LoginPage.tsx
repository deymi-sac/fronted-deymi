import { useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { useLogin } from "./useLogin";
import { TurnstileWidget } from "./TurnstileWidget";

export function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const { mutate, isPending, error } = useLogin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaToken) return;
    mutate({ correo, contrasena, captchaToken });
  }

  const mensajeError = isAxiosError(error)
    ? error.response?.data?.error
    : error
    ? "Error al iniciar sesión"
    : null;

  return (
    <div className="relative flex h-screen items-center justify-center bg-black">
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
        <h1 className="mb-6 text-xl font-semibold">Iniciar sesión</h1>

        <input
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
          className="mb-1 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />

        <div className="mb-4 text-right">
          <Link to="/forgot-password" className="text-xs text-white/70 hover:text-white">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <TurnstileWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

        {mensajeError && <p className="mb-4 text-sm text-red-400">{mensajeError}</p>}

        <button
          type="submit"
          disabled={isPending || !captchaToken}
          className="w-full rounded-md bg-white py-2 font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          {isPending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}