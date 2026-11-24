import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../api/axios";

/** Un reporte tal como lo devuelve /api/reportes-comercial/:clave. */
export interface Reporte {
  clave: string;
  nombre: string;
  columnas: string[];
  filas: (string | number | null)[][];
  /** Índices de columnas numéricas (a la derecha y con total) */
  numericas: number[];
  /** Columnas de conteo (sin decimales) */
  enteras: number[];
  /** Índice de la columna «Moneda»: los importes se suman por moneda, no juntos */
  columnaMoneda: number | null;
  /** Se cortó en el máximo de filas: acotar las fechas */
  truncado: boolean;
}

export interface ReporteDisponible {
  clave: string;
  nombre: string;
  grupo: string;
}

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  clienteId?: number;
}

const limpiar = (f: FiltrosReporte) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ""));

/** Los que este usuario puede abrir (el de rentabilidad pide su propio permiso). */
export const listarReportes = () => api.get<ReporteDisponible[]>("/reportes-comercial").then((r) => r.data);
export const generarReporte = (clave: string, f: FiltrosReporte) =>
  api.get<Reporte>(`/reportes-comercial/${clave}`, { params: limpiar(f) }).then((r) => r.data);

/** Descarga el CSV que arma el backend (con BOM y ";", para que Excel respete tildes y columnas). */
export async function descargarCSV(clave: string, nombre: string, f: FiltrosReporte) {
  const r = await api.get<Blob>(`/reportes-comercial/${clave}`, { params: { ...limpiar(f), formato: "csv" }, responseType: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(r.data);
  a.download = `${nombre} ${f.desde ?? ""}${f.hasta ? ` a ${f.hasta}` : ""}.csv`.replace(/\s+\.csv$/, ".csv");
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const useReportesDisponibles = () => useQuery({ queryKey: ["reportes-comercial"], queryFn: listarReportes, staleTime: Infinity });
export const useReporte = (clave: string | null, f: FiltrosReporte) =>
  useQuery({ queryKey: ["reportes-comercial", clave, f], queryFn: () => generarReporte(clave!, f), enabled: clave !== null, placeholderData: keepPreviousData });
