import { api } from "../../api/axios";

// ---------- Divisiones ----------
export interface DivisionAlmacen {
  id_division: number;
  nombre: string;
  funcion: string | null;
  capacidad_maxima: number | null;
  orden: number;
  ocupacion_actual?: number;
}

export interface HistorialCapacidad {
  id: number;
  id_division: number;
  capacidad_anterior: number | null;
  capacidad_nueva: number;
  fecha: string;
  usuarios: { nombre: string; apellido: string };
}

export async function listarDivisiones(): Promise<DivisionAlmacen[]> {
  const { data } = await api.get<DivisionAlmacen[]>("/almacen/divisiones");
  return data;
}

export async function actualizarCapacidadDivision(id_division: number, capacidad_maxima: number) {
  const { data } = await api.put<DivisionAlmacen>(`/almacen/divisiones/${id_division}/capacidad`, {
    capacidad_maxima,
  });
  return data;
}

export async function historialCapacidadDivision(id_division: number): Promise<HistorialCapacidad[]> {
  const { data } = await api.get<HistorialCapacidad[]>(`/almacen/divisiones/${id_division}/historial-capacidad`);
  return data;
}

export interface ProductoEnDivision {
  nombre: string;
  pallets: number;
}

export interface ClienteEnDivision {
  id_cliente_almacen: number;
  razon_social: string;
  pallets: number;
  productos: ProductoEnDivision[];
}

export async function detalleOcupacionDivision(id_division: number): Promise<ClienteEnDivision[]> {
  const { data } = await api.get<ClienteEnDivision[]>(`/almacen/divisiones/${id_division}/detalle`);
  return data;
}

// ---------- Clientes ----------
export interface ProductoAlmacen {
  id_producto: number;
  id_cliente_almacen: number;
  nombre: string;
  unidad_medida: string;
  activo: boolean;
  stock_actual?: number;
}

export interface ClienteAlmacen {
  id_cliente_almacen: number;
  razon_social: string;
  ruc: string | null;
  tarifa_mensual_m2: string | null;
  fecha_vencimiento_contrato: string | null;
  estado: "Activo" | "Archivado";
  observaciones: string | null;
  creado_en: string;
  productos: ProductoAlmacen[];
  stock_actual?: number;
  unidades?: Record<string, number>;
  stock_real?: number;
}

export interface CrearClientePayload {
  razon_social: string;
  ruc?: string;
  tarifa_mensual_m2?: number;
  fecha_vencimiento_contrato?: string;
  observaciones?: string;
}

export async function listarClientes(incluirArchivados = false): Promise<ClienteAlmacen[]> {
  const { data } = await api.get<ClienteAlmacen[]>("/almacen/clientes", {
    params: incluirArchivados ? { incluirArchivados: "true" } : undefined,
  });
  return data;
}

export async function crearCliente(payload: CrearClientePayload): Promise<ClienteAlmacen> {
  const { data } = await api.post<ClienteAlmacen>("/almacen/clientes", payload);
  return data;
}

export async function actualizarCliente(id: number, payload: Partial<CrearClientePayload>): Promise<ClienteAlmacen> {
  const { data } = await api.put<ClienteAlmacen>(`/almacen/clientes/${id}`, payload);
  return data;
}

export interface StockPorDivision {
  id_division: number;
  nombre: string;
  pallets: number;
}

export async function stockPorClientePorDivision(
  id_cliente_almacen: number,
  opciones: { soloConBultos?: boolean; id_producto?: number } = {}
): Promise<StockPorDivision[]> {
  const { data } = await api.get<StockPorDivision[]>(`/almacen/clientes/${id_cliente_almacen}/stock-por-division`, {
    params: {
      ...(opciones.soloConBultos ? { soloConBultos: "true" } : {}),
      ...(opciones.id_producto !== undefined ? { id_producto: opciones.id_producto } : {}),
    },
  });
  return data;
}

export async function archivarCliente(id: number, archivar: boolean): Promise<ClienteAlmacen> {
  const { data } = await api.put<ClienteAlmacen>(`/almacen/clientes/${id}/archivar`, { archivar });
  return data;
}

// ---------- Productos ----------
export async function listarProductosDeCliente(id_cliente_almacen: number): Promise<ProductoAlmacen[]> {
  const { data } = await api.get<ProductoAlmacen[]>("/almacen/productos", {
    params: { id_cliente_almacen },
  });
  return data;
}

export async function crearProducto(payload: {
  id_cliente_almacen: number;
  nombre: string;
  unidad_medida?: string;
}): Promise<ProductoAlmacen> {
  const { data } = await api.post<ProductoAlmacen>("/almacen/productos", payload);
  return data;
}

export async function actualizarProducto(
  id_producto: number,
  payload: Partial<{ nombre: string; unidad_medida: string; activo: boolean }>
): Promise<ProductoAlmacen> {
  const { data } = await api.put<ProductoAlmacen>(`/almacen/productos/${id_producto}`, payload);
  return data;
}

export interface EliminarProductoResultado {
  eliminado: boolean;
  archivado: boolean;
  producto: ProductoAlmacen | null;
}

export async function eliminarProducto(id_producto: number): Promise<EliminarProductoResultado> {
  const { data } = await api.delete<EliminarProductoResultado>(`/almacen/productos/${id_producto}`);
  return data;
}

