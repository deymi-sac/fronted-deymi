import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";
import type { CuentaBancaria as CuentaMaestro, Moneda } from "../maestros/maestros.api";
import type { Pagina } from "../proformas/proformas.api";

export const TAMANO_PAGINA = 10;

// =====================================================================
// Notas de cobranza
// =====================================================================

export const ESTADOS_NOTA = ["EMITIDA", "ENVIADA", "COBRADA_PARCIAL", "COBRADA", "ANULADA"] as const;
export type EstadoNota = (typeof ESTADOS_NOTA)[number];

export interface NotaResumen {
  id: number;
  numero: string;
  estado: EstadoNota;
  fechaEmision: string;
  fechaVencimiento: string;
  operacionId: number;
  operacion: string;
  clienteId: number;
  cliente: string;
  moneda: Moneda;
  total: number;
  cobrado: number;
  saldo: number;
  vencida: boolean;
  diasVencida: number;
}

export interface LineaNota {
  origen: "SERVICIO" | "PAGO";
  concepto: string;
  descripcion: string;
  documento: string | null;
  proveedor: string;
  monedaOrigen: Moneda;
  importeOrigen: number;
  tipoCambio: number | null;
  importe: number;
  igv: number;
  /** Proforma liquidada: cantidad y unidad de la línea de la proforma (gastos: 1 UND) */
  cantidad: number;
  unidad: string;
}

export interface CuentaBancaria {
  id: number;
  banco: string;
  moneda: Moneda;
  numeroCuenta: string;
  cci: string | null;
  activo?: boolean;
}

export interface Nota extends Omit<NotaResumen, "operacionId" | "operacion" | "clienteId" | "cliente"> {
  subtotal: number;
  igv: number;
  condicionesPago: string | null;
  enviadoEn: string | null;
  creadoPor: string;
  creadoEn: string;
  /** Total de hojas foliadas del expediente (sale en el documento) */
  hojasFoliadas: number | null;
  /** Datos para la proforma liquidada: la proforma con lo realmente cobrado */
  proformaLiquidada: {
    valorFob: number | null;
    valorFlete: number | null;
    valorSeguro: number | null;
    valorCif: number | null;
    facturas: string[];
    condicionPago: string;
  };
  empresa: {
    razonSocial: string;
    ruc: string;
    direccion: string | null;
    telefono: string | null;
    correo: string | null;
    web: string | null;
    logoUrl: string | null;
    pieNotaCobranza: string | null;
  } | null;
  cliente: { id: number; razonSocial: string; tipoDocumento: string; numeroDocumento: string; direccion: string | null; contacto: string | null; correo: string | null };
  operacion: {
    id: number;
    numero: string;
    tipoOperacion: string;
    via: string;
    dam: string | null;
    blAwb: string | null;
    aduana: string | null;
    regimen: string | null;
    almacen: string | null;
    puerto: string | null;
    lineaNaviera: string | null;
    terminal: string | null;
    proforma: string | null;
    ordenServicio: string | null;
    contenedores: string[];
  };
  cuentaBancaria: CuentaBancaria | null;
  cuentasBancarias: CuentaBancaria[];
  liquidacion: { id: number; version: number; estado: string; totalServicios: number; totalGastos: number; lineas: LineaNota[] };
  depositos: { cobro: string; fecha: string; banco: string; importe: number }[];
  cobros: { cobro: string; tipo: string; fecha: string; medioPago: string; importe: number }[];
  historial: { fechaHora: string; usuario: string; accion: string; descripcion: string; motivo: string | null }[];
}

export interface DatosNota {
  liquidacionId: number;
  moneda?: Moneda;
  cuentaBancariaId?: number | null;
  /** Por defecto, hoy; puede ser anterior (ej. la fecha de la factura) */
  fechaEmision?: string;
  /** Por defecto, la emisión + los días de crédito del cliente */
  fechaVencimiento?: string;
  condicionesPago?: string | null;
}

export interface FiltroNotas {
  pagina: number;
  estado?: EstadoNota;
  operacionId?: number;
  vencidas?: boolean;
  buscar?: string;
}

