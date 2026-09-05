import { useState, useEffect } from "react";
import { useConductores } from "./useConductores";
import { CrearConductorModal } from "./CrearConductorModal";
import { EditarConductorModal } from "./EditarConductorModal";
import { Pencil, UserPlus, UserRound, Phone, Mail, IdCard } from "lucide-react";
import type { Conductor } from "./conductores.api";

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

export function ConductoresPage() {
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [conductorEditar, setConductorEditar] = useState<Conductor | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBusqueda(inputBusqueda);
    }, 400);
    return () => clearTimeout(timeout);
  }, [inputBusqueda]);

  const { data, isLoading, isFetching, error } = useConductores({ busqueda, page: 1, limit: 20 });

  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Flota propia</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Conductores</h1>
          <p className="mt-2 text-sm text-slate-500">
            Gestiona los conductores de tu flota interna.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalCrearAbierto(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
        >
          <UserPlus size={18} />
          Nuevo conductor
        </button>
      </div>

      {/* Card principal */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Barra de búsqueda */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Conductores registrados</h2>
            <p className="mt-1 text-sm text-slate-500">
              {data?.meta.total ?? 0} conductores en total
            </p>
          </div>

          <div className="w-full lg:w-80">
            <div className="relative">
              <input
                type="text"
                value={inputBusqueda}
                onChange={(e) => setInputBusqueda(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
              {isFetching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  Buscando...
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              <p className="mt-3 text-sm text-slate-500">Cargando conductores...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">Error al cargar conductores</div>
        ) : data?.data.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center px-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <UserRound size={22} className="text-slate-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">No hay conductores</h3>
              <p className="mt-1 text-sm text-slate-500">
                No encontramos conductores con los criterios actuales.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Conductor
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    DNI
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Licencia
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contacto
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
                {data?.data.map((c) => (
                  <tr key={c.in_id_conductor} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colorAvatar(
                            c.in_id_conductor
                          )}`}
                        >
                          {iniciales(c.in_name, c.in_apellido)}
                        </div>
                        <p className="font-semibold text-slate-900">
                          {c.in_name} {c.in_apellido}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">{c.in_dni}</td>

                    <td className="px-5 py-4">
                      {c.in_type_brevete ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-700">
                          <IdCard size={14} className="text-slate-400" />
                          <span>{c.in_type_brevete}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                      {c.in_brevete_num && (
                        <p className="mt-0.5 text-xs text-slate-400">N° {c.in_brevete_num}</p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {c.in_telefono && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone size={13} className="text-slate-400" />
                            {c.in_telefono}
                          </div>
                        )}
                        {c.in_email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail size={13} className="text-slate-400" />
                            {c.in_email}
                          </div>
                        )}
                        {!c.in_telefono && !c.in_email && (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          c.in_status ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${c.in_status ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {c.in_status ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => setConductorEditar(c)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.data.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
            <p className="text-xs text-slate-500">
              Página <span className="font-semibold text-slate-700">{data.meta.page}</span> de{" "}
              <span className="font-semibold text-slate-700">{data.meta.totalPages}</span> —{" "}
              <span className="font-semibold text-slate-700">{data.meta.total}</span> conductores en total
            </p>
          </div>
        )}
      </div>

      <CrearConductorModal isOpen={modalCrearAbierto} onClose={() => setModalCrearAbierto(false)} />
      {conductorEditar && (
        <EditarConductorModal
          key={conductorEditar.in_id_conductor}
          conductor={conductorEditar}
          onClose={() => setConductorEditar(null)}
        />
      )}
    </div>
  );
}