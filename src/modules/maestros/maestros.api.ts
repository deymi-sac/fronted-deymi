import { api } from "../../api/axios";

export type Moneda = "PEN" | "USD";

export interface Cliente {
  id: number;
  razonSocial: string;
  tipoDocumento: "RUC" | "TAX_ID";
  numeroDocumento: string;
  tipoCliente: "NACIONAL" | "EXTRANJERO";
  direccion: string | null;
  contacto: string | null;
  correo: string | null;
  telefono: string | null;
  condicionCredito: "CONTADO" | "CREDITO";
  diasCredito: number;
  moneda: Moneda;
  activo: boolean;
}

export const TIPOS_PROVEEDOR = ["NAVIERA", "TERMINAL", "ALMACEN", "TRANSPORTE", "ENTIDAD_PUBLICA", "OTRO"] as const;
export type TipoProveedor = (typeof TIPOS_PROVEEDOR)[number];

export interface Proveedor {
  id: number;
  ruc: string;
  extranjero: boolean;
  razonSocial: string;
  /** Cómo sale en la nota de cobranza y la proforma liquidada; null = la razón social */
  nombreCorto: string | null;
  tipo: TipoProveedor;
  activo: boolean;
}

export interface Concepto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: "SERVICIO_PROPIO" | "GASTO_TERCERO";
  afectoIgv: boolean;
  activo: boolean;
  precioSugerido: number | null;
  precioMoneda: Moneda;
  precioIncluyeIgv: boolean;
}

export type TipoCatalogo =
  | "aduanas"
  | "puertos"
  | "regimenes"
  | "terminales"
  | "almacenes"
  | "lineas-navieras"
  | "tipos-carga"
  | "tipos-contenedor";

export interface ItemCatalogo {
  id: number;
  nombre: string;
  codigo?: string | null;
  proveedorId?: number | null;
  tipoOperacion?: "IMPORTACION" | "EXPORTACION" | null;
  activo: boolean;
}

/** Qué lleva cada catálogo (código, proveedor que factura) y cómo se titula. */
export const TIPOS_CATALOGO: { clave: TipoCatalogo; titulo: string; codigo: boolean; proveedor: boolean; ayudaCodigo?: string }[] = [
  { clave: "aduanas", titulo: "Aduanas", codigo: true, proveedor: false, ayudaCodigo: "Ej. 118 para la aduana del Callao" },
  { clave: "puertos", titulo: "Puertos", codigo: true, proveedor: false },
  { clave: "regimenes", titulo: "Regímenes", codigo: true, proveedor: false, ayudaCodigo: "Código SUNAT del régimen, si lo tiene" },
  { clave: "terminales", titulo: "Terminales", codigo: false, proveedor: true },
  { clave: "almacenes", titulo: "Almacenes de operación", codigo: false, proveedor: true },
  { clave: "lineas-navieras", titulo: "Líneas navieras", codigo: false, proveedor: true },
  { clave: "tipos-carga", titulo: "Tipos de carga", codigo: false, proveedor: false },
  { clave: "tipos-contenedor", titulo: "Tipos de contenedor", codigo: true, proveedor: false, ayudaCodigo: "Ej. 40HC" },
];

export type Catalogos = Record<TipoCatalogo, ItemCatalogo[]> & {
  monedas: { codigo: string; simbolo: string; nombre: string }[];
};

// Sin `id` para crear; para editar se manda solo lo que cambió (la API acepta cambios parciales).
export type DatosCliente = Omit<Cliente, "id">;
export type DatosProveedor = Omit<Proveedor, "id">;
export type DatosConcepto = Omit<Concepto, "id">;
export type DatosItemCatalogo = Omit<ItemCatalogo, "id">;

// ---------- Clientes ----------
export const listarClientes = () => api.get<Cliente[]>("/maestros/clientes").then((r) => r.data);
export const crearCliente = (d: DatosCliente) => api.post<Cliente>("/maestros/clientes", d).then((r) => r.data);
export const editarCliente = (id: number, d: Partial<DatosCliente>) =>
  api.patch<Cliente>(`/maestros/clientes/${id}`, d).then((r) => r.data);

