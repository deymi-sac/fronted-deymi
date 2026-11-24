import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";
import type { Moneda } from "../maestros/maestros.api";
import type { Pagina } from "../proformas/proformas.api";

export const ESTADOS_LIQUIDACION = ["ELABORADA", "REVISADA", "APROBADA", "ENVIADA", "REABIERTA", "ANULADA"] as const;
export type EstadoLiquidacion = (typeof ESTADOS_LIQUIDACION)[number];

/** Proformado vs. real de un concepto. */
export interface FilaComparacion {
  conceptoId: number;
  concepto: string;
  proformado: number;
  real: number;
  diferencia: number;
  tipo: "OK" | "MAYOR" | "MENOR" | "NO_PROFORMADO" | "NO_EJECUTADO";
}

export type TipoDiferencia = FilaComparacion["tipo"];

/** Gastos que necesitan explicación: costaron más de lo proformado o no estaban en la proforma (igual que el backend). */
export const necesitaJustificacion = (l: { origen: string; tipoDiferencia: TipoDiferencia }) =>
  l.origen === "PAGO" && (l.tipoDiferencia === "MAYOR" || l.tipoDiferencia === "NO_PROFORMADO");

export interface FilaBandeja {
  operacionId: number;
  operacion: string;
  estadoOperacion: string;
  cliente: string;
  moneda: Moneda;
  pagosSinRevisar: number;
  liquidacion: { id: number; version: number; estado: EstadoLiquidacion; total: number; conDiferencias: boolean } | null;
}

/** Lo que se cobra en una moneda. */
export interface TotalMoneda {
  moneda: Moneda;
  servicios: number;
  gastos: number;
  igv: number;
  total: number;
}

export interface LineaLiquidacion {
  id: number;
  origen: "SERVICIO" | "PAGO";
  /** Factura que cubre el servicio (serie-número), si ya se registró */
  factura: string | null;
  pagoId: number | null;
  conceptoId: number;
  concepto: string;
  conceptoCodigo: string;
  descripcion: string;
  documento: string | null;
  proveedor: string;
  fechaPago: string | null;
  monedaOrigen: Moneda;
  importeOrigen: number;
  tipoCambio: number | null;
  importeProformado: number | null;
  importeReal: number;
  diferencia: number | null;
  tipoDiferencia: TipoDiferencia;
  afectoIgv: boolean;
  igv: number;
  /** Moneda en que se cobra y su importe en esa moneda */
  monedaCobro: Moneda;
  importeCobro: number;
  igvCobro: number;
  facturable: boolean;
  justificacion: string | null;
}

export interface Liquidacion {
  id: number;
  operacionId: number;
  operacion: string;
  cliente: string;
  version: number;
  estado: EstadoLiquidacion;
  moneda: Moneda;
  totalServicios: number;
  totalGastos: number;
  igv: number;
  total: number;
  costoInterno: number;
  /** null = una cobranza por moneda; PEN/USD = todo cobrado en esa moneda */
  monedaCobro: Moneda | null;
  tipoCambio: number | null;
  porMoneda: TotalMoneda[];
  diferenciasRevisadas: boolean;
  elaboradoPor: string;
  elaboradoEn: string;
  revisadoPor: string | null;
  revisadoEn: string | null;
  aprobadoPor: string | null;
  aprobadoEn: string | null;
  reaperturas: { usuario: string; fechaHora: string; motivo: string }[];
  lineas: LineaLiquidacion[];
  comparacion: FilaComparacion[];
}

/** Lo que el sistema jalaría al elaborar ahora, con los pagos y la proforma actuales. */
export interface LineaPropuesta {
  origen: "SERVICIO" | "PAGO";
  /** Factura que cubre el servicio (serie-número), si ya se registró */
  factura: string | null;
  pagoId: number | null;
  conceptoId: number;
  concepto: string;
  descripcion: string;
  documento: string | null;
  proveedor: string;
  estadoPago: string | null;
  monedaOrigen: Moneda;
  importeOrigen: number;
  importeProformado: number | null;
  importeReal: number;
  tipoDiferencia: TipoDiferencia;
  afectoIgv: boolean;
  igv: number;
  monedaCobro: Moneda;
  importeCobro: number;
  justificacion: string | null;
}

