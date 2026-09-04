import { useState } from "react";
import { isAxiosError } from "axios";
import { useCrearUsuario } from "./useCrearUsuario";

interface CrearUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CrearUsuarioModal({ isOpen, onClose }: CrearUsuarioModalProps) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [dni, setDni] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [repetirContrasena, setRepetirContrasena] = useState("");
  const [idRol, setIdRol] = useState(2);

  const { mutate, isPending, error, reset } = useCrearUsuario();

  if (!isOpen) return null;

  const tieneOchoCaracteres = contrasena.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(contrasena);
  const tieneNumero = /[0-9]/.test(contrasena);
  const tieneCaracterEspecial = /[^A-Za-z0-9]/.test(contrasena);
  const contrasenasCoinciden = contrasena.length > 0 && contrasena === repetirContrasena;

  function limpiarFormulario() {
    setNombre("");
    setApellido("");
    setCorreo("");
    setDni("");
    setContrasena("");
    setRepetirContrasena("");
    setIdRol(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contrasenasCoinciden) return;

    mutate(
      { nombre, apellido, dni, correo, contrasena, id_rol: idRol },
      {
        onSuccess: () => {
          limpiarFormulario();
          onClose();
        },
      }
    );
  }

  function handleClose() {
    reset();
    onClose();
  }

  const mensajeError = isAxiosError(error)
    ? error.response?.data?.error
    : error
    ? "Error al registrar usuario"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Registrar usuario</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombres"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Apellidos"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <input
            type="email"
            placeholder="Correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <input
            type="text"
            placeholder="DNI"
            value={dni}
            maxLength={8}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <select
            value={idRol}
            onChange={(e) => setIdRol(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value={2}>Coordinador de transporte</option>
            <option value={1}>Administrador</option>
          </select>

          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <input
            type="password"
            placeholder="Repetir contraseña"
            value={repetirContrasena}
            onChange={(e) => setRepetirContrasena(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {repetirContrasena.length > 0 && !contrasenasCoinciden && (
            <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
          )}

          <ul className="space-y-1 text-xs text-gray-500">
            <li className={tieneOchoCaracteres ? "text-green-600" : ""}>○ 8 caracteres mínimo</li>
            <li className={tieneMayuscula ? "text-green-600" : ""}>○ Mínimo 1 mayúscula</li>
            <li className={tieneNumero ? "text-green-600" : ""}>○ Mínimo 1 número</li>
            <li className={tieneCaracterEspecial ? "text-green-600" : ""}>○ Mínimo 1 carácter especial</li>
          </ul>

          {mensajeError && <p className="text-sm text-red-500">{mensajeError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !contrasenasCoinciden}
              className="rounded-md bg-[#18193B] px-4 py-2 text-sm font-medium text-white hover:bg-[#18193B]/90 disabled:opacity-50"
            >
              {isPending ? "Registrando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}