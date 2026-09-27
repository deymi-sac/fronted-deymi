import { useState } from "react";
import { Building2, Plus, XCircle, Archive, RotateCcw, Pencil } from "lucide-react";
import { isAxiosError } from "axios";
import { useClientesAlmacen, useArchivarClienteAlmacen } from "./useAlmacen";
import { getCurrentUser, puedeOperarAlmacen } from "../auth/auth.utils";
import { Pill, formatearMoneda, formatearFecha } from "./AlmacenUI";
import { CrearClienteModal } from "./CrearClienteModal";
import { EditarClienteModal } from "./EditarClienteModal";
import type { ClienteAlmacen } from "./almacen.api";

export default function AlmacenClientesPage() {
  const puedeOperar = puedeOperarAlmacen(getCurrentUser());
  const [incluirArchivados, setIncluirArchivados] = useState(false);
  const { data: clientes, isLoading, isError, refetch } = useClientesAlmacen(incluirArchivados);
  const archivarCliente = useArchivarClienteAlmacen();
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [clienteEditar, setClienteEditar] = useState<ClienteAlmacen | null>(null);

  function handleArchivar(cliente: ClienteAlmacen) {
    const archivar = cliente.estado === "Activo";
    const confirmar = window.confirm(
      archivar
        ? `¿Archivar a "${cliente.razon_social}"? Su historial de Kardex se conserva y se puede reactivar cuando quieras.`
        : `¿Reactivar a "${cliente.razon_social}"?`
    );
    if (!confirmar) return;
    archivarCliente.mutate(
      { id: cliente.id_cliente_almacen, archivar },
      {
        onError: (err) => {
          const mensaje = isAxiosError(err) ? err.response?.data?.error : "No se pudo actualizar el cliente";
          alert(mensaje);
        },
      }
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Clientes de almacén</h1>
          <p className="mt-1 text-sm text-slate-500">Empresas con mercadería almacenada, tarifas y contratos.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <input
              type="checkbox"
              checked={incluirArchivados}
              onChange={(e) => setIncluirArchivados(e.target.checked)}
              className="rounded border-slate-300"
            />
            Mostrar archivados
          </label>
          {puedeOperar && (
            <button
              type="button"
              onClick={() => setMostrarCrear(true)}
              className="flex items-center gap-2 rounded-lg bg-[#18193B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242550]"
            >
              <Plus size={16} /> Nuevo cliente
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <p className="text-sm text-slate-500">Cargando clientes...</p>
          </div>
        ) : isError || !clientes ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3">
            <XCircle size={32} className="text-red-500" />
            <p className="text-sm text-slate-600">No se pudieron cargar los clientes.</p>
            <button type="button" onClick={() => refetch()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
              Reintentar
            </button>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-2">
            <Building2 size={36} className="text-slate-300" />
            <p className="font-medium text-slate-600">No hay clientes registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">RUC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stock actual</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tarifa (US$/m² mes)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vencimiento contrato</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                  {puedeOperar && (
                    <th className="w-28 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id_cliente_almacen} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-800">{c.razon_social}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{c.ruc ?? "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{c.stock_actual ?? 0} pallets</td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {c.tarifa_mensual_m2 ? `US$ ${c.tarifa_mensual_m2}` : "Por definir"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{formatearFecha(c.fecha_vencimiento_contrato)}</td>
                    <td className="px-4 py-4 text-center">
                      <Pill tone={c.estado === "Activo" ? "green" : "slate"}>{c.estado}</Pill>
                    </td>
                    {puedeOperar && (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => setClienteEditar(c)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            title={c.estado === "Activo" ? "Archivar" : "Reactivar"}
                            onClick={() => handleArchivar(c)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          >
                            {c.estado === "Activo" ? <Archive size={16} /> : <RotateCcw size={16} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {clientes && clientes.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Tarifa: por m² mensual (cada pallet ocupa 1.2 m²), diferenciada por cliente — {formatearMoneda(null)} donde aún no
          se ha definido el monto.
        </p>
      )}

      {mostrarCrear && <CrearClienteModal onClose={() => setMostrarCrear(false)} />}
      {clienteEditar && <EditarClienteModal cliente={clienteEditar} onClose={() => setClienteEditar(null)} />}
    </div>
  );
}
