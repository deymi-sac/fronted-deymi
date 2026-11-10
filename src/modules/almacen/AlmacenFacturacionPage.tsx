import { useState } from "react";
import { FileDown } from "lucide-react";
import { useClientesAlmacen, useCierreMensual, useCierreRango } from "./useAlmacen";
import { formatearMoneda, formatearFecha, inputClassGenerico, descargarBlob, fechaLocalHoy } from "./almacen.utils";
import { exportarCierreMensual, exportarCierreRango } from "./almacen.api";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Igual que el servidor: un rango no puede pasar de 366 días.
const MAX_DIAS_RANGO = 366;

function errorDelRango(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return "Elige las dos fechas.";
  if (desde > hasta) return "La fecha Desde no puede ser posterior a la fecha Hasta.";
  const dias = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000 + 1;
  return dias > MAX_DIAS_RANGO ? `El rango no puede pasar de ${MAX_DIAS_RANGO} días.` : null;
}

export default function AlmacenFacturacionPage() {
  const hoy = new Date();
  const { data: clientes } = useClientesAlmacen(false);
  const [idCliente, setIdCliente] = useState<number | "">("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [exportando, setExportando] = useState(false);
  // "mes": el cierre del mes completo, como siempre. "rango": del día Desde al día Hasta (ambos se cobran).
  const [modo, setModo] = useState<"mes" | "rango">("mes");
  const [desde, setDesde] = useState(() => `${fechaLocalHoy().slice(0, 8)}01`);
  const [hasta, setHasta] = useState(() => fechaLocalHoy());
  const errorRango = modo === "rango" ? errorDelRango(desde, hasta) : null;

  const idConsulta = idCliente === "" ? null : idCliente;
  const { data: cierreMes, isLoading: cargandoMes } = useCierreMensual(modo === "mes" ? idConsulta : null, anio, mes);
  const { data: cierreRango, isLoading: cargandoRango } = useCierreRango(modo === "rango" && !errorRango ? idConsulta : null, desde, hasta);
  const cierre = modo === "mes" ? cierreMes : cierreRango;
  const isLoading = modo === "mes" ? cargandoMes : cargandoRango;

  async function handleExportar() {
    if (idCliente === "") return;
    setExportando(true);
    try {
      if (modo === "mes") {
        const blob = await exportarCierreMensual(idCliente, anio, mes);
        descargarBlob(blob, `cierre-mensual-${anio}-${String(mes).padStart(2, "0")}.xlsx`);
      } else {
        const blob = await exportarCierreRango(idCliente, desde, hasta);
        descargarBlob(blob, `cierre-${desde}-a-${hasta}.xlsx`);
      }
    } catch {
      alert("No se pudo generar el archivo Excel.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Facturación</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Costo de almacenaje calculado por m² mensual (cada pallet = 1.2 m²), cobrando el día de ingreso y el día de
            salida. Los ingresos en contenedor tienen 21 días libres: no se cobran hasta el día 22.
          </p>
        </div>
        <button
          type="button"
          disabled={!cierre || exportando}
          onClick={handleExportar}
          className="flex items-center gap-2 self-start rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <FileDown size={16} /> {exportando ? "Generando..." : modo === "mes" ? "Exportar cierre mensual" : "Exportar cierre del período"}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <select value={idCliente} onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : "")} className={inputClassGenerico}>
          <option value="">Selecciona un cliente...</option>
          {clientes?.map((c) => (
            <option key={c.id_cliente_almacen} value={c.id_cliente_almacen}>
              {c.razon_social}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          {(["mes", "rango"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                modo === m ? "border-2 border-slate-800 bg-slate-100 text-slate-800" : "border-slate-300 bg-white text-slate-500"
              }`}
            >
              {m === "mes" ? "Por mes" : "Por rango de fechas"}
            </button>
          ))}
        </div>
        {modo === "mes" ? (
          <>
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputClassGenerico}>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className={`w-24 ${inputClassGenerico}`}
            />
          </>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Desde
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClassGenerico} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Hasta
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClassGenerico} />
            </label>
            <button
              type="button"
              onClick={() => setHasta(fechaLocalHoy())}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Hasta hoy
            </button>
          </>
        )}
      </div>
      {errorRango && <p className="-mt-3 mb-5 text-sm text-red-600">{errorRango}</p>}

      {idCliente === "" ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
          <p className="text-sm text-slate-400">Selecciona un cliente para ver su cobro.</p>
        </div>
      ) : errorRango ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
          <p className="text-sm text-slate-400">Corrige las fechas para ver el cobro.</p>
        </div>
      ) : isLoading || !cierre ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <p className="text-sm text-slate-500">Calculando...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ResumenTile label="Tarifa diaria/pallet" value={cierre.tarifa_diaria_pallet !== null ? `US$ ${cierre.tarifa_diaria_pallet.toFixed(2)}` : "Pendiente"} />
            <ResumenTile label={modo === "mes" ? "Pallets al cierre" : "Pallets al final del período"} value={String(cierre.pallets_al_cierre)} />
            <ResumenTile label="Pallet-día facturados" value={cierre.pallet_dias_facturados.toLocaleString("es-PE")} />
            <ResumenTile label="Monto a facturar" value={formatearMoneda(cierre.monto_a_facturar)} destacado />
          </div>

          {cierre.tarifa_mensual_m2 === null && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {cierre.cliente.razon_social} no tiene una tarifa US$/m² definida todavía — los montos aparecen como
              "Pendiente". Se puede completar desde la ficha del cliente.
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-700">Control diario</h2>
              <p className="text-xs text-slate-400">
                {modo === "mes"
                  ? `${MESES[mes - 1]} ${anio}`
                  : `Del ${formatearFecha(cierre.desde)} al ${formatearFecha(cierre.hasta)} (${cierre.control_diario.length} días, ambos incluidos)`}{" "}
                — {cierre.cliente.razon_social}
              </p>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo inicial</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ingresos</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Salidas</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo final</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Facturables</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {cierre.control_diario.map((d) => (
                    <tr key={d.fecha} className="border-b border-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-600">{formatearFecha(d.fecha)}</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums text-slate-500">{d.saldo_inicial}</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums text-green-600">{d.ingresos || ""}</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums text-blue-600">{d.salidas || ""}</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums text-slate-700">{d.saldo_final}</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums font-medium text-slate-800">{d.pallets_facturables}</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums text-slate-500">
                        {d.costo_dia !== null ? `US$ ${d.costo_dia.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenTile({ label, value, destacado }: { label: string; value: string; destacado?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${destacado ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white"}`}>
      <p className={`text-xs font-medium ${destacado ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-1 text-xl font-semibold ${destacado ? "text-white" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
