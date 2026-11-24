import { AlertTriangle } from "lucide-react";
import { dinero } from "../../lib/formato";
import type { FilaComparacion } from "../../modules/liquidaciones/liquidaciones.api";
import type { Moneda } from "../../modules/maestros/maestros.api";

const ETIQUETA_TIPO: Record<FilaComparacion["tipo"], { texto: string; clase: string }> = {
  OK: { texto: "Sin diferencia", clase: "text-slate-400" },
  MAYOR: { texto: "Incremento", clase: "text-red-600" },
  MENOR: { texto: "Ahorro", clase: "text-emerald-600" },
  NO_PROFORMADO: { texto: "No proformado", clase: "text-amber-700" },
  NO_EJECUTADO: { texto: "Aún sin pago", clase: "text-sky-600" },
};

/** Concepto | Proformado | Real | Diferencia. */
export function ComparacionTabla({ filas, moneda }: { filas: FilaComparacion[]; moneda: Moneda }) {
  const total = (k: "proformado" | "real" | "diferencia") => filas.reduce((s, f) => s + f[k], 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2.5 text-left">Concepto</th>
            <th className="px-4 py-2.5 text-right">Proformado</th>
            <th className="px-4 py-2.5 text-right">Real</th>
            <th className="px-4 py-2.5 text-right">Diferencia</th>
            <th className="px-4 py-2.5 text-left">Observación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map((f) => {
            const e = ETIQUETA_TIPO[f.tipo];
            const resaltar = f.tipo === "MAYOR" || f.tipo === "NO_PROFORMADO";
            return (
              <tr key={f.conceptoId} className={resaltar ? "bg-amber-50/50" : ""}>
                <td className="px-4 py-2.5 font-medium text-slate-800">{f.concepto}</td>
                <td className="px-4 py-2.5 text-right">{f.proformado ? dinero(f.proformado, moneda) : "—"}</td>
                <td className="px-4 py-2.5 text-right">{f.real ? dinero(f.real, moneda) : "—"}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${f.diferencia > 0 ? "text-red-600" : f.diferencia < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {f.diferencia > 0 ? "+" : ""}
                  {dinero(f.diferencia, moneda)}
                </td>
                <td className={`px-4 py-2.5 text-xs font-medium ${e.clase}`}>
                  <span className="inline-flex items-center gap-1">
                    {resaltar && <AlertTriangle size={13} />}
                    {e.texto}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
          <tr>
            <td className="px-4 py-2.5">Total</td>
            <td className="px-4 py-2.5 text-right">{dinero(total("proformado"), moneda)}</td>
            <td className="px-4 py-2.5 text-right">{dinero(total("real"), moneda)}</td>
            <td className={`px-4 py-2.5 text-right ${total("diferencia") > 0 ? "text-red-600" : "text-slate-700"}`}>
              {total("diferencia") > 0 ? "+" : ""}
              {dinero(total("diferencia"), moneda)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
