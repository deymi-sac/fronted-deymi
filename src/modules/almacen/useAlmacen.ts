import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./almacen.api";

// ---------- Divisiones ----------
export function useDivisiones() {
  return useQuery({ queryKey: ["almacen", "divisiones"], queryFn: api.listarDivisiones });
}

export function useActualizarCapacidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id_division, capacidad_maxima }: { id_division: number; capacidad_maxima: number }) =>
      api.actualizarCapacidadDivision(id_division, capacidad_maxima),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almacen", "divisiones"] });
      queryClient.invalidateQueries({ queryKey: ["almacen", "dashboard"] });
    },
  });
}

export function useHistorialCapacidad(id_division: number | null) {
  return useQuery({
    queryKey: ["almacen", "divisiones", id_division, "historial"],
    queryFn: () => api.historialCapacidadDivision(id_division!),
    enabled: id_division !== null,
  });
}

export function useDetalleOcupacionDivision(id_division: number | null) {
  return useQuery({
    queryKey: ["almacen", "divisiones", id_division, "detalle"],
    queryFn: () => api.detalleOcupacionDivision(id_division!),
    enabled: id_division !== null,
  });
}

// ---------- Clientes ----------
export function useClientesAlmacen(incluirArchivados = false) {
  return useQuery({
    queryKey: ["almacen", "clientes", { incluirArchivados }],
    queryFn: () => api.listarClientes(incluirArchivados),
  });
}

export function useCrearClienteAlmacen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.crearCliente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["almacen", "clientes"] }),
  });
}

export function useActualizarClienteAlmacen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<api.CrearClientePayload> }) =>
      api.actualizarCliente(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["almacen", "clientes"] }),
  });
}

export function useStockPorClientePorDivision(id_cliente_almacen: number | null) {
  return useQuery({
    queryKey: ["almacen", "clientes", id_cliente_almacen, "stock-por-division"],
    queryFn: () => api.stockPorClientePorDivision(id_cliente_almacen!),
    enabled: id_cliente_almacen !== null,
  });
}

export function useArchivarClienteAlmacen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivar }: { id: number; archivar: boolean }) => api.archivarCliente(id, archivar),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["almacen", "clientes"] }),
  });
}

// ---------- Productos ----------
export function useProductosDeCliente(id_cliente_almacen: number | null) {
  return useQuery({
    queryKey: ["almacen", "productos", id_cliente_almacen],
    queryFn: () => api.listarProductosDeCliente(id_cliente_almacen!),
    enabled: id_cliente_almacen !== null,
  });
}

export function useCrearProductoAlmacen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.crearProducto,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["almacen", "productos", variables.id_cliente_almacen] });
      queryClient.invalidateQueries({ queryKey: ["almacen", "clientes"] });
    },
  });
}

export function useEliminarProductoAlmacen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.eliminarProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almacen", "productos"] });
      queryClient.invalidateQueries({ queryKey: ["almacen", "clientes"] });
    },
  });
}

// ---------- Movimientos ----------
export function useMovimientos(filtros?: Parameters<typeof api.listarMovimientos>[0]) {
  return useQuery({
    queryKey: ["almacen", "movimientos", filtros],
    queryFn: () => api.listarMovimientos(filtros),
  });
}

export function useCrearMovimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.crearMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almacen"] });
    },
  });
}

export function useMovimiento(id_movimiento: number | null) {
  return useQuery({
    queryKey: ["almacen", "movimientos", "detalle", id_movimiento],
    queryFn: () => api.obtenerMovimiento(id_movimiento!),
    enabled: id_movimiento !== null,
  });
}

export function useActualizarMovimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<api.CrearMovimientoPayload> }) =>
      api.actualizarMovimiento(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almacen"] });
    },
  });
}

export function useEliminarMovimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.eliminarMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["almacen"] });
    },
  });
}

// ---------- Dashboard ----------
export function useDashboardAlmacen() {
  return useQuery({ queryKey: ["almacen", "dashboard"], queryFn: api.obtenerDashboard });
}

// ---------- Facturación ----------
export function useCierreMensual(idCliente: number | null, anio: number, mes: number) {
  return useQuery({
    queryKey: ["almacen", "facturacion", idCliente, anio, mes],
    queryFn: () => api.obtenerCierreMensual(idCliente!, anio, mes),
    enabled: idCliente !== null,
  });
}
