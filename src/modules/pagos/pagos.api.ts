import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";
import type { Moneda } from "../maestros/maestros.api";
import type { Pagina } from "../proformas/proformas.api";

export const TIPOS_COMPROBANTE = ["FACTURA", "BOLETA", "RECIBO", "LIQUIDACION", "TICKET", "OTRO"] as const;
export const MEDIOS_PAGO = ["TRANSFERENCIA", "DEPOSITO", "CHEQUE", "EFECTIVO", "TARJETA", "DETRACCION", "OTRO"] as const;
export const SUBCLASIFICACIONES = ["FACTURABLE", "NO_FACTURABLE", "INCLUIDO_TARIFA", "EXTRAORDINARIO"] as const;
export const ESTADOS_PAGO = ["REGISTRADO", "REVISADO", "LIQUIDADO", "FACTURADO", "ANULADO"] as const;

export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number];
export type MedioPago = (typeof MEDIOS_PAGO)[number];
export type Subclasificacion = (typeof SUBCLASIFICACIONES)[number];
export type EstadoPago = (typeof ESTADOS_PAGO)[number];
/** REEMBOLSABLE pasa a la liquidación del cliente; GASTO_INTERNO no. */
export type Clasificacion = "REEMBOLSABLE" | "GASTO_INTERNO";

/** Un pago liquidado ya está en un documento del cliente: no se toca. */
export const MODIFICABLES: EstadoPago[] = ["REGISTRADO", "REVISADO"];
/** Se registran o corrigen pagos mientras la operación no entró a liquidación. */
export const OPERACION_ACEPTA_PAGOS = ["ABIERTA", "FINALIZADA"];

export interface Pago {
  id: number;
  operacionId: number;
  operacion: string;
  /** Solo con la operación abierta o finalizada se registran o corrigen sus pagos */
  estadoOperacion: string;
  /** Moneda de la operación (el pago puede estar en otra) */
  monedaOperacion: Moneda;
  cliente: string;
  fechaPago: string;
  proveedorId: number;
  proveedor: string;
  proveedorRuc: string;
  conceptoId: number;
  concepto: string;
  conceptoCodigo: string;
  descripcion: string | null;
  tipoComprobante: TipoComprobante | null;
  serieNumero: string | null;
  moneda: Moneda;
  importe: number;
  igv: number;
  total: number;
  tipoCambio: number | null;
  medioPago: MedioPago;
  banco: string | null;
  nroOperacionBancaria: string | null;
  clasificacion: Clasificacion;
  subclasificacion: Subclasificacion | null;
  estado: EstadoPago;
  /** Falta el número de comprobante */
  sinSustento: boolean;
  noProformado: boolean;
  justificacion: string | null;
  observaciones: string | null;
  cantidadAdjuntos: number;
  posibleDuplicadoDe: { id: number; operacion: string; fechaPago: string } | null;
  pagadoPor: string;
  revisadoPor: string | null;
  revisadoEn: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
}

export interface PagoDetalle extends Pago {
  adjuntos: AdjuntoPago[];
  historial: { fechaHora: string; usuario: string; accion: string; descripcion: string; motivo: string | null }[];
}

export interface OperacionEncontrada {
  id: number;
  numero: string;
  estado: string;
  cliente: string;
  moneda: Moneda;
  dam: string | null;
  blAwb: string | null;
}

/** Un ítem de la proforma de la operación; los gastos de terceros con el pago que los cubre. */
export interface GastoProforma {
  id: number;
  conceptoId: number;
  tipo: "SERVICIO_PROPIO" | "GASTO_TERCERO";
  descripcion: string;
  moneda: Moneda;
  monedaOrigen: Moneda | null;
  proformado: number;
  /** Quién cobra el concepto (de la tarifa); null = se elige al pagar */
  proveedorId: number | null;
  pago: { id: number; serieNumero: string | null; moneda: Moneda; total: number } | null;
}

export interface Verificacion {
  duplicado: { id: number; operacion: string; fechaPago: string; proveedor: string; ruc: string; serieNumero: string | null; moneda: Moneda; total: number; estado: string } | null;
  noProformado: boolean;
}

/** El pago se envía completo (alta y edición); el total = importe + IGV lo calcula el backend. */
export interface DatosPago {
  operacionId: number;
  fechaPago: string;
  proveedorId: number;
  conceptoId: number;
  descripcion: string | null;
  tipoComprobante: TipoComprobante | null;
  serieNumero: string | null;
  moneda: Moneda;
  importe: number;
  igv: number;
  /** Soles por dólar, si el pago no está en la moneda de la operación */
  tipoCambio: number | null;
  medioPago: MedioPago;
  banco: string | null;
  nroOperacionBancaria: string | null;
  clasificacion: Clasificacion;
  subclasificacion: Subclasificacion | null;
  justificacion: string | null;
  observaciones: string | null;
  /** Se vio la alerta de duplicidad y se guarda igual (requiere el permiso pagos_forzar_duplicado) */
  confirmarDuplicado: boolean;
}

