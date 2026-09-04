import { useState } from "react";
import { useUsuarios, useActualizarUsuario } from "./UseUsuarios";
import { EditarUsuarioModal } from "./EditarUsuarioModal";
import { CambiarPasswordModal } from "./CambiosPasswordModal";
import { CrearUsuarioModal } from "./CrearUsuarioModal";
import { Pencil, KeyRound, Power, PowerOff, UserPlus } from "lucide-react";
import type { Usuario } from "./usuarios.api";

function iniciales(nombre: string, apellido: string) {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

function colorAvatar(id: number) {
  const colores = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  return colores[id % colores.length];
}

export function UsuariosPage() {
  const { data, isLoading, error } = useUsuarios();
  const actualizar = useActualizarUsuario();

  const [busqueda, setBusqueda] = useState("");
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [usuarioPassword, setUsuarioPassword] = useState<Usuario | null>(null);

  const usuarios = Array.isArray(data) ? data : data?.data ?? [];

  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = busqueda.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(texto) ||
      u.apellido.toLowerCase().includes(texto) ||
      u.correo.toLowerCase().includes(texto) ||
      u.dni.includes(texto)
    );
  });

  function toggleActivo(usuario: Usuario) {
    actualizar.mutate({ id: usuario.user_id, payload: { activo: !usuario.activo } });
  }

  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Administración</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Usuarios</h1>
          <p className="mt-2 text-sm text-slate-500">
            Gestiona las cuentas de acceso al sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalCrearAbierto(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
        >
          <UserPlus size={18} />
          Nuevo usuario
        </button>
      </div>

      {/* Card principal */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Barra de búsqueda */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Cuentas registradas</h2>
            <p className="mt-1 text-sm text-slate-500">
              {usuariosFiltrados.length} de {usuarios.length} usuarios
            </p>
          </div>

          <div className="w-full lg:w-80">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo o DNI..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              <p className="mt-3 text-sm text-slate-500">Cargando usuarios...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">Error al cargar usuarios</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center px-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <span className="text-xl text-slate-400">—</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">No hay usuarios</h3>
              <p className="mt-1 text-sm text-slate-500">
                No encontramos usuarios con los criterios actuales.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Usuario
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    DNI
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rol
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.user_id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colorAvatar(
                            u.user_id
                          )}`}
                        >
                          {iniciales(u.nombre, u.apellido)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {u.nombre} {u.apellido}
                          </p>
                          <p className="text-xs text-slate-400">{u.correo}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">{u.dni}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          u.roles.nombre_rol === "Administrador"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.roles.nombre_rol}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          u.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${u.activo ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => setUsuarioEditar(u)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          title="Cambiar contraseña"
                          onClick={() => setUsuarioPassword(u)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <KeyRound size={17} />
                        </button>

                        <button
                          type="button"
                          title={u.activo ? "Desactivar" : "Activar"}
                          onClick={() => toggleActivo(u)}
                          disabled={actualizar.isPending}
                          className={`rounded-lg p-2 transition disabled:opacity-50 ${
                            u.activo
                              ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
                              : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                          }`}
                        >
                          {u.activo ? <PowerOff size={17} /> : <Power size={17} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && usuariosFiltrados.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
            <p className="text-xs text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{usuariosFiltrados.length}</span> usuarios.
            </p>
          </div>
        )}
      </div>

      <CrearUsuarioModal isOpen={modalCrearAbierto} onClose={() => setModalCrearAbierto(false)} />

      {usuarioEditar && (
        <EditarUsuarioModal key={usuarioEditar.user_id} usuario={usuarioEditar} onClose={() => setUsuarioEditar(null)} />
      )}
      {usuarioPassword && (
        <CambiarPasswordModal
          key={`pwd-${usuarioPassword.user_id}`}
          usuario={usuarioPassword}
          onClose={() => setUsuarioPassword(null)}
        />
      )}
    </div>
  );
}