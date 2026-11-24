import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";
import type { Moneda } from "../maestros/maestros.api";
import type { CabeceraTarifa, LineaTarifa, Tarifa, TipoCalculo, TipoOperacion, Tramo, Unidad, Via } from "../tarifas/tarifas.api";

export const ESTADOS_PROFORMA = ["BORRADOR", "ENVIADA", "APROBADA", "RECHAZADA", "CONVERTIDA", "ANULADA"] as const;
export type EstadoProforma = (typeof ESTADOS_PROFORMA)[number];

/** A qué estado puede pasar cada uno (la misma regla que el backend). */
export const TRANSICIONES: Record<EstadoProforma, EstadoProforma[]> = {
  BORRADOR: ["ENVIADA", "APROBADA", "ANULADA"],
  ENVIADA: ["APROBADA", "RECHAZADA", "BORRADOR", "ANULADA"],
  APROBADA: ["BORRADOR", "ANULADA"],
  RECHAZADA: ["BORRADOR", "ANULADA"],
  /** Solo sale de "convertir en operación" */
  CONVERTIDA: [],
  ANULADA: [],
};

export interface ProformaResumen {
  id: number;
  numero: string;
  fecha: string;
  fechaVencimiento: string;
  /** Borrador o enviada con la validez ya pasada */
  vencida: boolean;
  estado: EstadoProforma;
  clienteId: number;
  cliente: string;
  ordenServicio: string | null;
  tipoOperacion: TipoOperacion;
  via: Via;
  lineaNaviera: string | null;
  moneda: Moneda;
  total: number;
  operacion: { id: number; numero: string } | null;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
  paginas: number;
}

export interface LineaProforma {
  id: number;
  /** Convertida: comprobante vigente que ya la incluye ("F001-1760"); esa línea ya no cambia */
  facturadaEn?: string | null;
  conceptoId: number;
  conceptoCodigo: string;
  conceptoTipo: "SERVICIO_PROPIO" | "GASTO_TERCERO";
  tarifaDetalleId: number | null;
  descripcion: string;
  tipoCalculo: TipoCalculo;
  unidad: Unidad;
  cantidad: number;
  porcentaje: number | null;
  /** Solo con tipoCalculo TRAMOS: la tabla de la tarifa */
  tramos: Tramo[] | null;
  /** El importe de la tarifa ya traía el IGV */
  incluyeIgv: boolean;
  baseCalculo: number | null;
  montoMinimo: number | null;
  montoMaximo: number | null;
  monedaOrigen: Moneda | null;
  importeOrigen: number | null;
  precioUnitario: number;
  afectoIgv: boolean;
  subtotal: number;
  igv: number;
  total: number;
  /** Quién cobra el concepto (viene de la tarifa) */
  proveedorId?: number | null;
  /** Solo con el permiso proformas_margen */
  costoUnitario?: number | null;
  costoTotal?: number | null;
  margen?: number | null;
}

export interface Proforma {
  id: number;
  numero: string;
  fecha: string;
  fechaVencimiento: string;
  vencida: boolean;
  estado: EstadoProforma;
  clienteId: number;
  cliente: { id: number; razonSocial: string; tipoDocumento: "RUC" | "TAX_ID"; numeroDocumento: string; direccion: string | null };
  tarifaId: number | null;
  tarifa: string | null;
  ordenServicio: string | null;
  tipoOperacion: TipoOperacion;
  via: Via;
  regimenId: number | null;
  regimen: string | null;
  aduanaId: number | null;
  aduana: string | null;
  puertoId: number | null;
  puerto: string | null;
  lineaNavieraId: number | null;
  lineaNaviera: string | null;
  terminalId: number | null;
  terminal: string | null;
  almacenId: number | null;
  almacen: string | null;
  tipoCargaId: number | null;
  tipoCarga: string | null;
  tipoContenedorId: number | null;
  tipoContenedor: string | null;
  cantidadContenedores: number | null;
  pesoKg: number | null;
  valorFob: number | null;
  valorFlete: number | null;
  valorSeguro: number | null;
  valorCif: number | null;
  moneda: Moneda;
  tipoCambio: number | null;
  subtotal: number;
  igv: number;
  total: number;
  /** Solo con el permiso proformas_margen */
  costoTotal?: number;
  margenEstimado?: number | null;
  condiciones: string | null;
  validezDias: number;
  creadoPor: string;
  creadoEn: string;
  actualizadoEn: string | null;
  operacion: { id: number; numero: string; dam?: string | null } | null;
  /** DAM (en la convertida, la de su operación) */
  dam?: string | null;
  /** Convertida: por qué ya no se edita (su operación está anulada); null = se puede */
  edicionBloqueada?: string | null;
  /** Convertida: por qué se pide motivo al editarla (ya liquidada o facturada); null = se edita sin motivo */
  edicionConMotivo?: string | null;
  lineas: LineaProforma[];
}

/** La tarifa que aplica, con los precios especiales del cliente ya puestos. */
export interface TarifaAplicable extends Tarifa {
  detalle: (LineaTarifa & { precioEspecialId: number | null })[];
}