export interface FiltroPagos {
  pagina: number;
  estado?: EstadoPago;
  sinSustento?: boolean;
  operacionId?: number;
  buscar?: string;
}

export type PaginaPagos = Pagina<Pago> & { totales: { moneda: Moneda; total: number }[] };

export const TAMANO_PAGINA = 10;

/** Corrige solo la fecha del pago, en cualquier momento (no vuelve a revisión). Queda en el historial. */
export const corregirFechaPago = (id: number, fechaPago: string) => api.put<Pago>(`/pagos/${id}/fecha`, { fechaPago }).then((r) => r.data);
export const TIPOS_DOCUMENTO_PAGO = ["FACTURA", "BOLETA", "RECIBO", "VOUCHER", "LIQUIDACION", "TRANSFERENCIA", "OTRO"] as const;
export type TipoDocumentoPago = (typeof TIPOS_DOCUMENTO_PAGO)[number];
export interface AdjuntoPago {
  id: number;
  tipoDocumento: TipoDocumentoPago;
  nombreArchivo: string;
  mimeType: string | null;
  tamanoBytes: number | null;
  subidoPor: string;
  subidoEn: string;
}

export const listarPagos = (f: FiltroPagos) => api.get<PaginaPagos>("/pagos", { params: { ...f, tamano: TAMANO_PAGINA } }).then((r) => r.data);
export const obtenerPago = (id: number) => api.get<PagoDetalle>(`/pagos/${id}`).then((r) => r.data);
export const obtenerGastosProforma = (operacionId: number) => api.get<GastoProforma[]>(`/pagos/de-operacion/${operacionId}/gastos-proforma`).then((r) => r.data);
export const registrarPago = (d: DatosPago) => api.post<PagoDetalle>("/pagos", d).then((r) => r.data);
/** Varios ítems de la proforma pagados juntos: un pago por ítem, todos o ninguno. */
export const registrarPagosVarios = (pagos: DatosPago[]) => api.post<PagoDetalle[]>("/pagos/varios", { pagos }).then((r) => r.data);
export const editarPago = (id: number, d: DatosPago & { motivo: string }) => api.put<PagoDetalle>(`/pagos/${id}`, d).then((r) => r.data);
export const revisarPagos = (ids: number[]) =>
  api.post<{ revisados: number[]; omitidos: { id: number; motivo: string }[] }>("/pagos/revisar", { ids }).then((r) => r.data);
export const anularPago = (id: number, motivo: string) => api.post<PagoDetalle>(`/pagos/${id}/anular`, { motivo }).then((r) => r.data);
/** Agrega un comprobante (foto o PDF) al pago. */
export const subirAdjuntoPago = (id: number, archivo: File, tipoDocumento: TipoDocumentoPago) => {
  const datos = new FormData();
  datos.append("tipoDocumento", tipoDocumento);
  datos.append("archivo", archivo);
  return api.post<PagoDetalle>(`/pagos/${id}/adjuntos`, datos).then((r) => r.data);
};
export const enlaceAdjuntoPago = (id: number, adjuntoId: number) => api.get<{ url: string; nombreArchivo: string }>(`/pagos/${id}/adjuntos/${adjuntoId}/enlace`).then((r) => r.data);
export const quitarAdjuntoPago = (id: number, adjuntoId: number, motivo: string) =>
  api.delete<PagoDetalle>(`/pagos/${id}/adjuntos/${adjuntoId}`, { data: { motivo } }).then((r) => r.data);
/** Completa el comprobante de un pago que se registró sin él. */
export const completarComprobante = (id: number, tipoComprobante: TipoComprobante, serieNumero: string) =>
  api.post<PagoDetalle>(`/pagos/${id}/comprobante`, { tipoComprobante, serieNumero }).then((r) => r.data);

/** Alertas en vivo: duplicado (proveedor + comprobante + total) y concepto no proformado. Los vacíos no se envían. */
export const verificarPago = (v: {
  operacionId: number;
  conceptoId?: number;
  clasificacion?: Clasificacion;
  proveedorId?: number;
  serieNumero?: string;
  total?: number;
  excepto?: number;
}) => api.get<Verificacion>("/pagos/verificar", { params: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== "")) }).then((r) => r.data);

/** Por número, DAM o BL; solo operaciones que reciben pagos. */
export const buscarOperacion = (texto: string) => api.get<OperacionEncontrada[]>("/operaciones/buscar", { params: { texto } }).then((r) => r.data);

export const usePagos = (f: FiltroPagos, habilitado = true) =>
  useQuery({ queryKey: ["pagos", f], queryFn: () => listarPagos(f), placeholderData: keepPreviousData, enabled: habilitado });
export const usePago = (id: number | null) => useQuery({ queryKey: ["pagos", id], queryFn: () => obtenerPago(id!), enabled: id !== null });
