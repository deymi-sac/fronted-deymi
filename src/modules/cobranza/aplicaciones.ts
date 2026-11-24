import { dinero, redondear } from "../../lib/formato";
import type { Moneda } from "../maestros/maestros.api";
import type { AplicacionCobro, CuentasPorCobrar } from "./cobranza.api";

export type NotaPorCobrar = CuentasPorCobrar["items"][number];

/** Lo que se escribe por nota: importe en la moneda de la nota y, si el cobro es en otra moneda, el tipo de cambio. */
export type Aplicado = Record<number, { importe: string; tipoCambio: string }>;

/** Lo que una aplicación descuenta del cobro, en la moneda del cobro. */
export function enMonedaDelCobro(importe: number, monedaNota: Moneda, monedaCobro: Moneda, tipoCambio: number) {
  if (monedaNota === monedaCobro) return importe;
  if (!tipoCambio) return 0;
  return redondear(monedaNota === "USD" ? importe * tipoCambio : importe / tipoCambio);
}

/** Arma lo que se envía: solo las notas con importe. */
export function aAplicaciones(valor: Aplicado, notas: NotaPorCobrar[], monedaCobro: Moneda): AplicacionCobro[] {
  return notas
    .filter((n) => Number(valor[n.notaCobranzaId]?.importe) > 0)
    .map((n) => ({
      notaCobranzaId: n.notaCobranzaId,
      importe: Number(valor[n.notaCobranzaId]!.importe),
      ...(n.moneda !== monedaCobro && { tipoCambio: Number(valor[n.notaCobranzaId]!.tipoCambio) }),
    }));
}

/** Total aplicado, en la moneda del cobro. */
export function totalAplicado(valor: Aplicado, notas: NotaPorCobrar[], monedaCobro: Moneda) {
  return redondear(notas.reduce((s, n) => s + enMonedaDelCobro(Number(valor[n.notaCobranzaId]?.importe) || 0, n.moneda, monedaCobro, Number(valor[n.notaCobranzaId]?.tipoCambio) || 0), 0));
}

/** Falta algo: el aviso, o null si lo aplicado está completo. */
export function problemaAplicacion(valor: Aplicado, notas: NotaPorCobrar[], monedaCobro: Moneda, disponible: number): string | null {
  for (const n of notas) {
    const v = valor[n.notaCobranzaId];
    const importe = Number(v?.importe);
    if (!importe) continue;
    if (importe > n.saldo + 0.005) return `A ${n.notaCobranza} solo le quedan ${dinero(n.saldo, n.moneda)}`;
    if (n.moneda !== monedaCobro && !Number(v?.tipoCambio)) return `Indica el tipo de cambio para ${n.notaCobranza}`;
  }
  if (totalAplicado(valor, notas, monedaCobro) > disponible + 0.01) return `Lo aplicado pasa lo disponible (${dinero(disponible, monedaCobro)})`;
  return null;
}