export interface LiquidacionDeOperacion {
  /** Fecha de la última factura vigente sin nota, por moneda (se sugiere como emisión de la nota) */
  fechaFacturas: Partial<Record<Moneda, string>>;
  operacion: { id: number; numero: string; estado: string; moneda: Moneda; dam: string | null; blAwb: string | null };
  cliente: { id: number; razonSocial: string; numeroDocumento: string };
  proforma: { id: number; numero: string; total: number } | null;
  liquidacion: Liquidacion | null;
  /** Motivo de la última observación, mientras la liquidación siga pendiente de corregirse */
  observacion: { version: number; motivo: string; usuario: string; fechaHora: string } | null;
  propuesta: { total_servicios: number; total_gastos: number; igv: number; total: number; costo_interno: number; porMoneda: TotalMoneda[]; lineas: LineaPropuesta[] };
  comparacion: FilaComparacion[];
  pagosSinRevisar: number;
  /** Gastos de la proforma que ningún pago cubrió: no se cobran */
  sinCobrar: { descripcion: string; importe: number }[];
  gastosInternos: { id: number; concepto: string; proveedor: string; documento: string | null; moneda: Moneda; total: number; importe: number }[];
  versiones: { id: number; version: number; estado: EstadoLiquidacion; moneda: Moneda; total: number; elaboradoEn: string; aprobadoEn: string | null }[];
}

export interface FiltroBandeja {
  pagina: number;
  /** Estado de la liquidación vigente; SIN_LIQUIDAR = operaciones finalizadas que aún no tienen */
  estado?: EstadoLiquidacion | "SIN_LIQUIDAR";
  buscar?: string;
}

/** Justificación de una diferencia, por id (de pago al elaborar, de línea al revisar). */
export type Justificaciones = Record<string, string>;

export const TAMANO_PAGINA = 10;

export const bandejaLiquidaciones = (f: FiltroBandeja) => api.get<Pagina<FilaBandeja>>("/liquidaciones", { params: { ...f, tamano: TAMANO_PAGINA } }).then((r) => r.data);
export const liquidacionDeOperacion = (operacionId: number) => api.get<LiquidacionDeOperacion>(`/liquidaciones/de-operacion/${operacionId}`).then((r) => r.data);

/**
 * monedaCobro null = una cobranza por moneda (lo pagado en soles se cobra en soles);
 * PEN/USD = todo convertido a esa moneda con tipoCambio.
 */
export const elaborarLiquidacion = (
  operacionId: number,
  justificaciones: Justificaciones,
  cobro: { monedaCobro: Moneda | null; tipoCambio: number | null } = { monedaCobro: null, tipoCambio: null }
) => api.post<Liquidacion>(`/liquidaciones/de-operacion/${operacionId}/elaborar`, { justificaciones, ...cobro }).then((r) => r.data);
export const revisarLiquidacion = (id: number, justificaciones: Justificaciones) => api.post<Liquidacion>(`/liquidaciones/${id}/revisar`, { justificaciones }).then((r) => r.data);
/** El aprobador la devuelve a elaboración. */
export const observarLiquidacion = (id: number, motivo: string) => api.post<Liquidacion>(`/liquidaciones/${id}/observar`, { motivo }).then((r) => r.data);
/** Los pagos pasan a liquidados y la operación a liquidada. */
export const aprobarLiquidacion = (id: number) => api.post<Liquidacion>(`/liquidaciones/${id}/aprobar`).then((r) => r.data);
/** Una aprobada solo cambia reabriéndola; la corrección será una versión nueva. */
export const reabrirLiquidacion = (id: number, motivo: string) => api.post<Liquidacion>(`/liquidaciones/${id}/reabrir`, { motivo }).then((r) => r.data);
export const anularLiquidacion = (id: number, motivo: string) => api.post<Liquidacion>(`/liquidaciones/${id}/anular`, { motivo }).then((r) => r.data);

export const useBandejaLiquidaciones = (f: FiltroBandeja) =>
  useQuery({ queryKey: ["liquidaciones", f], queryFn: () => bandejaLiquidaciones(f), placeholderData: keepPreviousData });
export const useLiquidacionDeOperacion = (operacionId: number, activo = true) =>
  useQuery({ queryKey: ["liquidaciones", "operacion", operacionId], queryFn: () => liquidacionDeOperacion(operacionId), enabled: activo });
