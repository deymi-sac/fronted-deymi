import { useState } from "react";
import { isAxiosError } from "axios";
import { useCambiarPasswordUsuario } from "./UseUsuarios";
import type { Usuario } from "./usuarios.api";

interface CambiarPasswordModalProps {
  usuario: Usuario;
  onClose: () => void;
}

export function CambiarPasswordModal({ usuario, onClose }: CambiarPasswordModalProps) {
  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const { mutate, isPending, error, isSuccess } = useCambiarPasswordUsuario();

  const tieneOchoCaracteres = contrasena.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(contrasena);
  const tieneNumero = /[0-9]/.test(contrasena);
  const tieneEspecial = /[^A-Za-z0-9]/.test(contrasena);
  const coinciden = contrasena.length > 0 && contrasena === repetir;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coinciden) return;
    mutate({ id: usuario.user_id, nuevaContrasena: contrasena });
  }

  const mensajeError = isAxiosError(error)
    ? error.response?.data?.error
    : error
    ? "Error al cambiar contraseña"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          Usuario: <span className="font-medium text-gray-800">{usuario.nombre} {usuario.apellido}</span>
        </p>

        {isSuccess ? (
          <div>
            <p className="mb-4 text-sm text-green-600">Contraseña actualizada correctamente ✅</p>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-[#18193B] px-4 py-2 text-sm font-medium text-white hover:bg-[#18193B]/90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Repetir contraseña"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {repetir.length > 0 && !coinciden && (
              <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
            )}

            <ul className="space-y-1 text-xs text-gray-500">
              <li className={tieneOchoCaracteres ? "text-green-600" : ""}>○ 8 caracteres mínimo</li>
              <li className={tieneMayuscula ? "text-green-600" : ""}>○ Mínimo 1 mayúscula</li>
              <li className={tieneNumero ? "text-green-600" : ""}>○ Mínimo 1 número</li>
              <li className={tieneEspecial ? "text-green-600" : ""}>○ Mínimo 1 carácter especial</li>
            </ul>

            {mensajeError && <p className="text-sm text-red-500">{mensajeError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !coinciden}
                className="rounded-md bg-[#18193B] px-4 py-2 text-sm font-medium text-white hover:bg-[#18193B]/90 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}