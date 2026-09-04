import { useState } from "react";
import { isAxiosError } from "axios";
import { useCrearUsuario } from "./useCrearUsuario";

export function CrearUsuarioPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [dni, setDni] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [repetirContrasena, setRepetirContrasena] = useState("");
  const [idRol, setIdRol] = useState(2);

  const { mutate, isPending, error } = useCrearUsuario();

  const tieneOchoCaracteres = contrasena.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(contrasena);
  const tieneCaracterEspecial = /[^A-Za-z0-9]/.test(contrasena);
  const contrasenasCoinciden = contrasena.length > 0 && contrasena === repetirContrasena;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contrasenasCoinciden) return;
    mutate({ nombre, apellido, dni, correo, contrasena, id_rol: idRol });
  }

  const mensajeError = isAxiosError(error)
    ? error.response?.data?.error
    : error
    ? "Error al registrar usuario"
    : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black">
      <img
        src="/login-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-80"
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-black/50 p-8 text-white backdrop-blur-md"
      >
        <h1 className="mb-6 text-xl font-semibold">Registrar usuario</h1>

        <input
          type="text"
          placeholder="Nombres"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />

        <input
          type="text"
          placeholder="Apellidos"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />

        <input
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />

        <input
          type="text"
          placeholder="DNI"
          value={dni}
          maxLength={8}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
          required
          className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />

        <select
          value={idRol}
          onChange={(e) => setIdRol(Number(e.target.value))}
          className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 text-white focus:outline-none focus:border-white"
        >
          <option value={2} className="text-black">Coordinador de transporte</option>
          <option value={1} className="text-black">Administrador</option>
        </select>

        <input
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />

        <input
          type="password"
          placeholder="Repetir contraseña"
          value={repetirContrasena}
          onChange={(e) => setRepetirContrasena(e.target.value)}
          required
          className="mb-1 w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 placeholder-white/70 focus:outline-none focus:border-white"
        />
        {repetirContrasena.length > 0 && !contrasenasCoinciden && (
          <p className="mb-2 text-xs text-red-400">Las contraseñas no coinciden</p>
        )}

        <ul className="mb-6 mt-3 space-y-1 text-xs text-white/70">
          <li className={tieneOchoCaracteres ? "text-green-400" : ""}>○ 8 caracteres mínimo</li>
          <li className={tieneMayuscula ? "text-green-400" : ""}>○ Mínimo 1 mayúscula</li>
          <li className={tieneCaracterEspecial ? "text-green-400" : ""}>
            ○ Mínimo 1 carácter especial
          </li>
        </ul>

        {mensajeError && <p className="mb-4 text-sm text-red-400">{mensajeError}</p>}

        <button
          type="submit"
          disabled={isPending || !contrasenasCoinciden}
          className="w-full rounded-md bg-white py-2 font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          {isPending ? "Registrando..." : "Registrar"}
        </button>
      </form>
    </div>
  );
}