import { useState } from "react";
import {
  useDocumentosConductor,
  useDocumentosUnidad,
  useProximosAVencer,
  useEliminarDocumentoConductor,
  useEliminarDocumentoUnidad,
} from "./useDocumentos";
import { CrearDocumentoModal } from "./CrearDocumentoModal";
import { AlertTriangle, FileWarning, PlusCircle, Trash2 } from "lucide-react";

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-PE");
}

function diasParaVencer(fecha: string) {
  const hoy = new Date();
  const venc = new Date(fecha);
  const dias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return dias;
}

export default function DocumentosPage() {
  const [tab, setTab] = useState<"conductor" | "unidad">("conductor");
  const [modalAbierto, setModalAbierto] = useState(false);

  const docsConductor = useDocumentosConductor();
  const docsUnidad = useDocumentosUnidad();
  const proximos = useProximosAVencer(30);
  const eliminarConductor = useEliminarDocumentoConductor();
  const eliminarUnidad = useEliminarDocumentoUnidad();

  const totalPorVencer = (proximos.data?.conductores.length ?? 0) + (proximos.data?.unidades.length ?? 0);

  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Cumplimiento</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Documentos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Gestiona brevetes, SOAT y sus fechas de vencimiento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
        >
          <PlusCircle size={18} />
          Nuevo documento
        </button>
      </div>

      {/* Alerta de próximos a vencer */}
      {totalPorVencer > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-500" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                {totalPorVencer} documento{totalPorVencer !== 1 ? "s" : ""} por vencer en los próximos 30 días
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {proximos.data?.conductores.map((d) => (
                  <div key={`c-${d.id_documento}`} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-800">
                      {d.conductores_interno.in_name} {d.conductores_interno.in_apellido}
                    </span>{" "}
                    — {d.tipos_documento.nombre} vence el {formatearFecha(d.fecha_vencimiento)}
                    {diasParaVencer(d.fecha_vencimiento) < 0 && (
                      <span className="ml-1 font-semibold text-red-600">(vencido)</span>
                    )}
                  </div>
                ))}
                {proximos.data?.unidades.map((d) => (
                  <div key={`u-${d.id_documento}`} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-800">{d.unidades.uni_placa}</span> —{" "}
                    {d.tipos_documento.nombre} vence el {formatearFecha(d.fecha_vencimiento)}
                    {diasParaVencer(d.fecha_vencimiento) < 0 && (
                      <span className="ml-1 font-semibold text-red-600">(vencido)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card principal con tabs */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab("conductor")}
            className={`px-6 py-4 text-sm font-semibold transition ${
              tab === "conductor"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Documentos de conductor
          </button>
          <button
            onClick={() => setTab("unidad")}
            className={`px-6 py-4 text-sm font-semibold transition ${
              tab === "unidad"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Documentos de unidad
          </button>
        </div>

        {tab === "conductor" ? (
          <div className="overflow-x-auto">
            {docsConductor.isLoading ? (
              <p className="p-6 text-sm text-slate-500">Cargando...</p>
            ) : docsConductor.data?.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center px-6">
                <div className="text-center">
                  <FileWarning size={22} className="mx-auto text-slate-400" />
                  <p className="mt-3 text-sm text-slate-500">No hay documentos de conductor registrados</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Conductor</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Documento</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vencimiento</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Observaciones</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Archivo</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docsConductor.data?.map((d) => {
                    const dias = diasParaVencer(d.fecha_vencimiento);
                    return (
                      <tr key={d.id_documento} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-medium text-slate-800">
                          {d.conductores_interno.in_name} {d.conductores_interno.in_apellido}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{d.tipos_documento.nombre}</td>
                        <td className="px-5 py-4">
                          <span className={`text-sm ${dias < 0 ? "font-semibold text-red-600" : dias <= 30 ? "font-semibold text-amber-600" : "text-slate-600"}`}>
                            {formatearFecha(d.fecha_vencimiento)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{d.observaciones || "—"}</td>
                        <td className="px-5 py-4">
                          {d.archivo_url ? (
                            <a
                              href={d.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:underline"
                            >
                              Ver archivo
                        </a>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => eliminarConductor.mutate(d.id_documento)}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {docsUnidad.isLoading ? (
              <p className="p-6 text-sm text-slate-500">Cargando...</p>
            ) : docsUnidad.data?.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center px-6">
                <div className="text-center">
                  <FileWarning size={22} className="mx-auto text-slate-400" />
                  <p className="mt-3 text-sm text-slate-500">No hay documentos de unidad registrados</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Unidad</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Documento</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vencimiento</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Observaciones</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Archivo</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docsUnidad.data?.map((d) => {
                    const dias = diasParaVencer(d.fecha_vencimiento);
                    return (
                      <tr key={d.id_documento} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-medium text-slate-800">{d.unidades.uni_placa}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{d.tipos_documento.nombre}</td>
                        <td className="px-5 py-4">
                          <span className={`text-sm ${dias < 0 ? "font-semibold text-red-600" : dias <= 30 ? "font-semibold text-amber-600" : "text-slate-600"}`}>
                            {formatearFecha(d.fecha_vencimiento)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{d.observaciones || "—"}</td>
                        <td className="px-5 py-4">
                          {d.archivo_url ? (
                            <a
                              href={d.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:underline"
                            >
                              Ver archivo
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => eliminarUnidad.mutate(d.id_documento)}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <CrearDocumentoModal isOpen={modalAbierto} tipo={tab} onClose={() => setModalAbierto(false)} />
    </div>
  );
}