// ---------- Movimientos ----------
export interface MovimientoAlmacen {
  id_movimiento: number;
  tipo: "Ingreso" | "Salida";
  motivo: string;
  id_cliente_almacen: number;
  id_producto: number | null;
  id_division: number;
  modo: "Contenedor" | "Carga suelta";
  num_contenedor: string | null;
  num_declaracion: string | null;
  cantidad: string;
  unidad_medida: string;
  pallets_ocupados: number | null;
  cantidad_bultos: number | null;
  unidad_bultos: string | null;
  detalle_bultos_pallets: number[];
  libera_pallet: boolean | null;
  fecha: string;
  observaciones: string | null;
  estado: string;
  aprobado_en: string | null;
  creado_en: string;
  clientes: { razon_social: string };
  productos: { nombre: string } | null;
  divisiones: { nombre: string };
  registrado_por: { nombre: string; apellido: string };
  aprobador: { nombre: string; apellido: string } | null;
  pallets_impacto?: number;
}

export interface CrearMovimientoPayload {
  tipo: "Ingreso" | "Salida";
  motivo: string;
  id_cliente_almacen: number;
  id_producto?: number;
  id_division: number;
  modo: "Contenedor" | "Carga suelta";
  num_contenedor?: string;
  num_declaracion?: string;
  cantidad: number;
  unidad_medida: string;
  pallets_ocupados?: number;
  cantidad_bultos?: number;
  unidad_bultos?: string;
  detalle_bultos_pallets?: number[];
  libera_pallet?: boolean;
  fecha: string;
  observaciones?: string;
  forzar_exceso_capacidad?: boolean;
}

export interface ExcesoCapacidadInfo {
  error: string;
  ocupacion_actual: number;
  capacidad_maxima: number;
  cantidad_solicitada: number;
  requiere_confirmacion: true;
}

export async function listarMovimientos(filtros?: {
  cliente?: number;
  division?: number;
  tipo?: string;
  desde?: string;
  hasta?: string;
}): Promise<MovimientoAlmacen[]> {
  const { data } = await api.get<MovimientoAlmacen[]>("/almacen/movimientos", { params: filtros });
  return data;
}

export async function crearMovimiento(payload: CrearMovimientoPayload): Promise<MovimientoAlmacen> {
  const { data } = await api.post<MovimientoAlmacen>("/almacen/movimientos", payload);
  return data;
}

export async function obtenerMovimiento(id_movimiento: number): Promise<MovimientoAlmacen> {
  const { data } = await api.get<MovimientoAlmacen>(`/almacen/movimientos/${id_movimiento}`);
  return data;
}

export async function actualizarMovimiento(
  id_movimiento: number,
  payload: Partial<CrearMovimientoPayload>
): Promise<MovimientoAlmacen> {
  const { data } = await api.put<MovimientoAlmacen>(`/almacen/movimientos/${id_movimiento}`, payload);
  return data;
}

export async function eliminarMovimiento(id_movimiento: number): Promise<void> {
  await api.delete(`/almacen/movimientos/${id_movimiento}`);
}

export async function exportarKardex(): Promise<Blob> {
  const { data } = await api.get("/almacen/kardex/exportar", { responseType: "blob" });
  return data;
}

// ---------- Dashboard ----------
export interface AlertaAlmacen {
  nivel: "red" | "amber" | "neutral";
  titulo: string;
  detalle: string;
}

export interface KpisAlmacen {
  stock_actual: number;
  stock_pallets: number;
  stock_unidades: number;
  ingresos_mes: number;
  salidas_mes: number;
  clientes_con_stock: number;
  ocupacion_almacen_pct: number | null;
  permanencia_promedio_dias: number;
}

export interface MovimientoMensual {
  mes: string;
  ingresos: number;
  salidas: number;
}

export interface BucketAntiguedad {
  rango: string;
  pallets: number;
  estado: "verde" | "amarillo" | "naranja" | "rojo";
}

export interface OcupacionAlmacen {
  capacidad_total: number | null;
  ocupadas: number;
  disponibles: number | null;
}

export interface OcupacionPorCliente {
  razon_social: string;
  pallets: number;
  unidades: Record<string, number>;
  stock_real: number;
  m2: number;
}

export interface DashboardAlmacen {
  kpis: KpisAlmacen;
  divisiones: (DivisionAlmacen & { ocupacion_actual: number })[];
  clientes: (ClienteAlmacen & { stock_actual: number })[];
  alertas: AlertaAlmacen[];
  movimiento_mensual: MovimientoMensual[];
  antiguedad_inventario: BucketAntiguedad[];
  ocupacion_almacen: OcupacionAlmacen;
  ocupacion_por_cliente: OcupacionPorCliente[];
}

export async function obtenerDashboard(): Promise<DashboardAlmacen> {
  const { data } = await api.get<DashboardAlmacen>("/almacen/dashboard");
  return data;
}

// ---------- Facturación ----------
export interface ControlDiario {
  fecha: string;
  saldo_inicial: number;
  ingresos: number;
  salidas: number;
  saldo_final: number;
  pallets_facturables: number;
  costo_dia: number | null;
}

export interface CierreMensual {
  cliente: { id_cliente_almacen: number; razon_social: string };
  anio: number;
  mes: number;
  tarifa_mensual_m2: number | null;
  tarifa_diaria_pallet: number | null;
  pallets_al_inicio: number;
  ingresos: number;
  salidas: number;
  pallets_al_cierre: number;
  pallet_dias_facturados: number;
  monto_a_facturar: number | null;
  control_diario: ControlDiario[];
}

export async function obtenerCierreMensual(idCliente: number, anio: number, mes: number): Promise<CierreMensual> {
  const { data } = await api.get<CierreMensual>(`/almacen/clientes/${idCliente}/cierre-mensual`, {
    params: { anio, mes },
  });
  return data;
}

export async function exportarCierreMensual(idCliente: number, anio: number, mes: number): Promise<Blob> {
  const { data } = await api.get(`/almacen/clientes/${idCliente}/cierre-mensual/exportar`, {
    params: { anio, mes },
    responseType: "blob",
  });
  return data;
}
