import { useState } from "react";
import { XCircle, History, ChevronDown, ChevronRight, Package } from "lucide-react";
import { useDivisiones, useActualizarCapacidad, useHistorialCapacidad, useDetalleOcupacionDivision } from "./useAlmacen";
import { formatearFecha } from "./AlmacenUI";
import { getCurrentUser, puedeOperarAlmacen } from "../auth/auth.utils";
import type { DivisionAlmacen } from "./almacen.api";

export default function AlmacenUbicacionesPage() {
  const puedeOperar = puedeOperarAlmacen(getCurrentUser());
  const { data: divisiones, isLoading, isError, refetch } = useDivisiones();
  const actualizarCapacidad = useActualizarCapacidad();
  const [edicion, setEdicion] = useState<Record<number, string>>({});
  const [historialDivision, setHistorialDivision] = useState<DivisionAlmacen | null>(null);
  const [divisionExpandida, setDivisionExpandida] = useState<number | null>(null);

  function guardarCapacidad(id_division: number) {
    const division = divisiones?.find((d) => d.id_division === id_division);
    const crudo = edicion[id_division] ?? (division?.capacidad_maxima != null ? String(division.capacidad_maxima) : "");
    const valor = Number(crudo);
    if (crudo.trim() === "" || isNaN(valor) || valor < 0) {
      alert("Ingresa un número válido de posiciones/pallets.");
      return;
    }
    actualizarCapacidad.mutate(
      { id_division, capacidad_maxima: valor },
      { onSuccess: () => setEdicion((prev) => ({ ...prev, [id_division]: "" })) }
    );
  }

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
          El almacén se organiza en 3 divisiones. La capacidad máxima de cada una es un dato configurable — puedes
          ingresarla o corregirla aquí mismo.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {divisiones.map((d) => {
          const ocupacion = d.ocupacion_actual ?? 0;
          const pct = d.capacidad_maxima ? Math.min(100, Math.round((ocupacion / d.capacidad_maxima) * 100)) : null;
          const barColor = pct === null ? "bg-slate-300" : pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-blue-500";

          return (
            <div key={d.id_division} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-800">{d.nombre}</h2>
                {pct !== null && (
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${pct >= 100 ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                    {pct}% ocupada
                  </span>
                )}
              </div>
              {d.funcion && <p className="mb-3 text-sm text-slate-500">{d.funcion}</p>}

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: pct !== null ? `${pct}%` : "0%" }} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-slate-600">{ocupacion} pallets actuales</span>

                <div className="flex items-center gap-2">
                  {puedeOperar ? (
                    <>
                      <span className="text-xs text-slate-500">Capacidad máxima:</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="sin definir"
                        value={edicion[d.id_division] ?? (d.capacidad_maxima != null ? String(d.capacidad_maxima) : "")}
                        onChange={(e) => setEdicion((prev) => ({ ...prev, [d.id_division]: e.target.value }))}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                      <span className="text-xs text-slate-500">pallets</span>
                      <button
                        type="button"
                        disabled={actualizarCapacidad.isPending}
                        onClick={() => guardarCapacidad(d.id_division)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Guardar
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Capacidad máxima: {d.capacidad_maxima ?? "sin definir"} pallets
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistorialDivision(d)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <History size={13} /> Ver historial
                  </button>
                  <button
                    type="button"
                    onClick={() => setDivisionExpandida((v) => (v === d.id_division ? null : d.id_division))}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {divisionExpandida === d.id_division ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <Package size={13} /> Qué hay guardado
                  </button>
                </div>
              </div>

              {divisionExpandida === d.id_division && <DetalleDivision id_division={d.id_division} />}
            </div>
          );
        })}
      </div>

      {historialDivision && (
        <HistorialCapacidadModal division={historialDivision} onClose={() => setHistorialDivision(null)} />
      )}
    </div>
  );
}

function DetalleDivision({ id_division }: { id_division: number }) {
  const { data: detalle, isLoading } = useDetalleOcupacionDivision(id_division);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {isLoading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : !detalle || detalle.length === 0 ? (
        <p className="text-sm text-slate-400">No hay stock guardado en esta división.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {detalle.map((c) => (
            <div key={c.id_cliente_almacen} className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">{c.razon_social}</span>
                <span className="font-semibold text-slate-800">{c.pallets} pallets</span>
              </div>
              <p className="text-xs text-slate-400">
                {c.productos.map((p) => `${p.nombre} (${p.pallets})`).join(" · ")}
              </p>
            </div>
          ))}
        </div>
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
