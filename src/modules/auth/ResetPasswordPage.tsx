import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { useResetPassword } from "./useResetPassword";
import { TurnstileWidget } from "./TurnstileWidget";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [errorLocal, setErrorLocal] = useState("");
  const { mutate, isPending, error } = useResetPassword();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorLocal("");

    if (contrasena !== confirmar) {
      setErrorLocal("Las contraseñas no coinciden");
      return;
    }
    if (!captchaToken) return;

    mutate({ token, contrasena, captchaToken });
  }

  const mensajeError =
    errorLocal ||
    (isAxiosError(error)
      ? error.response?.data?.error
      : error
      ? "Error al restablecer la contraseña"
      : null);

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
        <h1 className="mb-6 text-xl font-semibold">Restablecer contraseña</h1>

        {!token ? (
          <p className="mb-4 text-sm text-red-400">
            El enlace no es válido. Solicita uno nuevo.
          </p>
        ) : (
          <>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
            />

            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
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
              {isPending ? "Guardando..." : "Restablecer contraseña"}
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
