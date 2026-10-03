import { useState } from "react";
import { FileDown } from "lucide-react";
import { useClientesAlmacen, useCierreMensual } from "./useAlmacen";
import { formatearMoneda, formatearFecha, inputClassGenerico, descargarBlob } from "./almacen.utils";
import { exportarCierreMensual } from "./almacen.api";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function AlmacenFacturacionPage() {
  const hoy = new Date();
  const { data: clientes } = useClientesAlmacen(false);
  const [idCliente, setIdCliente] = useState<number | "">("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [exportando, setExportando] = useState(false);

  const { data: cierre, isLoading } = useCierreMensual(idCliente === "" ? null : idCliente, anio, mes);

  async function handleExportar() {
    if (idCliente === "") return;
    setExportando(true);
    try {
      const blob = await exportarCierreMensual(idCliente, anio, mes);
      descargarBlob(blob, `cierre-mensual-${anio}-${String(mes).padStart(2, "0")}.xlsx`);
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
            salida.
          </p>
        </div>
        <button
          type="button"
          disabled={!cierre || exportando}
          onClick={handleExportar}
          className="flex items-center gap-2 self-start rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <FileDown size={16} /> {exportando ? "Generando..." : "Exportar cierre mensual"}
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
      </div>

      {idCliente === "" ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
          <p className="text-sm text-slate-400">Selecciona un cliente para ver su cierre mensual.</p>
        </div>
      ) : isLoading || !cierre ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <p className="text-sm text-slate-500">Calculando...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ResumenTile label="Tarifa diaria/pallet" value={cierre.tarifa_diaria_pallet !== null ? `US$ ${cierre.tarifa_diaria_pallet.toFixed(2)}` : "Pendiente"} />
            <ResumenTile label="Pallets al cierre" value={String(cierre.pallets_al_cierre)} />
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
                {MESES[mes - 1]} {anio} — {cierre.cliente.razon_social}
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
