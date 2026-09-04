import { useState } from "react";
import { exportarServiciosExcel } from "./services.api";

interface ExportarExcelModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function ExportarExcelModal({ abierto, onCerrar }: ExportarExcelModalProps) {
  const anioActual = new Date().getFullYear();
  const [mes, setMes] = useState<number | "">(new Date().getMonth() + 1);
  const [anio, setAnio] = useState<number>(anioActual);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");

  if (!abierto) return null;

  async function manejarExportar() {
    try {
      setExportando(true);
      setError("");

      const blob = await exportarServiciosExcel({
        mes: mes === "" ? undefined : mes,
        anio,
      });

      const nombreArchivo =
        mes === ""
          ? `servicios_${anio}.xlsx`
          : `servicios_${anio}-${String(mes).padStart(2, "0")}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.URL.revokeObjectURL(url);

      onCerrar();
    } catch (err) {
      console.error("Error exportando servicios:", err);
      setError("No se pudo generar el archivo Excel.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Exportar servicios a Excel</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecciona el periodo a exportar. Deja "Todos los meses" para exportar el año completo.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">Todos los meses</option>
              {MESES.map((nombre, index) => (
                <option key={nombre} value={index + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={exportando}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={manejarExportar}
            disabled={exportando}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? "Generando..." : "Exportar"}
          </button>
        </div>
      </div>
    </div>
  );
}
