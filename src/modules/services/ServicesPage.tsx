import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  obtenerServicios,
  cambiarEstadoServicio,
  reasignarConductor,
  eliminarServicio,
  type Servicio,
} from "./services.api";

import { NuevoServicioModal } from "./NuevoServicioModal";

import {
  listarConductores,
} from "../conductores/conductores.api";

import {
  listarUnidades,
} from "../unidades/unidades.api";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatearFecha } from "../../utils/fecha.utils";
const ESTADO_PENDIENTE = 1;
const ESTADO_EN_PROCESO = 2;
const ESTADO_COMPLETADO = 3;
const ESTADO_CANCELADO = 4;

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function obtenerUnidad(servicio: Servicio) {
  // Unidad propia
  if (servicio.unidades) {
    const principal = servicio.unidades.uni_placa ?? "";
    const secundaria = servicio.unidades.uni_placa_secundaria ?? "";

    return secundaria
      ? `${principal} / ${secundaria}`
      : principal || "—";
  }

  // Unidad de tercero
  if (servicio.unidades_terceros) {
    const principal = servicio.unidades_terceros.unit_placa ?? "";
    const secundaria =
      servicio.unidades_terceros.unit_placa_secundaria ?? "";

    return secundaria
      ? `${principal} / ${secundaria}`
      : principal || "—";
  }

  return "—";
}

function obtenerConductor(servicio: Servicio) {
  // Conductor interno
  const conductorInterno = servicio.servicio_conductores?.find(
    (asignacion) => asignacion.estado === "Activo",
  )?.conductores_interno;

  if (conductorInterno) {
    return {
      nombre: `${conductorInterno.in_name} ${conductorInterno.in_apellido}`,
      brevete: conductorInterno.in_brevete_num ?? null,
    };
  }

  // Conductor tercero
  const conductorTercero =
    servicio.unidades_terceros?.conductores_terceros;

  if (conductorTercero) {
    return {
      nombre: `${conductorTercero.in_name} ${conductorTercero.in_apellido}`,
      brevete: conductorTercero.in_brevete_num ?? null,
    };
  }

  return {
    nombre: "Sin asignar",
    brevete: null,
  };
}

function obtenerTransportista(servicio: Servicio) {
  if (servicio.unidades_terceros) {
    return "Transportista tercero";
  }

  return "DEYMI SAC";
}

// ---------------------------------------------------------
// KPI Card
// ---------------------------------------------------------

interface KpiCardProps {
  titulo: string;
  valor: number;
  descripcion: string;
}

function KpiCard({
  titulo,
  valor,
  descripcion,
}: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          {valor}
        </p>

        <div className="rounded-xl bg-slate-100 px-3 py-2">
          <span className="text-xs font-semibold text-slate-600">
            Activos
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {descripcion}
      </p>
    </div>
  );
}



// ---------------------------------------------------------
// Página
// ---------------------------------------------------------

