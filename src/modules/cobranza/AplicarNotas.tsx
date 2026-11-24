import { Wand2 } from "lucide-react";
import { Paginado } from "../../components/ui/Paginado";
import { inputClass } from "../../lib/estilos";
import { dinero, redondear } from "../../lib/formato";
import { formatearFecha } from "../almacen/almacen.utils";
import type { Moneda } from "../maestros/maestros.api";
import { totalAplicado, type Aplicado, type NotaPorCobrar } from "./aplicaciones";

/**
 * Reparte el cobro entre las notas con saldo del cliente: tabla con lo que se aplica a cada una y un botón que
 * rellena desde la que vence primero. Las notas en otra moneda piden su tipo de cambio.
 */
export function AplicarNotas({
  notas,
  monedaCobro,
  disponible,
  valor,
  onChange,
}: {
  notas: NotaPorCobrar[];
  monedaCobro: Moneda;
  /** Lo que queda del cobro por aplicar, en su moneda */
  disponible: number;
  valor: Aplicado;
  onChange: (v: Aplicado) => void;
}) {
  const poner = (id: number, campo: "importe" | "tipoCambio", texto: string) =>
    onChange({ ...valor, [id]: { importe: valor[id]?.importe ?? "", tipoCambio: valor[id]?.tipoCambio ?? "", [campo]: texto } });

  // De la que vence primero, mientras alcance el cobro (solo notas de la misma moneda: las otras piden tipo de cambio)
  function autocompletar() {
    let resto = disponible;
    const nuevo: Aplicado = {};
    for (const n of [...notas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))) {
      if (n.moneda !== monedaCobro || resto <= 0) continue;
      const importe = Math.min(n.saldo, resto);
      nuevo[n.notaCobranzaId] = { importe: String(redondear(importe)), tipoCambio: "" };
      resto = redondear(resto - importe);
    }
    onChange(nuevo);
  }

  if (notas.length === 0) return <p className="text-sm text-slate-400">Este cliente no tiene notas de cobranza con saldo. Se puede registrar igual y aplicarlo después.</p>;

  const aplicado = totalAplicado(valor, notas, monedaCobro);
  const queda = Math.max(redondear(disponible - aplicado), 0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Aplicar a notas de cobranza</p>
        <button type="button" onClick={autocompletar} className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:underline">
          <Wand2 size={12} /> Aplicar desde la más antigua
        </button>
      </div>
      <Paginado items={notas}>
        {(pagina) => (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {pagina.map((n) => {
              const otra = n.moneda !== monedaCobro;
              return (
                <li key={n.notaCobranzaId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm">
                  <span className="min-w-48 flex-1">
                    <b>{n.notaCobranza}</b> <span className="text-slate-500">· {n.operacion}</span>
                    <span className={`block text-xs ${n.diasVencida > 0 ? "text-red-600" : "text-slate-500"}`}>
                      Saldo {dinero(n.saldo, n.moneda)} · vence {formatearFecha(n.fechaVencimiento)}
                      {n.diasVencida > 0 && ` (${n.diasVencida} días de atraso)`}
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={n.saldo}
                    step="0.01"
                    placeholder={`0.00 ${n.moneda}`}
                    value={valor[n.notaCobranzaId]?.importe ?? ""}
                    onChange={(e) => poner(n.notaCobranzaId, "importe", e.target.value)}
                    className={`${inputClass} w-32! shrink-0 text-right`}
                    aria-label={`Importe a aplicar a ${n.notaCobranza}`}
                  />
                  {otra && (
                    <input
                      type="number"
                      min={0}
                      step="0.0001"
                      placeholder="T.C."
                      value={valor[n.notaCobranzaId]?.tipoCambio ?? ""}
                      onChange={(e) => poner(n.notaCobranzaId, "tipoCambio", e.target.value)}
                      className={`${inputClass} w-24! shrink-0 text-right`}
                      aria-label={`Tipo de cambio para ${n.notaCobranza}`}
                    />
                  )}
                  <span className="w-8 shrink-0 text-xs text-slate-500">{n.moneda}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Paginado>
      <p className={`mt-2 text-right text-xs ${aplicado > disponible + 0.005 ? "text-red-600" : "text-slate-500"}`}>
        Aplicado {dinero(aplicado, monedaCobro)} de {dinero(disponible, monedaCobro)} · queda {dinero(queda, monedaCobro)} por aplicar
      </p>
    </div>
  );
}
