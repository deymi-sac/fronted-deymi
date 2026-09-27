import { Boxes, Package, Users, AlertTriangle, XCircle } from "lucide-react";
import { useDashboardAlmacen } from "./useAlmacen";
import { KpiCard, AlertaCard } from "./AlmacenUI";

export default function AlmacenDashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardAlmacen();

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <p className="text-sm text-slate-500">Cargando dashboard de almacén...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3">
        <XCircle size={32} className="text-red-500" />
        <p className="text-sm text-slate-600">No se pudo cargar el dashboard de almacén.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { divisiones, clientes, alertas } = data;
  const clientesActivos = clientes.filter((c) => c.estado === "Activo");
  const stockTotal = clientesActivos.reduce((acc, c) => acc + c.stock_actual, 0);
  const divisionConCapacidad = divisiones.find((d) => d.capacidad_maxima);
  const ocupacionPct = divisionConCapacidad
    ? Math.round((divisionConCapacidad.ocupacion_actual / divisionConCapacidad.capacidad_maxima!) * 100)
    : null;

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard de Almacén</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen del depósito franco (ZED) — ocupación, stock y alertas.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Boxes size={20} />} title="Stock total" value={stockTotal} description="Pallets/unidades en todo el almacén" />
        <KpiCard
          icon={<Package size={20} />}
          title={divisionConCapacidad ? divisionConCapacidad.nombre.replace(/^División \d+ — /, "") : "Ocupación"}
          value={ocupacionPct !== null ? `${ocupacionPct}%` : "—"}
          description={divisionConCapacidad ? `${divisionConCapacidad.ocupacion_actual} / ${divisionConCapacidad.capacidad_maxima} pallets` : "Sin capacidad configurada"}
        />
        <KpiCard icon={<Users size={20} />} title="Clientes activos" value={clientesActivos.length} description="Con contrato vigente" />
        <KpiCard icon={<AlertTriangle size={20} />} title="Alertas" value={alertas.length} description="Requieren atención" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-700">Ocupación por división</h2>
            <p className="text-xs text-slate-400">Distribución física real del almacén.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {divisiones.map((d) => {
              const pct = d.capacidad_maxima ? Math.min(100, Math.round((d.ocupacion_actual / d.capacidad_maxima) * 100)) : null;
              const barColor = pct === null ? "bg-slate-300" : pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-blue-500";
              return (
                <div key={d.id_division} className="px-5 py-4">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700">{d.nombre}</span>
                    <span className="text-xs text-slate-400">
                      {d.capacidad_maxima ? `Capacidad: ${d.capacidad_maxima} pallets` : "Capacidad: por definir"}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: pct !== null ? `${pct}%` : `${Math.min(100, d.ocupacion_actual)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{d.ocupacion_actual} pallets ocupados</span>
                    {pct !== null && <span className={pct >= 100 ? "font-semibold text-red-600" : ""}>{pct}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Alertas</h2>
          {alertas.length === 0 ? (
            <p className="text-sm text-slate-400">No hay alertas activas.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {alertas.map((a, i) => (
                <AlertaCard key={i} nivel={a.nivel} titulo={a.titulo} detalle={a.detalle} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