export const listarNotas = (f: FiltroNotas) => api.get<Pagina<NotaResumen>>("/notas", { params: { ...f, tamano: TAMANO_PAGINA } }).then((r) => r.data);
export const obtenerNota = (id: number) => api.get<Nota>(`/notas/${id}`).then((r) => r.data);
export const generarNota = (d: DatosNota) => api.post<Nota>("/notas", d).then((r) => r.data);
/** Corrige la emisión y el vencimiento de una nota vigente (queda en el historial). */
export const corregirFechasNota = (id: number, d: { fechaEmision: string; fechaVencimiento: string }) =>
  api.put<Nota>(`/notas/${id}/fechas`, d).then((r) => r.data);
/** Total de hojas foliadas del expediente (null lo borra). */
export const guardarHojasFoliadas = (id: number, hojasFoliadas: number | null) =>
  api.put<Nota>(`/notas/${id}/hojas-foliadas`, { hojasFoliadas }).then((r) => r.data);
export const enviarNota = (id: number) => api.post<Nota>(`/notas/${id}/enviar`).then((r) => r.data);
export const anularNota = (id: number, motivo: string) => api.post<Nota>(`/notas/${id}/anular`, { motivo }).then((r) => r.data);

export const useNotas = (f: FiltroNotas) => useQuery({ queryKey: ["notas", f], queryFn: () => listarNotas(f), placeholderData: keepPreviousData });
export const useNota = (id: number | null) => useQuery({ queryKey: ["notas", id], queryFn: () => obtenerNota(id!), enabled: id !== null });
/** Las notas vigentes de una operación (para la pantalla de su liquidación) */
export const useNotasDeOperacion = (operacionId: number) =>
  useQuery({ queryKey: ["notas", "operacion", operacionId], queryFn: () => listarNotas({ pagina: 1, operacionId }), enabled: operacionId > 0 });

// =====================================================================
// Cuentas bancarias de la empresa (maestro)
// =====================================================================

export const listarCuentas = () => api.get<CuentaMaestro[]>("/maestros/cuentas-bancarias").then((r) => r.data);
export const useCuentasBancarias = () => useQuery({ queryKey: ["maestros", "cuentas"], queryFn: listarCuentas });

// =====================================================================
// Facturas
// =====================================================================

export const ESTADOS_FACTURA = ["EMITIDA", "ANULADA"] as const;
export type EstadoFactura = (typeof ESTADOS_FACTURA)[number];
export type TipoComprobante = "FACTURA" | "BOLETA" | "NOTA_CREDITO" | "NOTA_DEBITO";

export interface FacturaResumen {
  id: number;
  tipoComprobante: TipoComprobante;
  serie: string;
  numero: number;
  comprobante: string;
  estado: EstadoFactura;
  fechaEmision: string;
  operacionId: number;
  operacion: string;
  clienteId: number;
  cliente: string;
  notaCobranzaId: number | null;
  notaCobranza: string | null;
  moneda: Moneda;
  baseImponible: number;
  igv: number;
  total: number;
}

export interface FacturaDetalle extends Omit<FacturaResumen, "cliente"> {
  estadoOperacion: string;
  cliente: { id: number; razonSocial: string; tipoDocumento: string; numeroDocumento: string };
  liquidacionId: number | null;
  liquidacionVersion: number | null;
  registradoPor: string;
  registradoEn: string;
  /** Archivo de la factura (PDF o imagen); null = aún no se sube */
  archivo: { nombre: string | null; mime: string | null; tamano: number | null } | null;
  lineas: { liquidacionDetalleId: number | null; proformaDetalleId: number | null; origen: string; concepto: string; descripcion: string | null; documento: string | null; importe: number; igv: number }[];
  historial: { fechaHora: string; usuario: string; accion: string; descripcion: string; motivo: string | null }[];
}

export interface LineaPorFacturar {
  id: number;
  origen: string;
  concepto: string;
  descripcion: string | null;
  documento: string | null;
  /** Quién cobró el gasto (solo líneas de pagos) */
  proveedor?: string | null;
  importe: number;
  afectoIgv: boolean;
  igv: number;
}

export interface PorFacturar {
  baseImponible: number;
  igv: number;
  total: number;
}

export interface PendienteNota {
  notaCobranzaId: number;
  notaCobranza: string;
  estadoNota: EstadoNota;
  fechaEmision: string;
  operacionId: number;
  operacion: string;
  clienteId: number;
  cliente: string;
  liquidacionVersion: number;
  moneda: Moneda;
  lineas: LineaPorFacturar[];
  porFacturar: PorFacturar;
}