// ---------- Proveedores ----------
export const listarProveedores = () => api.get<Proveedor[]>("/maestros/proveedores").then((r) => r.data);
export const crearProveedor = (d: DatosProveedor) => api.post<Proveedor>("/maestros/proveedores", d).then((r) => r.data);
export const editarProveedor = (id: number, d: Partial<DatosProveedor>) =>
  api.patch<Proveedor>(`/maestros/proveedores/${id}`, d).then((r) => r.data);

// ---------- Conceptos ----------
export const listarConceptos = () => api.get<Concepto[]>("/maestros/conceptos").then((r) => r.data);
export const crearConcepto = (d: DatosConcepto) => api.post<Concepto>("/maestros/conceptos", d).then((r) => r.data);
export const editarConcepto = (id: number, d: Partial<DatosConcepto>) =>
  api.patch<Concepto>(`/maestros/conceptos/${id}`, d).then((r) => r.data);

// ---------- Catálogos de operación ----------
export const obtenerCatalogos = () => api.get<Catalogos>("/maestros/catalogos").then((r) => r.data);
export const crearItemCatalogo = (tipo: TipoCatalogo, d: DatosItemCatalogo) =>
  api.post<ItemCatalogo>(`/maestros/catalogos/${tipo}`, d).then((r) => r.data);
export const editarItemCatalogo = (tipo: TipoCatalogo, id: number, d: Partial<DatosItemCatalogo>) =>
  api.patch<ItemCatalogo>(`/maestros/catalogos/${tipo}/${id}`, d).then((r) => r.data);

/** Solo los campos que cambiaron, para no pisar lo que otro usuario editó en el resto. */
export function cambios<T extends object>(antes: T, ahora: T): Partial<T> {
  const resultado: Partial<T> = {};
  for (const k of Object.keys(ahora) as (keyof T)[]) {
    if (JSON.stringify(antes[k] ?? null) !== JSON.stringify(ahora[k] ?? null)) resultado[k] = ahora[k];
  }
  return resultado;
}


// ---------- Cuentas bancarias de la empresa ----------
export interface CuentaBancaria {
  id: number;
  banco: string;
  moneda: Moneda;
  numeroCuenta: string;
  cci: string | null;
  activo: boolean;
}
export type DatosCuenta = Omit<CuentaBancaria, "id">;
export const crearCuenta = (d: DatosCuenta) => api.post<CuentaBancaria>("/maestros/cuentas-bancarias", d).then((r) => r.data);
export const editarCuenta = (id: number, d: Partial<DatosCuenta>) => api.patch<CuentaBancaria>(`/maestros/cuentas-bancarias/${id}`, d).then((r) => r.data);

// ---------- Datos de la empresa (encabezado de las proformas) ----------
export interface Empresa {
  razonSocial: string;
  ruc: string;
  nombreComercial: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  web: string | null;
  logoUrl: string | null;
  tasaIgv: number;
  pieProforma: string | null;
  /** Condiciones de pago que se imprimen en la nota de cobranza */
  pieNotaCobranza: string | null;
}

/** null mientras no se hayan cargado los datos de la empresa. */
export const obtenerEmpresa = () => api.get<Empresa | null>("/maestros/empresa").then((r) => r.data);
export const guardarEmpresa = (d: Empresa) => api.put<Empresa>("/maestros/empresa", d).then((r) => r.data);

// ---------- Numeración de documentos ----------
export interface Numeracion {
  tipo: "PF" | "OP" | "NC" | "CO";
  nombre: string;
  prefijo: string;
  digitos: number;
  reinicioAnual: boolean;
  ultimoNumero: number;
  proximoNumero: number;
  /** Cómo saldría el próximo número */
  siguiente: string;
  actualizadoEn: string | null;
}

export type DatosNumeracion = Pick<Numeracion, "prefijo" | "digitos" | "reinicioAnual" | "proximoNumero">;

export const listarNumeracion = () => api.get<Numeracion[]>("/maestros/numeracion").then((r) => r.data);
export const guardarNumeracion = (tipo: Numeracion["tipo"], d: DatosNumeracion) =>
  api.put<Numeracion>(`/maestros/numeracion/${tipo}`, d).then((r) => r.data);