export default function ServicesPage() {
  const queryClient = useQueryClient();

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [cambiandoEstado, setCambiandoEstado] =
  useState<number | null>(null);
  const [cambiandoConductor, setCambiandoConductor] =
  useState<number | null>(null);

  const [eliminandoServicio, setEliminandoServicio] =
    useState<number | null>(null);

  const [servicioConductorAbierto, setServicioConductorAbierto] =
    useState<Servicio | null>(null);

  const [nuevoConductor, setNuevoConductor] =
    useState<number | null>(null);
  const [nuevoServicioAbierto, setNuevoServicioAbierto] =
    useState(false);

  const [servicioSeleccionado, setServicioSeleccionado] =
  useState<Servicio | null>(null);

  /*
   * Se utiliza para volver a ejecutar la carga manual de la tabla
   * después de crear un servicio.
   *
   * Esto evita volver a introducir una función cargarServicios
   * dentro del useEffect y, por tanto, evita el warning de ESLint.
   */
  const [recarga, setRecarga] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const LIMITE_POR_PAGINA = 20;

  // -------------------------------------------------------
  // Servicios en proceso
  // -------------------------------------------------------

    const serviciosEnProcesoQuery = useQuery({
      queryKey: ["servicios", "en-proceso"],
      queryFn: () =>
        obtenerServicios({
          id_estado: ESTADO_EN_PROCESO,
          page: 1,
          limit: 1000,
        }),
    });

  // -------------------------------------------------------
  // Conductores activos
  // -------------------------------------------------------

  const conductoresQuery = useQuery({
    queryKey: ["conductores", "activos"],
    queryFn: () =>
      listarConductores({
        activo: true,
        page: 1,
        limit: 1000,
      }),
  });

  // -------------------------------------------------------
  // Unidades
  // -------------------------------------------------------

  const unidadesQuery = useQuery({
    queryKey: ["unidades", "disponibilidad"],
    queryFn: () =>
      listarUnidades({
        page: 1,
        limit: 1000,
      }),
  });

 

  // -------------------------------------------------------
  // Conductores disponibles
  // -------------------------------------------------------

    const conductoresDisponibles = useMemo(() => {
    const conductores =
        conductoresQuery.data?.data ?? [];

    return conductores.filter(
        (conductor) => conductor.in_status,
    );
    }, [conductoresQuery.data]);


  // -------------------------------------------------------
  // Unidades disponibles
  // -------------------------------------------------------

    const unidadesDisponibles = useMemo(() => {
    const unidades =
        unidadesQuery.data?.data ?? [];

    return unidades.filter((unidad) => {
        const estado =
        unidad.estados_unidad?.nombre_estado
            ?.toLowerCase()
            .trim() ?? "";

        return (
        estado === "disponible" ||
        estado === "activo" ||
        estado === "operativo"
        );
    });
    }, [unidadesQuery.data]);
  // -------------------------------------------------------
  // KPI: servicios en proceso
  // -------------------------------------------------------

  const serviciosEnProceso =
    serviciosEnProcesoQuery.data?.meta.total ?? 0;

  // -------------------------------------------------------
  // Carga de tabla
  // -------------------------------------------------------

  useEffect(() => {
  const timeout = setTimeout(async () => {
    try {
      setCargando(true);
      setError("");

      const response = await obtenerServicios({
        busqueda,
        page: pagina,
        limit: LIMITE_POR_PAGINA,
      });

      setServicios(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error(
        "Error cargando servicios:",
        error,
      );

      setError(
        "No se pudieron cargar los servicios.",
      );
    } finally {
      setCargando(false);
    }
  }, 300);

  return () => clearTimeout(timeout);
}, [busqueda, recarga, pagina]);
  // -------------------------------------------------------
  // Crear servicio
  // -------------------------------------------------------

  function manejarServicioCreado() {
    setNuevoServicioAbierto(false);

    // Recarga la tabla
    setRecarga((actual) => actual + 1);

    // Actualiza KPIs de servicios
    queryClient.invalidateQueries({
      queryKey: ["servicios"],
    });

    // Actualiza disponibilidad
    queryClient.invalidateQueries({
      queryKey: ["conductores"],
    });

    queryClient.invalidateQueries({
      queryKey: ["unidades"],
    });
  }

  async function manejarCambioEstado(
  idServicio: number,
  nuevoEstado: number,
) {
  try {
    setCambiandoEstado(idServicio);
    setError("");

    await cambiarEstadoServicio(idServicio, {
      id_estado: nuevoEstado,
    });


    // Actualiza la tabla
    setRecarga((actual) => actual + 1);

    // Actualiza los datos relacionados con servicios
    queryClient.invalidateQueries({
      queryKey: ["servicios"],
    });

    // Actualiza los KPIs
    queryClient.invalidateQueries({
      queryKey: ["conductores"],
    });

    queryClient.invalidateQueries({
      queryKey: ["unidades"],
    });
  } catch (error) {
    console.error(
      "Error cambiando estado del servicio:",
      error,
    );

    setError(
      "No se pudo cambiar el estado del servicio.",
    );
  } finally {
    setCambiandoEstado(null);
  }
}
  

async function manejarCambioConductor() {
  if (!servicioConductorAbierto || !nuevoConductor) {
    return;
  }

  try {
    setCambiandoConductor(
      servicioConductorAbierto.id_service,
    );

    setError("");

    await reasignarConductor(
      servicioConductorAbierto.id_service,
      {
        in_id_conductor: nuevoConductor,
      },
    );

    setServicioConductorAbierto(null);
    setNuevoConductor(null);

    // Actualizar tabla
    setRecarga((actual) => actual + 1);

    // Actualizar queries
    queryClient.invalidateQueries({
      queryKey: ["servicios"],
    });

    queryClient.invalidateQueries({
      queryKey: ["conductores"],
    });
  } catch (error) {
    console.error(
      "Error cambiando conductor:",
      error,
    );

    setError(
      "No se pudo cambiar el conductor.",
    );
  } finally {
    setCambiandoConductor(null);
  }
}

    async function manejarEliminarServicio(
  idServicio: number,
) {
  const confirmar = window.confirm(
    "¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.",
  );

  if (!confirmar) {
    return;
  }

  try {
    setEliminandoServicio(idServicio);
    setError("");

    await eliminarServicio(idServicio);

    // Actualizar tabla
    setRecarga((actual) => actual + 1);

    // Actualizar KPIs
    queryClient.invalidateQueries({
      queryKey: ["servicios"],
    });

    queryClient.invalidateQueries({
      queryKey: ["conductores"],
    });

    queryClient.invalidateQueries({
      queryKey: ["unidades"],
    });
  } catch (error) {
    console.error(
      "Error eliminando servicio:",
      error,
    );

    setError(
      "No se pudo eliminar el servicio.",
    );
  } finally {
    setEliminandoServicio(null);
  }
}

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-8">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Gestión operativa
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Asignación de Unidades
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gestiona servicios, unidades y conductores
            asignados.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setNuevoServicioAbierto(true)
          }
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
        >
          + Nuevo servicio
        </button>
      </div>

      {/* ===================================================
          KPIs
      =================================================== */}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          titulo="Servicios en proceso"
          valor={serviciosEnProceso}
          descripcion="Servicios actualmente en ejecución."
        />

        <KpiCard
          titulo="Conductores propios disponibles"
          valor={conductoresDisponibles.length}
          descripcion="Conductores activos sin servicio asignado."
        />

        <KpiCard
          titulo="Unidades propias disponibles"
          valor={unidadesDisponibles.length}
          descripcion="Unidades disponibles para asignación."
        />
      </div>

      {/* ===================================================
          TABLA
      =================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header tabla */}

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Servicios
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Consulta y gestiona los servicios registrados.
            </p>
          </div>

          <div className="w-full lg:w-80">
            <div className="relative">
              <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPagina(1);
                  }}
                  placeholder="Buscar por referencia o cliente..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
            </div>
          </div>
        </div>

        {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">
                Página {meta.page} de {meta.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pagina >= meta.totalPages}
                  onClick={() => setPagina((actual) => Math.min(meta.totalPages, actual + 1))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        {/* Error */}

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}

        {cargando ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

              <p className="mt-3 text-sm text-slate-500">
                Cargando servicios...
              </p>
            </div>
          </div>
        ) : servicios.length === 0 ? (
          /* Empty state */

          <div className="flex min-h-[300px] items-center justify-center px-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <span className="text-xl text-slate-400">
                  —
                </span>
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No hay servicios
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No encontramos servicios con los
                criterios actuales.
              </p>
            </div>
          </div>
        ) : (
          /* Table */

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Referencia de servicio
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cliente
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unidad asignada
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Empresa transportista
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Conductor asignado
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado del servicio
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha creación
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {servicios.map(
                  (servicio, index) => {
                    const conductor =
                      obtenerConductor(servicio);

                    return (
                      <tr
                        key={servicio.id_service}
                        className="transition hover:bg-slate-50"
                      >
                        {/* # */}

                        <td className="px-5 py-4 text-sm font-medium text-slate-500">
                          {index + 1}
                        </td>

                        {/* Referencia */}

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {servicio.referencia}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            ID #{servicio.id_service}
                          </div>
                        </td>

                        {/* Cliente */}

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {servicio.cliente || "—"}
                        </td>

                        {/* Unidad */}

                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-slate-800">
                            {obtenerUnidad(servicio)}
                          </span>
                        </td>

                        {/* Transportista */}

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {obtenerTransportista(
                            servicio,
                          )}
                        </td>

                        {/* Conductor */}

                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-slate-800">
                            {conductor.nombre}
                          </div>

                          {conductor.brevete && (
                            <div className="mt-1 text-xs text-slate-400">
                              N° brevete:{" "}
                              {conductor.brevete}
                            </div>
                          )}
                        </td>

                        {/* Estado */}

                        <td className="px-5 py-4">
                            <select
                                value={servicio.id_estado}
                                disabled={
                                cambiandoEstado === servicio.id_service
                                }
                                onChange={(e) =>
                                manejarCambioEstado(
                                    servicio.id_service,
                                    Number(e.target.value),
                                )
                                }
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition ${
                                servicio.id_estado === ESTADO_PENDIENTE
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : servicio.id_estado === ESTADO_EN_PROCESO
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : servicio.id_estado === ESTADO_COMPLETADO
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : servicio.id_estado === ESTADO_CANCELADO
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-slate-200 bg-slate-50 text-slate-600"
                                }`}
                            >
                                <option value={ESTADO_PENDIENTE}>
                                Pendiente
                                </option>

                                <option value={ESTADO_EN_PROCESO}>
                                En proceso
                                </option>

                                <option value={ESTADO_COMPLETADO}>
                                Completado
                                </option>

                                <option value={ESTADO_CANCELADO}>
                                Cancelado
                                </option>
                            </select>

                            {cambiandoEstado === servicio.id_service && (
                                <span className="ml-2 text-xs text-slate-400">
                                Guardando...
                                </span>
                            )}
                            </td>

                        {/* Fecha */}

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatearFecha(
                            servicio.fecha,
                          )}
                        </td>

                 {/* Acciones */}
<td className="px-5 py-4">
  <div className="flex items-center gap-2">

    {/* Ver */}
    <button
      type="button"
      title="Ver servicio"
      
      onClick={() => {
        setServicioSeleccionado(servicio);
      }}

      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
    >
      <Eye size={18} />
    </button>

    {/* Editar conductor */}
    {!servicio.unidades_terceros && (
      <button
        type="button"
        title="Editar conductor"
        onClick={() => {
          setServicioConductorAbierto(servicio);
          setNuevoConductor(null);
        }}
        disabled={
          cambiandoConductor === servicio.id_service
        }
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cambiandoConductor === servicio.id_service ? (
          <span className="text-xs">...</span>
        ) : (
          <Pencil size={18} />
        )}
      </button>
    )}

    {/* Eliminar */}
    <button
      type="button"
      title="Eliminar servicio"
      onClick={() =>
        manejarEliminarServicio(servicio.id_service)
      }
      disabled={
        eliminandoServicio === servicio.id_service
      }
      className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {eliminandoServicio === servicio.id_service ? (
        <span className="text-xs">...</span>
      ) : (
        <Trash2 size={18} />
      )}
    </button>

  </div>
</td>


                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}

        {!cargando &&
          servicios.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
              <p className="text-xs text-slate-500">
                Mostrando{" "}
                <span className="font-semibold text-slate-700">
                  {servicios.length}
                </span>{" "}
                servicios.
              </p>
            </div>
          )}
      </div>

{/* ===================================================
    MODAL VER SERVICIO
=================================================== */}

{servicioSeleccionado && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Detalle del servicio
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            {servicioSeleccionado.referencia}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            ID #{servicioSeleccionado.id_service}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setServicioSeleccionado(null)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      {/* Información */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cliente
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {servicioSeleccionado.cliente || "—"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Unidad
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {obtenerUnidad(servicioSeleccionado)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Conductor
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {obtenerConductor(servicioSeleccionado).nombre}
          </p>

          {obtenerConductor(servicioSeleccionado).brevete && (
            <p className="mt-1 text-xs text-slate-400">
              Brevete:{" "}
              {obtenerConductor(servicioSeleccionado).brevete}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Transportista
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {obtenerTransportista(servicioSeleccionado)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Fecha de creación
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatearFecha(servicioSeleccionado.fecha)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Estado
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {servicioSeleccionado.id_estado === ESTADO_PENDIENTE
              ? "Pendiente"
              : servicioSeleccionado.id_estado === ESTADO_EN_PROCESO
              ? "En proceso"
              : servicioSeleccionado.id_estado === ESTADO_COMPLETADO
              ? "Completado"
              : servicioSeleccionado.id_estado === ESTADO_CANCELADO
              ? "Cancelado"
              : "Desconocido"}
          </p>
        </div>

      </div>

             {/* Observaciones */}
<div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
    Observaciones
  </p>

  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
    {servicioSeleccionado.observaciones || "Sin observaciones"}
  </p>
</div>

      {/* Footer */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setServicioSeleccionado(null)}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Cerrar
        </button>
      </div>

    </div>
  </div>
)}
      {/* ===================================================
    MODAL CAMBIAR CONDUCTOR
=================================================== */}

{servicioConductorAbierto && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">
          Gestión del servicio
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Cambiar conductor
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Selecciona el nuevo conductor para el
          servicio{" "}
          <span className="font-semibold text-slate-700">
            {servicioConductorAbierto.referencia}
          </span>
          .
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Nuevo conductor
        </label>

        <select
          value={nuevoConductor ?? ""}
          onChange={(e) =>
            setNuevoConductor(
              e.target.value
                ? Number(e.target.value)
                : null,
            )
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          <option value="">
            Selecciona un conductor
          </option>

          {conductoresDisponibles.map(
            (conductor) => (
              <option
                key={conductor.in_id_conductor}
                value={conductor.in_id_conductor}
              >
                {conductor.in_name}{" "}
                {conductor.in_apellido}
                {" — DNI "}
                {conductor.in_dni}
              </option>
            ),
          )}
        </select>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setServicioConductorAbierto(null);
            setNuevoConductor(null);
          }}
          disabled={
            cambiandoConductor !== null
          }
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={manejarCambioConductor}
          disabled={
            !nuevoConductor ||
            cambiandoConductor !== null
          }
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cambiandoConductor !== null
            ? "Guardando..."
            : "Guardar cambio"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* ===================================================
          MODAL NUEVO SERVICIO
      =================================================== */}

      <NuevoServicioModal
        abierto={nuevoServicioAbierto}
        unidades={unidadesDisponibles}
        conductores={conductoresDisponibles}
        onCerrar={() =>
          setNuevoServicioAbierto(false)
        }
        onCreado={manejarServicioCreado}
      />
    </div>
  );
}