export interface PendienteOperacion {
  operacionId: number;
  operacion: string;
  estadoOperacion: string;
  fechaFin: string | null;
  proforma: string;
  clienteId: number;
  cliente: string;
  moneda: Moneda;
  lineas: LineaPorFacturar[];
  porFacturar: PorFacturar;
}

export interface DatosFactura {
  notaCobranzaId?: number;
  operacionId?: number;
  tipoComprobante: "FACTURA" | "BOLETA";
  serie: string;
  numero: number;
  fechaEmision: string;
  lineasIds: number[];
}

export interface FiltroFacturas {
  pagina: number;
  estado?: EstadoFactura;
  buscar?: string;
}

export type PaginaFacturas = Pagina<FacturaResumen> & { totales: { moneda: Moneda; total: number }[] };

export const listarFacturas = (f: FiltroFacturas) => api.get<PaginaFacturas>("/facturas", { params: { ...f, tamano: TAMANO_PAGINA } }).then((r) => r.data);
export const obtenerFactura = (id: number) => api.get<FacturaDetalle>(`/facturas/${id}`).then((r) => r.data);
export const pendientesDeFacturar = () => api.get<PendienteNota[]>("/facturas/pendientes").then((r) => r.data);
export const operacionesPorFacturar = () => api.get<PendienteOperacion[]>("/facturas/pendientes-operacion").then((r) => r.data);
/** Sugerencia: el número que sigue en esa serie (el real lo da el sistema de facturación). */
export const siguienteNumero = (tipoComprobante: TipoComprobante, serie: string) =>
  api.get<{ numero: number }>("/facturas/siguiente-numero", { params: { tipoComprobante, serie } }).then((r) => r.data.numero);
export const registrarFactura = (d: DatosFactura) => api.post<FacturaDetalle>("/facturas", d).then((r) => r.data);
/** Corrige la fecha de emisión (queda en el historial). */
export const corregirFechaFactura = (id: number, fechaEmision: string) =>
  api.put<FacturaDetalle>(`/facturas/${id}/fecha`, { fechaEmision }).then((r) => r.data);
/** Archivo de la factura (PDF, JPG, PNG o WEBP, máx. 10 MB); reemplaza el anterior si lo había. */
export function subirArchivoFactura(id: number, archivo: File) {
  const datos = new FormData();
  datos.append("archivo", archivo);
  return api.post<{ nombre: string }>(`/facturas/${id}/archivo`, datos).then((r) => r.data);
}
/** Dirección del archivo de la factura. */
export const enlaceArchivoFactura = (id: number) => api.get<{ url: string }>(`/facturas/${id}/archivo/enlace`).then((r) => r.data.url);
export const anularFactura = (id: number, motivo: string) => api.post<FacturaDetalle>(`/facturas/${id}/anular`, { motivo }).then((r) => r.data);

export const useFacturas = (f: FiltroFacturas) => useQuery({ queryKey: ["facturas", f], queryFn: () => listarFacturas(f), placeholderData: keepPreviousData });
export const useFactura = (id: number | null) => useQuery({ queryKey: ["facturas", id], queryFn: () => obtenerFactura(id!), enabled: id !== null });
export const usePendientesDeFacturar = () => useQuery({ queryKey: ["facturas", "pendientes"], queryFn: pendientesDeFacturar });
export const useOperacionesPorFacturar = () => useQuery({ queryKey: ["facturas", "pendientes-operacion"], queryFn: operacionesPorFacturar });

// =====================================================================
// Cobros
// =====================================================================

export const MEDIOS_COBRO = ["TRANSFERENCIA", "DEPOSITO", "CHEQUE", "EFECTIVO", "DETRACCION", "OTRO"] as const;
export type MedioCobro = (typeof MEDIOS_COBRO)[number];
export type TipoCobro = "PAGO" | "ANTICIPO";
export type EstadoCobro = "REGISTRADO" | "ANULADO";

export interface CobroResumen {
  id: number;
  numero: string;
  tipo: TipoCobro;
  estado: EstadoCobro;
  fechaCobro: string;
  clienteId: number;
  cliente: string;
  moneda: Moneda;
  importe: number;
  aplicado: number;
  porAplicar: number;
  medioPago: MedioCobro;
  nroOperacionBancaria: string | null;
  cuentaBancaria: string;
}

