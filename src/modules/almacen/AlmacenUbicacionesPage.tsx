import { useState } from "react";
import { XCircle } from "lucide-react";
import { useDivisiones, useHistorialCapacidad } from "./useAlmacen";
import { formatearFecha } from "./almacen.utils";
import { PlanoAlmacen } from "./PlanoAlmacen";
import { getCurrentUser, puedeOperarAlmacen } from "../auth/auth.utils";
import type { DivisionAlmacen } from "./almacen.api";

export default function AlmacenUbicacionesPage() {
  const puedeOperar = puedeOperarAlmacen(getCurrentUser());
  const { data: divisiones, isLoading, isError, refetch } = useDivisiones();
  const [historialDivision, setHistorialDivision] = useState<DivisionAlmacen | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <p className="text-sm text-slate-500">Cargando ubicaciones...</p>
      </div>
    );
  }

  if (isError || !divisiones) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3">
        <XCircle size={32} className="text-red-500" />
        <p className="text-sm text-slate-600">No se pudieron cargar las divisiones.</p>
        <button type="button" onClick={() => refetch()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Ubicaciones</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Selecciona una zona del plano para ver qué hay guardado, editar su capacidad máxima y consultar el historial.
        </p>
      </div>

      <PlanoAlmacen divisiones={divisiones} puedeOperar={puedeOperar} onVerHistorial={setHistorialDivision} />

      {historialDivision && (
        <HistorialCapacidadModal division={historialDivision} onClose={() => setHistorialDivision(null)} />
      )}
    </div>
  );
}

function HistorialCapacidadModal({ division, onClose }: { division: DivisionAlmacen; onClose: () => void }) {
  const { data: historial, isLoading } = useHistorialCapacidad(division.id_division);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Historial de capacidad</h2>
            <p className="mt-1 text-sm text-slate-500">{division.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
            Cerrar
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {isLoading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : !historial || historial.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se ha registrado ningún cambio de capacidad.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {historial.map((h) => (
                <li key={h.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-700">
                    {h.capacidad_anterior ?? "sin definir"} → <span className="font-semibold">{h.capacidad_nueva} pallets</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {h.usuarios.nombre} {h.usuarios.apellido} · {formatearFecha(h.fecha)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