/** Cómo se calcula cada línea; precio, IGV, totales y costo los calcula el backend al guardar. */
export interface DatosLineaProforma {
  /** Línea ya guardada (en la proforma convertida se conserva) */
  id?: number;
  conceptoId: number;
  tipoCalculo: TipoCalculo;
  unidad: Unidad;
  cantidad: number;
  tarifaDetalleId: number | null;
  descripcion?: string;
  importe: number | null;
  porcentaje: number | null;
  basePorcentaje: "FOB" | "CIF" | null;
  tramos: Tramo[] | null;
  /** El importe ya incluye IGV (tarifas con precios con IGV) */
  incluyeIgv: boolean;
  montoMinimo: number | null;
  montoMaximo: number | null;
  /** Moneda del importe si no es la de la proforma */
  monedaOrigen: Moneda | null;
  /** Sin indicar: lo que diga el concepto (ej. un cliente del exterior puede ir sin IGV) */
  afectoIgv?: boolean;
  costoUnitario: number | null;
  /** Quién cobra el concepto (viene de la tarifa): llena el proveedor al registrar el pago */
  proveedorId?: number | null;
}

export interface DatosProforma {
  fecha?: string;
  clienteId: number;
  tarifaId: number | null;
  ordenServicio: string | null;
  tipoOperacion: TipoOperacion;
  via: Via;
  regimenId: number | null;
  aduanaId: number | null;
  puertoId: number | null;
  lineaNavieraId: number | null;
  terminalId: number | null;
  almacenId: number | null;
  tipoCargaId: number | null;
  tipoContenedorId: number | null;
  cantidadContenedores: number | null;
  pesoKg: number | null;
  valorFob: number | null;
  valorFlete: number | null;
  valorSeguro: number | null;
  valorCif: number | null;
  moneda: Moneda;
  tipoCambio: number | null;
  /** Sin enviar: las condiciones por defecto de la empresa */
  condiciones?: string | null;
  validezDias: number;
  /** Obligatorio si su operación ya está liquidada o facturada */
  motivo?: string;
  /** Si ya se tiene; en la convertida se guarda en la operación */
  dam?: string | null;
  lineas: DatosLineaProforma[];
}

export interface FiltroProformas {
  pagina: number;
  estado?: EstadoProforma;
  buscar?: string;
}

/** Las generales, más las de este cliente; con él se aplican sus precios especiales. */
export type FiltroTarifaProforma = { clienteId: number | null; fecha?: string };

export const TAMANO_PAGINA = 10;

export const listarProformas = (f: FiltroProformas) =>
  api.get<Pagina<ProformaResumen>>("/proformas", { params: { ...f, tamano: TAMANO_PAGINA } }).then((r) => r.data);
export const obtenerProforma = (id: number) => api.get<Proforma>(`/proformas/${id}`).then((r) => r.data);
export const crearProforma = (d: DatosProforma) => api.post<Proforma>("/proformas", d).then((r) => r.data);
/** Reemplaza la proforma completa: en borrador, o convertida (lo cambiado pasa también a su operación). */
export const editarProforma = (id: number, d: DatosProforma) => api.put<Proforma>(`/proformas/${id}`, d).then((r) => r.data);
export const cambiarEstadoProforma = (id: number, estado: EstadoProforma, motivo?: string) =>
  api.post<Proforma>(`/proformas/${id}/estado`, { estado, motivo }).then((r) => r.data);

export interface ProformaEliminada {
  numero: string;
  numeroDevuelto: boolean;
  operacion: { numero: string; numeroDevuelto: boolean } | null;
}
/** Borra la proforma (y su operación si aún no tiene pagos ni documentos). Queda copia con el motivo. */
export const eliminarProforma = (id: number, motivo: string) =>
  api.post<ProformaEliminada>(`/proformas/${id}/eliminar`, { motivo }).then((r) => r.data);

/** Una proforma aprobada se convierte en operación (OP-2026-000001); la proforma queda convertida. */
export const convertirEnOperacion = (id: number) =>
  api.post<{ operacion: { id: number; numero: string }; proforma: Proforma }>(`/proformas/${id}/convertir`).then((r) => r.data);

/** Los vacíos no se envían. */
const parametrosTarifa = (f: FiltroTarifaProforma) => ({ ...(f.clienteId && { clienteId: f.clienteId }), ...(f.fecha && { fecha: f.fecha }) });
export const listarTarifasParaProforma = (f: FiltroTarifaProforma) =>
  api.get<CabeceraTarifa[]>("/tarifas/para-proforma", { params: parametrosTarifa(f) }).then((r) => r.data);
/** null si esa tarifa no se puede usar para el cliente o la fecha */
export const obtenerTarifaParaProforma = (id: number, f: FiltroTarifaProforma) =>
  api.get<TarifaAplicable | null>(`/tarifas/para-proforma/${id}`, { params: parametrosTarifa(f) }).then((r) => r.data);

export const useProformas = (f: FiltroProformas) =>
  useQuery({ queryKey: ["proformas", f], queryFn: () => listarProformas(f), placeholderData: keepPreviousData });
export const useProforma = (id: number | null) =>
  useQuery({ queryKey: ["proformas", id], queryFn: () => obtenerProforma(id!), enabled: id !== null });
export const useTarifasParaProforma = (f: FiltroTarifaProforma) =>
  useQuery({ queryKey: ["tarifas", "para-proforma", f], queryFn: () => listarTarifasParaProforma(f), placeholderData: keepPreviousData });
