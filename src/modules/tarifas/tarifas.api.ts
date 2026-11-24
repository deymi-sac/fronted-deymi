import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";
import type { Moneda } from "../maestros/maestros.api";

export type TipoOperacion = "IMPORTACION" | "EXPORTACION";
export type Via = "MARITIMA" | "AEREA" | "TERRESTRE";
/** CONT_ADICIONAL = cada contenedor después del primero */
export const UNIDADES = ["OPERACION", "CONTENEDOR", "CONT_ADICIONAL", "KG", "TONELADA", "BL", "DAM"] as const;
export type Unidad = (typeof UNIDADES)[number];
export type TipoCalculo = "FIJO" | "POR_UNIDAD" | "PORCENTAJE" | "TRAMOS";

/** Un rango del FOB/CIF: hasta ese valor se cobra un porcentaje o un importe fijo. hasta null = en adelante. */
export interface Tramo {
  hasta: number | null;
  /** 0.3 = 0.30 % */
  porcentaje?: number | null;
  importe?: number | null;
}

/** Cabecera: a qué operaciones aplica. null en naviera, aduana, terminal, contenedor, régimen o tipo de carga = a todas. */
export interface CabeceraTarifa {
  id: number;
  nombre: string;
  tipoOperacion: TipoOperacion;
  via: Via;
  lineaNavieraId: number | null;
  lineaNaviera: string | null;
  aduanaId: number | null;
  aduana: string | null;
  terminalId: number | null;
  terminal: string | null;
  tipoContenedorId: number | null;
  tipoContenedor: string | null;
  regimenId: number | null;
  regimen: string | null;
  tipoCargaId: number | null;
  tipoCarga: string | null;
  /** Tarifa exclusiva de un cliente (null = general) */
  clienteId: number | null;
  cliente: string | null;
  moneda: Moneda;
  /** Los importes ya incluyen IGV */
  preciosIncluyenIgv: boolean;
  vigenteDesde: string;
  vigenteHasta: string | null;
  activo: boolean;
}

export interface TarifaResumen extends CabeceraTarifa {
  cantidadConceptos: number;
}

export interface LineaTarifa {
  id: number;
  conceptoId: number;
  concepto: string;
  conceptoCodigo: string;
  conceptoTipo: "SERVICIO_PROPIO" | "GASTO_TERCERO";
  /** Texto tal como figura en el tarifario (null = el nombre del concepto) */
  descripcion: string | null;
  afectoIgv: boolean;
  tipoCalculo: TipoCalculo;
  unidad: Unidad;
  importe: number | null;
  /** 0.5 = 0.5 % */
  porcentaje: number | null;
  basePorcentaje: "FOB" | "CIF" | null;
  /** Solo con tipoCalculo TRAMOS */
  tramos: Tramo[] | null;
  montoMinimo: number | null;
  montoMaximo: number | null;
  /** null = la moneda de la tarifa */
  moneda: Moneda | null;
  /** Lo que cobra el proveedor (uso interno). null = se traslada al costo, sin margen. */
  costoUnitario: number | null;
  /** Quién cobra el concepto (ej. MSC, TPE): llena el proveedor al registrar el pago */
  proveedorId: number | null;
  orden: number;
}

export interface Tarifa extends CabeceraTarifa {
  detalle: LineaTarifa[];
}

export interface PrecioCliente {
  id: number;
  clienteId: number;
  cliente: string;
  tarifaDetalleId: number;
  concepto: string;
  importe: number | null;
  porcentaje: number | null;
  montoMinimo: number | null;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

/** Datos de la cabecera que se envían al crear o editar. */
export type DatosCabecera = Omit<CabeceraTarifa, "id" | "lineaNaviera" | "aduana" | "terminal" | "tipoContenedor" | "regimen" | "tipoCarga" | "cliente">;

/** Una línea al guardar el detalle: con `id` se actualiza, sin `id` se agrega; la que falta se quita. */
export type DatosLinea = Pick<
  LineaTarifa,
  "conceptoId" | "descripcion" | "tipoCalculo" | "unidad" | "importe" | "porcentaje" | "basePorcentaje" | "tramos" | "montoMinimo" | "montoMaximo" | "moneda" | "costoUnitario"
> & { id?: number; proveedorId?: number | null };

export type DatosPrecioCliente = Omit<PrecioCliente, "id" | "cliente" | "concepto">;

export const listarTarifas = () => api.get<TarifaResumen[]>("/tarifas").then((r) => r.data);
export const obtenerTarifa = (id: number) => api.get<Tarifa>(`/tarifas/${id}`).then((r) => r.data);

export const crearTarifa = (d: DatosCabecera & { detalle?: DatosLinea[] }) => api.post<Tarifa>("/tarifas", d).then((r) => r.data);
export const editarTarifa = (id: number, d: Partial<DatosCabecera>) => api.patch<Tarifa>(`/tarifas/${id}`, d).then((r) => r.data);
export const guardarDetalle = (id: number, detalle: DatosLinea[]) =>
  api.put<Tarifa>(`/tarifas/${id}/detalle`, { detalle }).then((r) => r.data);
/** La copia queda inactiva para revisarla antes de usarla. */
export const duplicarTarifa = (id: number, d: { nombre: string; lineaNavieraId?: number | null; vigenteDesde?: string }) =>
  api.post<Tarifa>(`/tarifas/${id}/duplicar`, d).then((r) => r.data);

export const listarPreciosCliente = (tarifaId: number) =>
  api.get<PrecioCliente[]>(`/tarifas/${tarifaId}/precios-cliente`).then((r) => r.data);
export const crearPrecioCliente = (tarifaId: number, d: DatosPrecioCliente) =>
  api.post<PrecioCliente>(`/tarifas/${tarifaId}/precios-cliente`, d).then((r) => r.data);
export const editarPrecioCliente = (tarifaId: number, precioId: number, d: Partial<Omit<DatosPrecioCliente, "clienteId" | "tarifaDetalleId">>) =>
  api.patch<PrecioCliente>(`/tarifas/${tarifaId}/precios-cliente/${precioId}`, d).then((r) => r.data);
export const eliminarPrecioCliente = (tarifaId: number, precioId: number) =>
  api.delete(`/tarifas/${tarifaId}/precios-cliente/${precioId}`);

export const useTarifas = () => useQuery({ queryKey: ["tarifas"], queryFn: listarTarifas });
export const useTarifa = (id: number | null) =>
  useQuery({ queryKey: ["tarifas", id], queryFn: () => obtenerTarifa(id!), enabled: id !== null });
export const usePreciosCliente = (id: number | null) =>
  useQuery({ queryKey: ["tarifas", id, "precios-cliente"], queryFn: () => listarPreciosCliente(id!), enabled: id !== null });
