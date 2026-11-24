import type { DatosLineaProforma } from "../modules/proformas/proformas.api";
import type { Concepto, Moneda } from "../modules/maestros/maestros.api";
import type { Tramo } from "../modules/tarifas/tarifas.api";
import { redondear } from "./formato";

/**
 * Vista previa de las líneas mientras se arma la proforma. Es la misma regla que
 * proformas.calculo.ts del backend, pero lo que vale es lo que calcula el backend al guardar.
 */

/** Importación: CIF = FOB + flete + seguro. Sin ninguno de los tres, no hay CIF. */
export function calcularCif(fob: number | null, flete: number | null, seguro: number | null) {
  if (fob == null && flete == null && seguro == null) return null;
  return redondear((fob ?? 0) + (flete ?? 0) + (seguro ?? 0));
}

export interface ContextoProforma {
  moneda: Moneda;
  /** Soles por dólar */
  tipoCambio: number | null;
  valorFob: number | null;
  valorCif: number | null;
  tasaIgv: number;
}

export interface LineaCalculada {
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  igv: number;
  total: number;
  costoTotal: number;
  /** Falta el tipo de cambio para convertir la línea */
  sinTipoCambio: boolean;
}

/** USD → PEN multiplica por el tipo de cambio; PEN → USD divide. */
function convertir(monto: number, de: Moneda, a: Moneda, tipoCambio: number | null) {
  if (de === a) return monto;
  if (!tipoCambio) return null;
  return de === "USD" && a === "PEN" ? monto * tipoCambio : monto / tipoCambio;
}

/** El primer tramo cuyo límite alcanza la base (el último queda abierto: "en adelante"). */
export function tramoAplicable(tramos: Tramo[], base: number) {
  return tramos.find((t) => t.hasta == null || base <= t.hasta) ?? tramos[tramos.length - 1];
}

export function calcularLinea(l: DatosLineaProforma, ctx: ContextoProforma, concepto: Concepto | undefined): LineaCalculada {
  const origen = l.monedaOrigen && l.monedaOrigen !== ctx.moneda ? l.monedaOrigen : null;
  const sinTipoCambio = origen !== null && !ctx.tipoCambio;
  const aMoneda = (monto: number) => (origen ? (convertir(monto, origen, ctx.moneda, ctx.tipoCambio) ?? 0) : monto);
  const minimo = l.montoMinimo != null ? aMoneda(l.montoMinimo) : null;
  const maximo = l.montoMaximo != null ? aMoneda(l.montoMaximo) : null;
  const acotar = (monto: number) => Math.min(Math.max(monto, minimo ?? 0), maximo ?? Infinity);

  let cantidad: number;
  let precioUnitario: number;
  let subtotal: number;
  if (l.tipoCalculo === "TRAMOS") {
    const base = (l.basePorcentaje === "CIF" ? ctx.valorCif : ctx.valorFob) ?? 0;
    const tramo = l.tramos?.length ? tramoAplicable(l.tramos, base) : undefined;
    cantidad = 1;
    precioUnitario = redondear(acotar(tramo?.porcentaje != null ? (base * tramo.porcentaje) / 100 : aMoneda(tramo?.importe ?? 0)));
    subtotal = precioUnitario;
  } else if (l.tipoCalculo === "PORCENTAJE") {
    const base = (l.basePorcentaje === "CIF" ? ctx.valorCif : ctx.valorFob) ?? 0;
    cantidad = 1;
    precioUnitario = redondear(acotar((base * (l.porcentaje ?? 0)) / 100));
    subtotal = precioUnitario;
  } else {
    cantidad = l.tipoCalculo === "FIJO" ? 1 : l.cantidad;
    precioUnitario = redondear(aMoneda(l.importe ?? 0));
    // El mínimo/máximo de una línea fija o por unidad se aplica al total de la línea
    subtotal = redondear(acotar(cantidad * precioUnitario));
    if (subtotal !== redondear(cantidad * precioUnitario) && cantidad) precioUnitario = redondear(subtotal / cantidad);
  }

  const afectoIgv = l.afectoIgv ?? concepto?.afectoIgv ?? false;
  let igv: number;
  if (afectoIgv && l.incluyeIgv) {
    // Precio con IGV incluido: lo calculado es el total y de ahí se separa el IGV
    const total = subtotal;
    subtotal = redondear(total / (1 + ctx.tasaIgv));
    igv = redondear(total - subtotal);
    precioUnitario = cantidad ? redondear(subtotal / cantidad) : 0;
  } else {
    igv = afectoIgv ? redondear(subtotal * ctx.tasaIgv) : 0;
  }
  // Sin costo indicado: un gasto de tercero se traslada tal cual; un servicio propio no tiene costo directo
  const costoUnitario =
    l.costoUnitario != null ? redondear(aMoneda(l.costoUnitario)) : concepto?.tipo === "GASTO_TERCERO" ? precioUnitario : 0;

  return { cantidad, precioUnitario, subtotal, igv, total: redondear(subtotal + igv), costoTotal: redondear(costoUnitario * cantidad), sinTipoCambio };
}

export function totalesLineas(lineas: LineaCalculada[]) {
  const suma = (campo: "subtotal" | "igv" | "total" | "costoTotal") => redondear(lineas.reduce((s, l) => s + l[campo], 0));
  return { subtotal: suma("subtotal"), igv: suma("igv"), total: suma("total"), costoTotal: suma("costoTotal") };
}
