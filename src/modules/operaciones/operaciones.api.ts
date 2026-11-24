import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";
import type { Moneda } from "../maestros/maestros.api";
import type { Pagina } from "../proformas/proformas.api";
import type { TipoOperacion, Via } from "../tarifas/tarifas.api";

export const ESTADOS_OPERACION = ["ABIERTA", "FINALIZADA", "EN_LIQUIDACION", "LIQUIDADA", "FACTURADA", "CERRADA", "ANULADA"] as const;
export type EstadoOperacion = (typeof ESTADOS_OPERACION)[number];

/** Mientras no esté liquidada se pueden completar o corregir DAM, BL, contenedores y catálogos (igual que el backend). */
export const EDITABLES: EstadoOperacion[] = ["ABIERTA", "FINALIZADA", "EN_LIQUIDACION", "LIQUIDADA", "FACTURADA", "CERRADA"];

export interface OperacionResumen {
  id: number;
  numero: string;
  estado: EstadoOperacion;
  fechaApertura: string;
  clienteId: number;
  cliente: string;
  proforma: string | null;
  tipoOperacion: TipoOperacion;
  via: Via;
  lineaNaviera: string | null;
  moneda: Moneda;
  dam: string | null;
  blAwb: string | null;
  cantidadContenedores: number;
  /** Pagos vigentes y cuántos de ellos siguen sin comprobante */
  cantidadPagos: number;
  pagosSinSustento: number;
}

export interface ContenedorOperacion {
  id: number;
  numero: string;
  tipoContenedorId: number | null;
  tipoContenedor: string | null;
  precinto: string | null;
  pesoKg: number | null;
}

export interface HistorialOperacion {
  fechaHora: string;
  usuario: string;
  accion: string;
  descripcion: string;
  motivo: string | null;
}

/** Etapa del flujo en la que está la operación y el paso que falta */
export interface SiguientePaso {
  etapa: string | null;
  etapas: { nombre: string; hecha: boolean }[];
  paso: { titulo: string; detalle: string; ruta: string; boton: string } | null;
}

export interface ChecklistCierre {
  pagosRequeridos: boolean;
  pagosRegistrados: boolean;
  pagosSinSustento: number;
  tieneLiquidacion: boolean;
  diferenciasRevisadas: boolean;
  tieneNotaCobranza: boolean;
  tieneFactura: boolean;
  lineasPorFacturar: number;
  pendientes: string[];
  completo: boolean;
}

export interface Operacion {
  id: number;
  numero: string;
  estado: EstadoOperacion;
  fechaApertura: string;
  fechaFin: string | null;
  /** Por qué se pide motivo al corregir sus datos (ya liquidada o facturada); null = se edita sin motivo */
  edicionConMotivo?: string | null;
  clienteId: number;
  cliente: { id: number; razonSocial: string; tipoDocumento: "RUC" | "TAX_ID"; numeroDocumento: string };
  proforma: { id: number; numero: string; moneda: Moneda; total: number } | null;
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
  moneda: Moneda;
  dam: string | null;
  blAwb: string | null;
  contenedores: ContenedorOperacion[];
  /** Resumen de los pagos vigentes de la operación */
  pagos: { cantidad: number; sinSustento: number; totales: { moneda: Moneda; total: number }[] };
  /** Lo que falta para cerrar la operación */
  checklist: ChecklistCierre;
  /** Qué le falta a la operación y a dónde ir */
  siguientePaso?: SiguientePaso;
  creadoPor: string;
  creadoEn: string;
  historial: HistorialOperacion[];
}

/** Lo que se completa durante el trámite (los catálogos y el DAM/BL se pueden corregir). */
export interface DatosOperacion {
  fechaApertura: string;
  fechaFin?: string;
  dam: string | null;
  blAwb: string | null;
  regimenId: number | null;
  aduanaId: number | null;
  puertoId: number | null;
  lineaNavieraId: number | null;
  terminalId: number | null;
  almacenId: number | null;
}

export interface DatosContenedor {
  numero: string;
  tipoContenedorId: number | null;
  precinto: string | null;
  pesoKg: number | null;
}

export interface FiltroOperaciones {
  pagina: number;
  estado?: EstadoOperacion;
  /** true = las que siguen en curso (ni cerradas ni anuladas) */
  enCurso?: boolean;
  buscar?: string;
}

export const TAMANO_PAGINA = 10;

export const listarOperaciones = (f: FiltroOperaciones) =>
  api.get<Pagina<OperacionResumen>>("/operaciones", { params: { ...f, tamano: TAMANO_PAGINA } }).then((r) => r.data);
export const obtenerOperacion = (id: number) => api.get<Operacion>(`/operaciones/${id}`).then((r) => r.data);
export const editarOperacion = (id: number, d: Partial<DatosOperacion> & { motivo?: string }) => api.patch<Operacion>(`/operaciones/${id}`, d).then((r) => r.data);
export const guardarContenedores = (id: number, contenedores: DatosContenedor[], motivo?: string) =>
  api.put<Operacion>(`/operaciones/${id}/contenedores`, { contenedores, ...(motivo && { motivo }) }).then((r) => r.data);
export const finalizarOperacion = (id: number, fechaFin: string) => api.post<Operacion>(`/operaciones/${id}/finalizar`, { fechaFin }).then((r) => r.data);
export const reabrirOperacion = (id: number, motivo: string) => api.post<Operacion>(`/operaciones/${id}/reabrir`, { motivo }).then((r) => r.data);
export const cerrarOperacion = (id: number) => api.post<Operacion>(`/operaciones/${id}/cerrar`).then((r) => r.data);
export const anularOperacion = (id: number, motivo: string) => api.post<Operacion>(`/operaciones/${id}/anular`, { motivo }).then((r) => r.data);

export const useOperaciones = (f: FiltroOperaciones) =>
  useQuery({ queryKey: ["operaciones", f], queryFn: () => listarOperaciones(f), placeholderData: keepPreviousData });
export const useOperacion = (id: number | null) =>
  useQuery({ queryKey: ["operaciones", id], queryFn: () => obtenerOperacion(id!), enabled: id !== null });
