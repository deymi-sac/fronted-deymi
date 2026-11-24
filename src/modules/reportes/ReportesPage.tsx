import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { descargarCSV, useReporte, useReportesDisponibles, type FiltrosReporte, type Reporte } from "./reportes.api";
import { useClientes } from "../maestros/useMaestros";
import { Campo } from "../../components/ui/FormularioModal";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { PieTabla } from "../../components/ui/PieTabla";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { btnSecundario, inputClass } from "../../lib/estilos";
import { hoyISO, num, redondear } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";

const POR_PAGINA = 25;

/** Totales del pie: uno por moneda si el reporte tiene columna «Moneda» (no se suman soles con dólares). */
function totales(r: Reporte) {
  const sumar = (filas: Reporte["filas"]) => r.numericas.map((j) => redondear(filas.reduce((s, f) => s + Number(f[j] ?? 0), 0)));
  if (r.columnaMoneda === null) return [{ etiqueta: "Total", sumas: sumar(r.filas) }];
  const monedas = [...new Set(r.filas.map((f) => String(f[r.columnaMoneda!] ?? "")))].sort();
  return monedas.map((m) => ({ etiqueta: `Total ${m}`, sumas: sumar(r.filas.filter((f) => String(f[r.columnaMoneda!] ?? "") === m)) }));
}

/** Reportes del módulo comercial: se eligen a la izquierda, se filtran por fechas y cliente y se exportan a Excel o PDF. */
export default function ReportesPage() {
  const { data: disponibles } = useReportesDisponibles();
  const [elegido, setElegido] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosReporte>({ desde: `${hoyISO().slice(0, 7)}-01` });
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const { data: clientes } = useClientes();
  const clave = elegido ?? disponibles?.[0]?.clave ?? null;
  const { data: r, isFetching, error } = useReporte(clave, filtros);
  const actual = disponibles?.find((x) => x.clave === clave);
  const grupos = [...new Set((disponibles ?? []).map((x) => x.grupo))];
  const formatear = (v: string | number | null, col: number) => (v === null ? "—" : typeof v === "number" ? (r?.enteras.includes(col) ? String(v) : num(v)) : v);
  const rangoInvalido = !!filtros.desde && !!filtros.hasta && filtros.desde > filtros.hasta;
  const paginas = r ? Math.max(1, Math.ceil(r.filas.length / POR_PAGINA)) : 1;
  const paginaActual = Math.min(pagina, paginas);
  const filasPagina = r ? r.filas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA) : [];

  function cambiarFiltros(f: FiltrosReporte) {
    setFiltros(f);
    setPagina(1);
  }

  async function excel() {
    if (!clave || !actual) return;
    setDescargando(true);
    setErrorDescarga(null);
    try {
      await descargarCSV(clave, actual.nombre, filtros);
    } catch (e) {
      setErrorDescarga(mensajeDeError(e));
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="print:hidden">
        <EncabezadoPagina titulo="Reportes" subtitulo="Todos exportables a Excel (CSV) y PDF" />
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        <Tarjeta titulo="Reportes" sinPadding className="h-fit print:hidden">
          <nav className="p-2">
            {grupos.map((g) => (
              <div key={g} className="mb-2">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
                {disponibles!
                  .filter((x) => x.grupo === g)
                  .map((x) => (
                    <button
                      key={x.clave}
                      type="button"
                      onClick={() => {
                        setElegido(x.clave);
                        setPagina(1);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        clave === x.clave ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {x.nombre}
                    </button>
                  ))}
              </div>
            ))}
          </nav>
        </Tarjeta>

        <div className="min-w-0 space-y-4 lg:col-span-3">
          <Tarjeta className="print:hidden">
            <div className="flex flex-wrap items-end gap-4">
              <Campo label="Desde">
                <input type="date" value={filtros.desde ?? ""} onChange={(e) => cambiarFiltros({ ...filtros, desde: e.target.value || undefined })} className={inputClass} />
              </Campo>
              <Campo label="Hasta">
                <input type="date" value={filtros.hasta ?? ""} onChange={(e) => cambiarFiltros({ ...filtros, hasta: e.target.value || undefined })} className={inputClass} />
              </Campo>
              <Campo label="Cliente">
                <select value={filtros.clienteId ?? 0} onChange={(e) => cambiarFiltros({ ...filtros, clienteId: Number(e.target.value) || undefined })} className={inputClass}>
                  <option value={0}>Todos</option>
                  {clientes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={excel} disabled={!r?.filas.length || descargando || rangoInvalido} className={btnSecundario}>
                  <FileSpreadsheet size={16} className="text-emerald-600" /> {descargando ? "Descargando…" : "Excel"}
                </button>
                <button type="button" onClick={() => window.print()} disabled={!r?.filas.length} className={btnSecundario}>
                  <Printer size={16} className="text-red-600" /> PDF
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">Las fechas filtran por la fecha propia de cada reporte (pago, apertura, emisión…).</p>
          </Tarjeta>

          {rangoInvalido ? (
            <Aviso tono="advertencia" titulo="«Desde» no puede ser posterior a «hasta»." />
          ) : error ? (
            <Aviso tono="error" titulo="No se pudo generar el reporte">
              {mensajeDeError(error)}
            </Aviso>
          ) : errorDescarga ? (
            <Aviso tono="error" titulo={errorDescarga} />
          ) : null}
          {r?.truncado && (
            <Aviso tono="advertencia" titulo="Se muestran solo las primeras filas">
              Acota las fechas para ver el reporte completo.
            </Aviso>
          )}

          <section className="area-impresion rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-800">
                {actual?.nombre ?? "Reporte"}
                <span className="ml-2 hidden text-xs font-normal text-slate-500 print:inline">
                  {filtros.desde || filtros.hasta ? `${filtros.desde ?? "…"} a ${filtros.hasta ?? "hoy"}` : "Todas las fechas"}
                </span>
              </h2>
              <span className="text-xs text-slate-400 print:hidden">{isFetching ? "Generando…" : `${r?.filas.length ?? 0} filas`}</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    {r?.columnas.map((c, i) => (
                      <th key={`${c}-${i}`} className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${r.numericas.includes(i) ? "text-right" : "text-left"}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r?.filas.length === 0 && (
                    <tr>
                      <td colSpan={r.columnas.length} className="px-4 py-10 text-center text-slate-400">
                        Sin datos para los filtros elegidos
                      </td>
                    </tr>
                  )}
                  {filasPagina.map((fila, i) => (
                    <tr key={i}>
                      {fila.map((v, j) => (
                        <td key={j} className={`px-4 py-2.5 ${r!.numericas.includes(j) ? "whitespace-nowrap text-right" : ""}`}>
                          {formatear(v, j)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {r && r.filas.length > 0 && r.numericas.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50/70 font-semibold">
                    {totales(r).map((t) => (
                      <tr key={t.etiqueta}>
                        {r.columnas.map((_, j) => {
                          const k = r.numericas.indexOf(j);
                          return (
                            <td key={j} className={`whitespace-nowrap px-4 py-2.5 ${k >= 0 ? "text-right" : ""}`}>
                              {j === 0 ? t.etiqueta : k >= 0 ? formatear(t.sumas[k]!, j) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tfoot>
                )}
              </table>
            </div>
            <div className="print:hidden">
              <PieTabla pagina={paginaActual} paginas={paginas} onPagina={setPagina} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
