import { Boxes, ArrowDownToLine, ArrowUpFromLine, Users, Gauge, Clock, XCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { useDashboardAlmacen } from "./useAlmacen";
import { KpiCard, AlertaCard } from "./AlmacenUI";

const COLOR_INGRESO = "#16a34a";
const COLOR_SALIDA = "#2563eb";
const COLOR_ANTIGUEDAD: Record<string, string> = {
  verde: "#16a34a",
  amarillo: "#eab308",
  naranja: "#f97316",
  rojo: "#dc2626",
};

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

  const { kpis, alertas, movimiento_mensual, antiguedad_inventario, ocupacion_almacen, ocupacion_por_cliente } = data;

  const datoGauge = [
    {
      name: "ocupación",
      value: kpis.ocupacion_almacen_pct ?? 0,
      fill: (kpis.ocupacion_almacen_pct ?? 0) >= 90 ? "#dc2626" : (kpis.ocupacion_almacen_pct ?? 0) >= 75 ? "#f97316" : "#2563eb",
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard de Almacén</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen del depósito franco (ZED): stock, movimientos, ocupación y alertas.</p>
      </div>

      {/* 6 KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={<Boxes size={20} />}
          title="Stock actual"
          value={kpis.stock_actual}
          description={`${kpis.stock_pallets} pallets + ${kpis.stock_unidades} cajas/otras unidades`}
        />
        <KpiCard icon={<ArrowDownToLine size={20} />} title="Ingresos del mes" value={kpis.ingresos_mes} description="Registrados este mes" />
        <KpiCard icon={<ArrowUpFromLine size={20} />} title="Salidas del mes" value={kpis.salidas_mes} description="Registradas este mes" />
        <KpiCard icon={<Users size={20} />} title="Clientes con stock" value={kpis.clientes_con_stock} description="De los clientes activos" />
        <KpiCard
          icon={<Gauge size={20} />}
          title="Ocupación almacén"
          value={kpis.ocupacion_almacen_pct !== null ? `${kpis.ocupacion_almacen_pct}%` : "—"}
          description={
            ocupacion_almacen.capacidad_total
              ? `${ocupacion_almacen.ocupadas} / ${ocupacion_almacen.capacidad_total} posiciones`
              : "Falta capacidad configurada"
          }
        />
        <KpiCard
          icon={<Clock size={20} />}
          title="Permanencia promedio"
          value={`${kpis.permanencia_promedio_dias} días`}
          description="Antigüedad del stock actual"
        />
      </div>

      {/* Zona de gráficos: 4 cuadrantes */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 1. Movimiento mensual */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Movimiento mensual de inventario</h2>
          <p className="mb-3 text-xs text-slate-400">Ingresos vs. salidas, últimos 6 meses.</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={movimiento_mensual}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="ingresos" name="Ingresos" fill={COLOR_INGRESO} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="salidas" name="Salidas" fill={COLOR_SALIDA} radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Stock actual por cliente */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Stock actual por cliente</h2>
          <p className="mb-3 text-xs text-slate-400">Quién ocupa más espacio en el almacén hoy.</p>
          {ocupacion_por_cliente.length === 0 ? (
            <div className="flex h-[230px] items-center justify-center text-sm text-slate-400">Sin stock registrado todavía.</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={ocupacion_por_cliente} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="razon_social"
                  width={110}
                  tick={{ fontSize: 11.5, fill: "#334155" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="stock_real" name="Stock real" fill="#18193B" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3. Antigüedad del inventario */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Antigüedad del inventario</h2>
          <p className="mb-3 text-xs text-slate-400">Identifica carga que ocupa espacio hace demasiado tiempo.</p>
          <div className="flex flex-col gap-3">
            {antiguedad_inventario.map((b) => (
              <div key={b.rango} className="flex items-center gap-3">
                <span className="w-20 flex-shrink-0 text-xs font-medium text-slate-600">{b.rango}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (b.pallets / Math.max(1, Math.max(...antiguedad_inventario.map((x) => x.pallets)))) * 100)}%`,
                      backgroundColor: COLOR_ANTIGUEDAD[b.estado],
                    }}
                  />
                </div>
                <span className="w-10 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">{b.pallets}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Nivel de ocupación del almacén */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Nivel de ocupación del almacén</h2>
          <p className="mb-1 text-xs text-slate-400">Suma de todas las divisiones con capacidad configurada.</p>
          {ocupacion_almacen.capacidad_total === null ? (
            <div className="flex h-[190px] items-center justify-center text-sm text-slate-400">
              Falta definir la capacidad máxima de las divisiones.
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={150} height={150}>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={datoGauge} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={8} isAnimationActive={false} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-800 text-xl font-bold">
                    {kpis.ocupacion_almacen_pct}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="flex flex-1 flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Capacidad</span><span className="font-semibold text-slate-800">{ocupacion_almacen.capacidad_total} posiciones</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Ocupadas</span><span className="font-semibold text-slate-800">{ocupacion_almacen.ocupadas}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Disponibles</span><span className="font-semibold text-slate-800">{ocupacion_almacen.disponibles}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Alertas */}
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
