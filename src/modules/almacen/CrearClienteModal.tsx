import { useState } from "react";
import { isAxiosError } from "axios";
import { useCrearClienteAlmacen } from "./useAlmacen";

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function CrearClienteModal({ onClose }: { onClose: () => void }) {
  const crearCliente = useCrearClienteAlmacen();
  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!razonSocial.trim()) {
      setError("La razón social es obligatoria.");
      return;
    }
    crearCliente.mutate(
      {
        razon_social: razonSocial.trim(),
        ruc: ruc.trim() || undefined,
        tarifa_mensual_m2: tarifa ? Number(tarifa) : undefined,
        fecha_vencimiento_contrato: vencimiento || undefined,
        observaciones: observaciones.trim() || undefined,
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          setError(isAxiosError(err) ? err.response?.data?.error ?? "No se pudo crear el cliente" : "No se pudo crear el cliente");
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo cliente de almacén</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
            Cerrar
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <Campo label="Razón social *">
            <input
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className={inputClass}
              placeholder="Ej. Vitaline SAC"
            />
          </Campo>

          <Campo label="RUC">
            <input value={ruc} onChange={(e) => setRuc(e.target.value)} className={inputClass} placeholder="20484081094" />
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Tarifa US$/m² mensual">
              <input
                type="number"
                step="0.01"
                min="0"
                value={tarifa}
                onChange={(e) => setTarifa(e.target.value)}
                className={inputClass}
                placeholder="8.00"
              />
            </Campo>
            <Campo label="Vencimiento de contrato">
              <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className={inputClass} />
            </Campo>
          </div>

          <Campo label="Observaciones">
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={`${inputClass} h-20 resize-none`}
            />
          </Campo>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearCliente.isPending}
              className="rounded-lg bg-[#18193B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#242550] disabled:opacity-50"
            >
              {crearCliente.isPending ? "Guardando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
