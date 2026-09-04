import { useMemo, useState } from "react";
import { useEliminarTransportista } from "./useTransportistas";
import { EditarTransportistaModal } from "./EditarTransportistaModal";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Truck,
  UserRound,
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import { useTransportistas } from "./useTransportistas";
import {
  type Transportista,
} from "./transportistas.api";

export default function TransportistasPage() {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [expandido, setExpandido] = useState<number | null>(null);

  const [transportistaEditar, setTransportistaEditar] = useState<Transportista | null>(null);
  const [transportistaSeleccionado, setTransportistaSeleccionado] = useState<Transportista | null>(null);

  const eliminarTransportista = useEliminarTransportista();

  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useTransportistas({
    busqueda: busqueda.trim() || undefined,
    page: pagina,
    limit: 20,
  });

  const transportistas = useMemo(
  () => data?.data ?? [],
  [data?.data]
);
  const meta = data?.meta;

  const estadisticas = useMemo(() => {
    const total = transportistas.length;

    const homologados = transportistas.filter(
      (transportista) => transportista.tex_status_homolo
    ).length;

    const noHomologados = total - homologados;

    const conductores = transportistas.reduce(
      (totalConductores, transportista) =>
        totalConductores +
        transportista.conductores_terceros.length,
      0
    );

    const unidades = transportistas.reduce(
      (totalUnidades, transportista) =>
        totalUnidades +
        transportista.conductores_terceros.reduce(
          (totalConductor, conductor) =>
            totalConductor +
            conductor.unidades_terceros.length,
          0
        ),
      0
    );

    return {
      total,
      homologados,
      noHomologados,
      conductores,
      unidades,
    };
  }, [transportistas]);

  function toggleExpandir(id: number) {
    setExpandido((actual) => (actual === id ? null : id));
  }

  function abrirDetalle(transportista: Transportista) {
    setTransportistaSeleccionado(transportista);
    setMostrarDetalle(true);
  }

  function handleEliminar(transportista: Transportista) {
    const confirmar = window.confirm(
      `¿Eliminar a "${transportista.tex_razon_social}"? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;
    eliminarTransportista.mutate(transportista.id_transportista);
  }

  function limpiarBusqueda() {
    setBusqueda("");
    setPagina(1);
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      {/* ENCABEZADO */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Transportistas
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gestiona las empresas transportistas, sus
            conductores y unidades de terceros.
          </p>
        </div>

      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Building2 size={20} />}
          title="Transportistas"
          value={estadisticas.total}
          description="Registrados en la página actual"
        />

        <KpiCard
          icon={<CheckCircle2 size={20} />}
          title="Homologados"
          value={estadisticas.homologados}
          description="Empresas homologadas"
        />

        <KpiCard
          icon={<UserRound size={20} />}
          title="Conductores"
          value={estadisticas.conductores}
          description="Conductores de terceros"
        />

        <KpiCard
          icon={<Truck size={20} />}
          title="Unidades"
          value={estadisticas.unidades}
          description="Unidades de terceros"
        />
      </div>

      {/* BUSCADOR */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por razón social, RUC o nombre comercial..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {busqueda && (
            <button
              type="button"
              onClick={limpiarBusqueda}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="text-sm text-slate-500">
              Cargando transportistas...
            </div>
          </div>
        ) : isError ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3">
            <XCircle size={32} className="text-red-500" />

            <p className="text-sm text-slate-600">
              No se pudieron cargar los transportistas.
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              Reintentar
            </button>
          </div>
        ) : transportistas.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-2">
            <Building2
              size={36}
              className="text-slate-300"
            />

            <p className="font-medium text-slate-600">
              No hay transportistas registrados
            </p>

            <p className="text-sm text-slate-400">
              No se encontraron resultados para la búsqueda.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="w-12 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      #
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Empresa transportista
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      RUC
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Conductores
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unidades
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Homologación
                    </th>

                    <th className="w-36 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transportistas.map(
                    (transportista, index) => {
                      const estaExpandido =
                        expandido ===
                        transportista.id_transportista;

                      const cantidadConductores =
                        transportista.conductores_terceros
                          .length;

                      const cantidadUnidades =
                        transportista.conductores_terceros.reduce(
                          (total, conductor) =>
                            total +
                            conductor.unidades_terceros
                              .length,
                          0
                        );

                      return (
                        <TransportistaRow
                          key={transportista.id_transportista}
                          transportista={transportista}
                          numero={(pagina - 1) * 20 + index + 1}
                          estaExpandido={estaExpandido}
                          cantidadConductores={cantidadConductores}
                          cantidadUnidades={cantidadUnidades}
                          onToggle={() => toggleExpandir(transportista.id_transportista)}
                          onDetalle={() => abrirDetalle(transportista)}
                          onEditar={() => setTransportistaEditar(transportista)}
                          onEliminar={() => handleEliminar(transportista)}
                        />
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Página {meta.page} de{" "}
                  {meta.totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    onClick={() =>
                      setPagina((actual) =>
                        Math.max(1, actual - 1)
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    disabled={
                      pagina >= meta.totalPages
                    }
                    onClick={() =>
                      setPagina((actual) =>
                        Math.min(
                          meta.totalPages,
                          actual + 1
                        )
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    {/* MODAL DETALLE */}
      {mostrarDetalle &&
        transportistaSeleccionado && (
          <DetalleTransportistaModal
            transportista={
              transportistaSeleccionado
            }
            onClose={() => {
              setMostrarDetalle(false);
              setTransportistaSeleccionado(null);
            }}
          />
        )}

      {/* MODAL EDITAR */}
      {transportistaEditar && (
        <EditarTransportistaModal
          key={transportistaEditar.id_transportista}
          transportista={transportistaEditar}
          onClose={() => setTransportistaEditar(null)}
        />
      )}
      </div>
      );
}

/* ============================================================
   COMPONENTE KPI
============================================================ */

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
}

function KpiCard({
  icon,
  title,
  value,
  description,
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
          {icon}
        </div>

        <span className="text-sm font-medium text-slate-500">
          {title}
        </span>
      </div>

      <p className="text-2xl font-semibold text-slate-800">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   FILA TRANSPORTISTA
============================================================ */

interface TransportistaRowProps {
  transportista: Transportista;
  numero: number;
  estaExpandido: boolean;
  cantidadConductores: number;
  cantidadUnidades: number;
  onToggle: () => void;
  onDetalle: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}

function TransportistaRow({
  transportista,
  numero,
  estaExpandido,
  cantidadConductores,
  cantidadUnidades,
  onToggle,
  onDetalle,
  onEditar,
  onEliminar,
}: TransportistaRowProps) {
  return (
    <>
      <tr className="border-b border-slate-100 transition hover:bg-slate-50">
        <td className="px-4 py-4 text-center text-sm text-slate-500">
          {numero}
        </td>

        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={
                estaExpandido
                  ? "Ocultar detalle"
                  : "Ver conductores y unidades"
              }
            >
              {estaExpandido ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>

            <div>
              <p className="font-medium text-slate-800">
                {transportista.tex_razon_social}
              </p>

              {transportista.tex_nombre_comercial && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {transportista.tex_nombre_comercial}
                </p>
              )}
            </div>
          </div>
        </td>

        <td className="px-4 py-4 text-sm text-slate-600">
          {transportista.tex_ruc}
        </td>

        <td className="px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserRound
              size={16}
              className="text-slate-400"
            />

            {cantidadConductores}
          </div>
        </td>

        <td className="px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Truck
              size={16}
              className="text-slate-400"
            />

            {cantidadUnidades}
          </div>
        </td>

        <td className="px-4 py-4 text-center">
          {transportista.tex_status_homolo ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <CheckCircle2 size={14} />
              Homologado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              <XCircle size={14} />
              No homologado
            </span>
          )}
        </td>

        <td className="px-4 py-4">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={onDetalle}
              title="Ver detalle"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Eye size={17} />
            </button>

            <button
              type="button"
              title="Editar"
              onClick={onEditar}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Pencil size={17} />
            </button>

            <button
              type="button"
              title="Eliminar"
              onClick={onEliminar}
              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={17} />
            </button>

          </div>
        </td>
      </tr>

      {estaExpandido && (
        <tr className="border-b border-slate-200 bg-slate-50">
          <td colSpan={7} className="px-8 py-5">
            <DetalleExpandido
              transportista={transportista}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/* ============================================================
   DETALLE EXPANDIDO
============================================================ */

function DetalleExpandido({
  transportista,
}: {
  transportista: Transportista;
}) {
  const conductores =
    transportista.conductores_terceros;

  if (conductores.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <UserRound
          size={28}
          className="mx-auto mb-2 text-slate-300"
        />

        <p className="text-sm font-medium text-slate-600">
          No hay conductores registrados
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Esta empresa todavía no tiene conductores de
          terceros asociados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            Conductores y unidades asignadas
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Información registrada para{" "}
            {transportista.tex_razon_social}
          </p>
        </div>

        <span className="text-xs text-slate-400">
          {conductores.length} conductor
          {conductores.length !== 1 ? "es" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {conductores.map((conductor) => (
          <div
            key={conductor.in_id_conductor}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* CONDUCTOR */}
              <div className="lg:col-span-4">
                <div className="mb-2 flex items-center gap-2">
                  <UserRound
                    size={17}
                    className="text-slate-400"
                  />

                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Conductor
                  </span>
                </div>

                <p className="font-medium text-slate-800">
                  {conductor.in_name}{" "}
                  {conductor.in_apellido}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  DNI: {conductor.in_dni}
                </p>

                {conductor.in_brevete_num && (
                  <p className="mt-1 text-xs text-slate-400">
                    Brevete:{" "}
                    {conductor.in_brevete_num}
                    {conductor.in_type_brevete
                      ? ` · ${conductor.in_type_brevete}`
                      : ""}
                  </p>
                )}

                {conductor.in_observaciones && (
                  <p className="mt-2 text-xs text-slate-400">
                    {conductor.in_observaciones}
                  </p>
                )}
              </div>

              {/* UNIDADES */}
              <div className="lg:col-span-8">
                <div className="mb-2 flex items-center gap-2">
                  <Truck
                    size={17}
                    className="text-slate-400"
                  />

                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Unidades asignadas
                  </span>
                </div>

                {conductor.unidades_terceros.length ===
                0 ? (
                  <p className="text-sm text-slate-400">
                    Sin unidades registradas.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {conductor.unidades_terceros.map(
                      (unidad) => (
                        <div
                          key={
                            unidad.id_unit_terceros
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-slate-700">
                              {
                                unidad.unit_type_vehiculo
                              }
                            </span>

                            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                              {unidad.unit_placa}
                            </span>
                          </div>

                          {unidad.unit_placa_secundaria && (
                            <p className="mt-2 text-xs text-slate-400">
                              Placa secundaria:{" "}
                              {
                                unidad.unit_placa_secundaria
                              }
                            </p>
                          )}

                          {unidad.unit_observaciones && (
                            <p className="mt-2 text-xs text-slate-400">
                              {
                                unidad.unit_observaciones
                              }
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   MODAL DETALLE
============================================================ */

function DetalleTransportistaModal({
  transportista,
  onClose,
}: {
  transportista: Transportista;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {transportista.tex_razon_social}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              RUC: {transportista.tex_ruc}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="max-h-[calc(90vh-100px)] overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem
              label="Razón social"
              value={
                transportista.tex_razon_social
              }
            />

            <InfoItem
              label="RUC"
              value={transportista.tex_ruc}
            />

            <InfoItem
              label="Nombre comercial"
              value={
                transportista.tex_nombre_comercial ??
                "—"
              }
            />

            <InfoItem
              label="Teléfono"
              value={
                transportista.tex_telefono ?? "—"
              }
            />

            <InfoItem
              label="Correo"
              value={
                transportista.tex_email ?? "—"
              }
            />

            <InfoItem
              label="Homologación"
              value={
                transportista.tex_status_homolo
                  ? "Homologado"
                  : "No homologado"
              }
            />

            <div className="md:col-span-2">
              <InfoItem
                label="Observaciones"
                value={
                  transportista.tex_observaciones ??
                  "Sin observaciones"
                }
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <DetalleExpandido
              transportista={transportista}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="text-sm text-slate-700">
        {value}
      </p>
    </div>
  );
}