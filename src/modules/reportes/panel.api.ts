import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";
import type { CuentasPorCobrar } from "../cobranza/cobranza.api";
import type { Moneda } from "../maestros/maestros.api";

/** Importes de una misma cosa en cada moneda: no se suman soles con dólares. */
export type PorMoneda = { moneda: Moneda; total: number }[];

/** Panel gerencial del módulo comercial, tal como lo devuelve /api/panel-comercial. */
export interface PanelComercial {
  fecha: string;
  operaciones: {
    enCurso: number;
    pendientesLiquidar: number;
    conGastosSinComprobante: number;
    conDiferencias: number;
    conItemsSinCobrar: number;
    porEstado: { estado: string; cantidad: number }[];
  };
  proformas: { porAprobar: number; aprobadasSinConvertir: number; borradores: number };
  pagos: { hoy: PorMoneda; mes: PorMoneda };
  facturacion: { facturadoMes: PorMoneda; notasPorFacturar: number; porFacturar: PorMoneda };
  cobranza: {
    cobradoMes: PorMoneda;
    porCobrar: CuentasPorCobrar["resumen"];
    notasVencidas: number;
    porAplicar: CuentasPorCobrar["porAplicar"];
  };
  gastoPorConcepto: { concepto: string; moneda: Moneda; total: number }[];
  /** Solo con el permiso de rentabilidad */
  rentabilidad: { operacion: string; cliente: string; moneda: Moneda; servicios: number; margen: number; margenPorcentaje: number }[] | null;
  alertas: {
    tipo: "sin_cobrar" | "duplicado" | "documentos" | "diferencia" | "vencida";
    operacionId: number;
    pagoId?: number;
    notaCobranzaId?: number;
    texto: string;
  }[];
  ultimosPagos: { id: number; fecha: string; operacion: string; proveedor: string; concepto: string; moneda: Moneda; total: number; estado: string }[];
}

export const obtenerPanel = () => api.get<PanelComercial>("/panel-comercial").then((r) => r.data);

export const usePanelComercial = () => useQuery({ queryKey: ["panel-comercial"], queryFn: obtenerPanel, refetchInterval: 5 * 60_000 });