export interface Cobro extends CobroResumen {
  tipoCambio: number | null;
  cuentaBancariaId: number;
  operacionId: number | null;
  operacion: string | null;
  observaciones: string | null;
  /** Foto o PDF de la constancia del abono */
  constanciaUrl: string | null;
  registradoPor: string;
  registradoEn: string;
  aplicaciones: {
    notaCobranzaId: number;
    notaCobranza: string;
    operacion: string;
    monedaNota: Moneda;
    totalNota: number;
    estadoNota: EstadoNota;
    importeAplicado: number;
    importeCobro: number;
    tipoCambio: number | null;
    aplicadoPor: string;
    aplicadoEn: string;
  }[];
  historial: { fechaHora: string; usuario: string; accion: string; descripcion: string; motivo: string | null }[];
}

export interface AplicacionCobro {
  notaCobranzaId: number;
  importe: number;
  tipoCambio?: number;
}

export interface DatosCobro {
  clienteId: number;
  operacionId?: number | null;
  tipo: TipoCobro;
  fechaCobro: string;
  moneda: Moneda;
  importe: number;
  tipoCambio?: number | null;
  cuentaBancariaId: number;
  medioPago: MedioCobro;
  nroOperacionBancaria?: string | null;
  observaciones?: string | null;
  aplicaciones: AplicacionCobro[];
}

export interface FiltroCobros {
  pagina: number;
  estado?: EstadoCobro;
  tipo?: TipoCobro;
  porAplicar?: boolean;
  buscar?: string;
}

export type PaginaCobros = Pagina<CobroResumen> & { totales: { moneda: Moneda; total: number }[] };

export type Tramo = "POR_VENCER" | "1_30" | "31_60" | "61_90" | "MAS_90";

export interface CuentasPorCobrar {
  fecha: string;
  resumen: { moneda: Moneda; notas: number; saldo: number; vencido: number; porTramo: Record<Tramo, number> }[];
  items: {
    notaCobranzaId: number;
    notaCobranza: string;
    estado: EstadoNota;
    operacionId: number;
    operacion: string;
    clienteId: number;
    cliente: string;
    fechaEmision: string;
    fechaVencimiento: string;
    moneda: Moneda;
    total: number;
    cobrado: number;
    saldo: number;
    diasVencida: number;
    tramo: Tramo;
  }[];
  porAplicar: { cobroId: number; numero: string; clienteId: number; tipo: TipoCobro; moneda: Moneda; importe: number; porAplicar: number }[];
}

export const listarCobros = (f: FiltroCobros) => api.get<PaginaCobros>("/cobros", { params: { ...f, tamano: TAMANO_PAGINA } }).then((r) => r.data);
export const obtenerCobro = (id: number) => api.get<Cobro>(`/cobros/${id}`).then((r) => r.data);
export const cuentasPorCobrar = () => api.get<CuentasPorCobrar>("/cobros/cuentas-por-cobrar").then((r) => r.data);
export const registrarCobro = (d: DatosCobro) => api.post<Cobro>("/cobros", d).then((r) => r.data);
export const aplicarCobro = (id: number, aplicaciones: AplicacionCobro[]) => api.post<Cobro>(`/cobros/${id}/aplicar`, { aplicaciones }).then((r) => r.data);
export const subirConstancia = (id: number, archivo: File) => {
  const datos = new FormData();
  datos.append("archivo", archivo);
  return api.post<Cobro>(`/cobros/${id}/constancia`, datos).then((r) => r.data);
};
export const quitarConstancia = (id: number) => api.delete<Cobro>(`/cobros/${id}/constancia`).then((r) => r.data);
/** Corrige la fecha del abono (queda en el historial). */
export const corregirFechaCobro = (id: number, fechaCobro: string) => api.put<Cobro>(`/cobros/${id}/fecha`, { fechaCobro }).then((r) => r.data);
export const anularCobro = (id: number, motivo: string) => api.post<Cobro>(`/cobros/${id}/anular`, { motivo }).then((r) => r.data);

export const useCobros = (f: FiltroCobros) => useQuery({ queryKey: ["cobros", f], queryFn: () => listarCobros(f), placeholderData: keepPreviousData });
export const useCobro = (id: number | null) => useQuery({ queryKey: ["cobros", id], queryFn: () => obtenerCobro(id!), enabled: id !== null });
export const useCuentasPorCobrar = () => useQuery({ queryKey: ["cobros", "cuentas-por-cobrar"], queryFn: cuentasPorCobrar });
