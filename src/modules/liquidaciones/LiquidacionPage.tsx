import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Check, CheckCircle2, ClipboardCheck, FilePlus2, MessageSquareWarning, RotateCcw, Stamp } from "lucide-react";
import {
  anularLiquidacion, aprobarLiquidacion, elaborarLiquidacion, necesitaJustificacion, observarLiquidacion, reabrirLiquidacion, revisarLiquidacion, useLiquidacionDeOperacion,
  type EstadoLiquidacion, type Justificaciones, type LiquidacionDeOperacion, type TipoDiferencia,
} from "./liquidaciones.api";
import { FormularioMotivo } from "../operaciones/FormulariosOperacion";
import { GenerarNotaModal } from "../cobranza/GenerarNotaModal";
import { useNotasDeOperacion } from "../cobranza/cobranza.api";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { ComparacionTabla } from "../../components/ui/ComparacionTabla";
import { Aqui } from "../../components/ui/Aqui";
import { useAqui } from "../../lib/useAqui";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";
import { btnExito, btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { dinero, etiqueta } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import type { Moneda } from "../maestros/maestros.api";
import { Paginado } from "../../components/ui/Paginado";

const PASOS: EstadoLiquidacion[] = ["ELABORADA", "REVISADA", "APROBADA"];
const MINIMO_JUSTIFICACION = 10;
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

/** Una línea en pantalla: de la liquidación guardada o de lo que se jalaría al elaborar. */
interface Fila {
  /** "p<pago>" al elaborar, "l<línea>" al revisar: así se arma el envío */
  clave: string;
  origen: "SERVICIO" | "PAGO";
  factura: string | null;
  concepto: string;
  descripcion: string;
  documento: string | null;
  proveedor: string;
  monedaOrigen: Moneda;
  importeOrigen: number;
  importeProformado: number | null;
  importeReal: number;
  tipoDiferencia: TipoDiferencia;
  afectoIgv: boolean;
  igv: number;
  monedaCobro: Moneda;
  importeCobro: number;
  justificacion: string | null;
}

function filas(d: LiquidacionDeOperacion, propuesta: boolean): Fila[] {
  if (propuesta || !d.liquidacion) {
    return d.propuesta.lineas.map((l, i) => ({ ...l, clave: l.pagoId ? `p${l.pagoId}` : `s${i}` }));
  }
  return d.liquidacion.lineas.map((l) => ({ ...l, clave: `l${l.id}` }));
}

/** Si después de elaborar cambió algún pago, la liquidación ya no refleja la realidad. */
function desactualizada(d: LiquidacionDeOperacion) {
  const l = d.liquidacion;
  if (!l || (l.estado !== "ELABORADA" && l.estado !== "REVISADA")) return false;
  const pagos = (xs: { pagoId: number | null; importeReal: number }[]) =>
    xs
      .filter((x) => x.pagoId)
      .map((x) => `${x.pagoId}:${x.importeReal}`)
      .sort()
      .join(",");
  return d.pagosSinRevisar > 0 || pagos(l.lineas) !== pagos(d.propuesta.lineas) || l.total !== d.propuesta.total;
}

export default function LiquidacionPage() {
  const operacionId = Number(useParams().operacionId);
  const qc = useQueryClient();
  // El backend valida cada permiso: aquí solo se decide qué botones mostrar
  const puedeTrabajar = tienePermiso("liquidaciones_elaborar");
  const puedeRevisar = tienePermiso("liquidaciones_revisar");
  const puedeNota = tienePermiso("notas_generar");
  const puedeAprobar = tienePermiso("liquidaciones_aprobar");
  const puedeReabrir = tienePermiso("liquidaciones_reabrir");
  const { data, error } = useLiquidacionDeOperacion(operacionId);
  const [justif, setJustif] = useState<Justificaciones>({});
  const [modal, setModal] = useState<"observar" | "reabrir" | "anular" | "nota" | null>(null);
  const notas = useNotasDeOperacion(operacionId);
  // En qué moneda se cobra: null = una cobranza por moneda (lo pagado en soles, en soles)
  const [monedaCobro, setMonedaCobro] = useState<Moneda | null>(null);
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrar = () => setModal(null);

  const liq = data?.liquidacion ?? null;
  const liqId = liq?.id ?? 0;
  /** Las justificaciones escritas, sin la letra de la clave ("p12" → "12") */
  const envio = (prefijo: string) =>
    Object.fromEntries(
      Object.entries(justif)
        .filter(([k, v]) => k.startsWith(prefijo) && v.trim())
        .map(([k, v]) => [k.slice(1), v.trim()])
    );

  const refrescar = () => {
    for (const clave of ["liquidaciones", "pagos", "operaciones"]) qc.invalidateQueries({ queryKey: [clave] });
  };
  const alTerminar = () => {
    refrescar();
    setJustif({});
    setAviso(null);
    cerrar();
  };
  const alFallar = (e: unknown) => setAviso(mensajeDeError(e));
  const aqui = useAqui();
  /** Tras elaborar, revisar o aprobar, avisa qué sigue en la operación */
  const alAvanzar = () => {
    alTerminar();
    avisarSiguientePaso(operacionId);
  };

  const elaborar = useMutation({ mutationFn: () => elaborarLiquidacion(operacionId, envio("p"), { monedaCobro, tipoCambio: monedaCobro ? tipoCambio : null }), onSuccess: alAvanzar, onError: alFallar, meta: { exito: "Liquidación elaborada" } });
  const revisar = useMutation({ mutationFn: () => revisarLiquidacion(liqId, envio("l")), onSuccess: alAvanzar, onError: alFallar, meta: { exito: "Liquidación revisada" } });
  const aprobar = useMutation({ mutationFn: () => aprobarLiquidacion(liqId), onSuccess: alAvanzar, onError: alFallar, meta: { exito: "Liquidación aprobada" } });
  const observar = useMutation({ mutationFn: (m: string) => observarLiquidacion(liqId, m), onSuccess: alTerminar, onError: alFallar, meta: { exito: "Liquidación observada" } });
  const reabrir = useMutation({ mutationFn: (m: string) => reabrirLiquidacion(liqId, m), onSuccess: alTerminar, onError: alFallar, meta: { exito: "Liquidación reabierta" } });
  const anular = useMutation({ mutationFn: (m: string) => anularLiquidacion(liqId, m), onSuccess: alTerminar, onError: alFallar, meta: { exito: "Liquidación anulada" } });

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <Link to="/comercial/liquidaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Liquidaciones
        </Link>
        <Aviso tono="error" titulo="No se pudo cargar la liquidación">
          La operación no existe o no tienes acceso.
        </Aviso>
      </div>
    );
  }
  if (!data) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;

  const op = data.operacion;
  const estado = liq?.estado;
  // Sin liquidación, o reabierta: se muestra lo que se elaboraría ahora
  const enPropuesta = !liq || estado === "REABIERTA";
  const vencida = desactualizada(data);
  const lineas = filas(data, enPropuesta);
  const gastos = lineas.filter((l) => l.origen === "PAGO");
  const servicios = lineas.filter((l) => l.origen === "SERVICIO");
  const t = enPropuesta
    ? { servicios: data.propuesta.total_servicios, gastos: data.propuesta.total_gastos, igv: data.propuesta.igv, total: data.propuesta.total }
    : { servicios: liq!.totalServicios, gastos: liq!.totalGastos, igv: liq!.igv, total: liq!.total };
  const comparacion = enPropuesta ? data.comparacion : liq!.comparacion;
  // Lo que se cobra en cada moneda
  const porMoneda = enPropuesta ? data.propuesta.porMoneda : liq!.porMoneda;
  const dosMonedas = porMoneda.length > 1 || porMoneda.some((m) => m.moneda !== op.moneda);
  const pasoActual = liq && estado !== "REABIERTA" ? PASOS.indexOf(estado === "ENVIADA" ? "APROBADA" : estado!) : -1;

  const liquidable = op.estado === "FINALIZADA" || op.estado === "EN_LIQUIDACION";
  const puedeElaborar = puedeTrabajar && liquidable && (!liq || ["REABIERTA", "ELABORADA", "REVISADA"].includes(estado!));
  // Se justifica al elaborar (por pago) o al revisar (por línea)
  const justificando = (enPropuesta && puedeElaborar) || (estado === "ELABORADA" && (puedeTrabajar || puedeRevisar) && !vencida);
  const faltaJustificar = gastos.filter((l) => necesitaJustificacion(l) && (justif[l.clave] ?? l.justificacion ?? "").trim().length < MINIMO_JUSTIFICACION);
  const cortas = Object.values(justif).some((v) => v.trim() && v.trim().length < MINIMO_JUSTIFICACION);

  function enviarRevision() {
    if (faltaJustificar.length) return setAviso(`Justifica las diferencias: ${faltaJustificar.map((l) => l.concepto).join(", ")}`);
    setAviso(null);
    revisar.mutate();
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina
        volverA="/comercial/liquidaciones"
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Liquidación {op.numero}
            {liq && <EstadoBadge estado={liq.estado} texto={`v${liq.version} · ${etiqueta(liq.estado)}`} />}
          </span>
        }
        subtitulo={
          <>
            {data.cliente.razonSocial} ·{" "}
            <Link to={`/comercial/operaciones/${op.id}`} className="underline">
              ver operación
            </Link>
            {data.proforma && (
              <>
                {" "}
                · proforma{" "}
                <Link to={`/comercial/proformas/${data.proforma.id}`} className="underline">
                  {data.proforma.numero}
                </Link>
              </>
            )}
          </>
        }
      />

      {/* Flujo de aprobación */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        {PASOS.map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= pasoActual ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"}`}>
              {i < pasoActual || (i === pasoActual && p === "APROBADA") ? <Check size={14} /> : i + 1}
            </span>
            <span className={`whitespace-nowrap text-sm ${i <= pasoActual ? "font-semibold text-slate-900" : "text-slate-400"}`}>{etiqueta(p)}</span>
            {i < PASOS.length - 1 && <span className={`mx-2 h-px w-10 ${i < pasoActual ? "bg-slate-800" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          {op.estado === "ABIERTA" && (
            <Aviso tono="info" titulo="La operación sigue abierta">
              Se liquida cuando termina el trámite: márcala como finalizada desde la operación.
            </Aviso>
          )}
          {data.sinCobrar.length > 0 && op.estado !== "ANULADA" && (
            <Aviso tono="advertencia" titulo={`${data.sinCobrar.length} ítem(s) de la proforma no se van a cobrar: no tienen pago registrado`}>
              {data.sinCobrar.map((i, n) => (
                <span key={n} className="block">
                  · {i.descripcion}: {dinero(i.importe, op.moneda)}
                </span>
              ))}
              Si se pagaron, regístralos en{" "}
              <Link to="/comercial/pagos" className="font-semibold underline">
                Pagos
              </Link>{" "}
              como reembolsables.
            </Aviso>
          )}
          {data.pagosSinRevisar > 0 && (
            <Aviso tono="advertencia" titulo={`${data.pagosSinRevisar} pago(s) reembolsable(s) sin revisar`}>
              Revísalos en{" "}
              <Link to="/comercial/pagos" className="font-semibold underline">
                Pagos
              </Link>{" "}
              antes de liquidar.
            </Aviso>
          )}
          {vencida && (
            <Aviso tono="advertencia" titulo="Los pagos cambiaron después de elaborar">
              La liquidación v{liq!.version} ya no coincide con los pagos de la operación: vuelve a elaborarla.
            </Aviso>
          )}
          {data.observacion && (
            <Aviso tono="advertencia" titulo={`Observada por ${data.observacion.usuario} · ${fechaHora(data.observacion.fechaHora)}`}>
              {data.observacion.motivo}
            </Aviso>
          )}
          {estado === "REABIERTA" && (
            <Aviso tono="info" titulo={`v${liq!.version} reabierta`}>
              Se muestra lo que tendría la v{liq!.version + 1} con los pagos actuales. Corrige los pagos si hace falta y elabórala.
            </Aviso>
          )}

          <Tarjeta titulo="Gastos realizados por cuenta del cliente" sinPadding>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 text-left">Concepto</th>
                    <th className="px-4 py-2.5 text-left">Proveedor</th>
                    <th className="px-4 py-2.5 text-left">Documento</th>
                    <th className="px-4 py-2.5 text-right">Proformado</th>
                    <th className="px-4 py-2.5 text-right">Importe</th>
                    <th className="px-4 py-2.5 text-right">En {op.moneda}</th>
                    {dosMonedas && <th className="px-4 py-2.5 text-right">Se cobra</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gastos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                        Sin gastos reembolsables
                      </td>
                    </tr>
                  )}
                  {gastos.map((l) => {
                    const diferencia = necesitaJustificacion(l);
                    return (
                      <tr key={l.clave} className={diferencia ? "bg-amber-50/60" : ""}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-800">{l.descripcion}</p>
                          {diferencia && (
                            <div className="mt-1">
                              <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">
                                {l.tipoDiferencia === "NO_PROFORMADO" ? "NO PROFORMADO" : "MAYOR A LO PROFORMADO"}
                              </span>
                              {justificando ? (
                                <input
                                  value={justif[l.clave] ?? l.justificacion ?? ""}
                                  onChange={(e) => setJustif({ ...justif, [l.clave]: e.target.value })}
                                  placeholder="Justificación (mínimo 10 caracteres)"
                                  className={`${inputClass} mt-1 py-1! text-xs!`}
                                  maxLength={1000}
                                />
                              ) : (
                                l.justificacion && <p className="mt-0.5 text-xs italic text-slate-500">{l.justificacion}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{l.proveedor}</td>
                        <td className="px-4 py-2.5">{l.documento || <span className="text-red-600">Pendiente</span>}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{l.importeProformado != null ? dinero(l.importeProformado, op.moneda) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{dinero(l.importeOrigen, l.monedaOrigen)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{dinero(l.importeReal, op.moneda)}</td>
                        {dosMonedas && <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{dinero(l.importeCobro, l.monedaCobro)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Servicios propios (tomados de la proforma)" sinPadding>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {servicios.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-400">Sin servicios proformados</td>
                  </tr>
                )}
                {servicios.map((l) => (
                  <tr key={l.clave}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {l.descripcion}
                      {l.factura && <span className="ml-2 text-xs font-normal text-slate-500">Factura {l.factura}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-500">{l.afectoIgv ? `IGV ${dinero(l.igv, op.moneda)}` : "Sin IGV"}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{dinero(l.importeReal, op.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>

          <Tarjeta titulo="Comparación proforma vs. gasto real" sinPadding>
            {comparacion.some((c) => c.tipo === "MAYOR" || c.tipo === "NO_PROFORMADO") && (
              <div className="p-4 pb-0">
                <Aviso tono="advertencia" titulo="Hay gastos por encima de lo proformado o no contemplados: deben justificarse antes de revisar." />
              </div>
            )}
            <div className="pt-3">
              <ComparacionTabla filas={comparacion} moneda={op.moneda} />
            </div>
          </Tarjeta>

          {data.gastosInternos.length > 0 && (
            <Tarjeta titulo="Gastos internos (no se cobran al cliente)">
              <ul className="space-y-1 text-sm text-slate-600">
                {data.gastosInternos.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span>
                      {p.concepto} · {p.proveedor} {p.documento ?? ""}
                    </span>
                    <span>{dinero(p.importe, op.moneda)}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>

        <div className="space-y-6">
          <Tarjeta titulo="Total a cobrar" className="xl:sticky xl:top-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Servicios propios</dt>
                <dd>{dinero(t.servicios, op.moneda)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Gastos por cuenta del cliente</dt>
                <dd>{dinero(t.gastos, op.moneda)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">IGV (sobre servicios)</dt>
                <dd>{dinero(t.igv, op.moneda)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900">
                <dt>{dosMonedas ? `Equivale a (en ${op.moneda})` : "Total"}</dt>
                <dd>{dinero(t.total, op.moneda)}</dd>
              </div>
            </dl>

            {dosMonedas && (
              <div className="mt-4 space-y-2 rounded-lg bg-slate-100 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Se cobra en {porMoneda.length} moneda(s)</p>
                {porMoneda.map((m) => (
                  <div key={m.moneda} className="flex justify-between font-semibold text-slate-900">
                    <span>En {m.moneda === "PEN" ? "soles" : "dólares"}</span>
                    <span>{dinero(m.total, m.moneda)}</span>
                  </div>
                ))}
              </div>
            )}

            {puedeElaborar && (
              <div className="mt-4 space-y-2 text-sm">
                <label className="block text-xs font-medium text-slate-600">Cómo se cobra</label>
                <select value={monedaCobro ?? ""} onChange={(e) => setMonedaCobro((e.target.value || null) as Moneda | null)} className={inputClass}>
                  <option value="">Una cobranza por moneda (lo pagado en soles, en soles)</option>
                  <option value="USD">Todo en dólares (convertir con tipo de cambio)</option>
                  <option value="PEN">Todo en soles (convertir con tipo de cambio)</option>
                </select>
                {monedaCobro && (
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    placeholder="Tipo de cambio (soles por dólar)"
                    aria-label="Tipo de cambio"
                    value={tipoCambio ?? ""}
                    onChange={(e) => setTipoCambio(e.target.value ? Number(e.target.value) : null)}
                    className={inputClass}
                  />
                )}
              </div>
            )}

            {aviso && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{aviso}</p>}

            <div className="mt-5 space-y-2">
              {puedeElaborar && (
                <button
                  type="button"
                  onClick={() => {
                    setAviso(null);
                    elaborar.mutate();
                  }}
                  disabled={elaborar.isPending || data.pagosSinRevisar > 0 || cortas}
                  className={`${!liq || estado === "REABIERTA" || vencida ? btnPrimario : btnSecundario} w-full justify-center ${aqui("elaborar") ? "brillo" : ""}`}
                >
                  {aqui("elaborar") && <Aqui className="mr-1" />}
                  <ClipboardCheck size={16} /> {!liq ? "Elaborar liquidación" : estado === "REABIERTA" ? `Elaborar v${liq.version + 1}` : `Volver a elaborar v${liq.version}`}
                </button>
              )}
              {estado === "ELABORADA" && puedeRevisar && !vencida && (
                <button type="button" onClick={enviarRevision} disabled={revisar.isPending || cortas} className={`${btnPrimario} w-full justify-center ${aqui("revisar") ? "brillo" : ""}`}>
                  {aqui("revisar") && <Aqui className="mr-1" />}
                  <CheckCircle2 size={16} /> Diferencias revisadas
                </button>
              )}
              {estado === "REVISADA" && puedeAprobar && (
                <>
                  <button type="button" onClick={() => aprobar.mutate()} disabled={aprobar.isPending || vencida} className={`${btnExito} w-full justify-center ${aqui("aprobar") ? "brillo" : ""}`}>
                    {aqui("aprobar") && <Aqui className="mr-1" />}
                    <Stamp size={16} /> Aprobar liquidación
                  </button>
                  <button type="button" onClick={() => setModal("observar")} className={`${btnSecundario} w-full justify-center`}>
                    <MessageSquareWarning size={16} /> Observar
                  </button>
                </>
              )}
              {estado === "REVISADA" && !puedeAprobar && <p className="text-center text-xs text-slate-400">Pendiente de aprobación.</p>}
              {(estado === "APROBADA" || estado === "ENVIADA") && puedeReabrir && (
                <button type="button" onClick={() => setModal("reabrir")} className={`${btnSecundario} w-full justify-center`}>
                  <RotateCcw size={16} /> Reabrir liquidación
                </button>
              )}
              {(estado === "ELABORADA" || estado === "REVISADA") && puedeTrabajar && (
                <button type="button" onClick={() => setModal("anular")} className="w-full text-center text-sm font-medium text-red-600 hover:underline">
                  <Ban size={14} className="mr-1 inline" /> Anular liquidación
                </button>
              )}
              {cortas && <p className="text-center text-xs text-amber-700">Cada justificación debe tener al menos 10 caracteres.</p>}
              {(estado === "APROBADA" || estado === "ENVIADA") && <p className="text-center text-xs text-slate-400">{estado === "ENVIADA" ? "Enviada" : "Aprobada"}: los importes no se modifican sin reabrir.</p>}
            </div>
          </Tarjeta>

          {(estado === "APROBADA" || estado === "ENVIADA") && liq && (
            <Tarjeta titulo="Nota de cobranza">
              {(() => {
                const vigentes = (notas.data?.items ?? []).filter((n) => n.estado !== "ANULADA");
                const sinNota = liq.porMoneda.filter((m) => !vigentes.some((n) => n.moneda === m.moneda)).map((m) => ({ moneda: m.moneda, total: m.total }));
                return (
                  <div className="space-y-3 text-sm">
                    {vigentes.map((n) => (
                      <Link key={n.id} to={`/comercial/notas/${n.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                        <span>
                          <b>{n.numero}</b> <span className="text-xs text-slate-500">· {dinero(n.total, n.moneda)}</span>
                        </span>
                        <EstadoBadge estado={n.estado} />
                      </Link>
                    ))}
                    {vigentes.length === 0 && <p className="text-xs text-slate-500">La aprobada ya se puede cobrar: genera la nota que recibe el cliente.</p>}
                    {sinNota.length > 0 && puedeNota && (
                      <button type="button" onClick={() => setModal("nota")} className={`${btnPrimario} w-full justify-center ${aqui("nota") ? "brillo" : ""}`}>
                        {aqui("nota") && <Aqui className="mr-1" />}
                        <FilePlus2 size={16} /> Generar nota de cobranza{vigentes.length > 0 ? ` en ${sinNota[0]!.moneda}` : ""}
                      </button>
                    )}
                  </div>
                );
              })()}
            </Tarjeta>
          )}

          {liq && (
            <Tarjeta titulo="Trazabilidad">
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  Elaborada por <b>{liq.elaboradoPor}</b> · {fechaHora(liq.elaboradoEn)}
                </li>
                {liq.revisadoPor && liq.revisadoEn && (
                  <li>
                    Revisada por <b>{liq.revisadoPor}</b> · {fechaHora(liq.revisadoEn)}
                  </li>
                )}
                {liq.aprobadoPor && liq.aprobadoEn && (
                  <li>
                    Aprobada por <b>{liq.aprobadoPor}</b> · {fechaHora(liq.aprobadoEn)}
                  </li>
                )}
                {liq.reaperturas.map((r, i) => (
                  <li key={i} className="rounded-lg bg-orange-50 p-2 text-orange-900">
                    Reabierta por <b>{r.usuario}</b> · {fechaHora(r.fechaHora)}
                    <br />
                    Motivo: {r.motivo}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {data.versiones.length > 1 && (
            <Tarjeta titulo="Versiones">
              <Paginado items={data.versiones}>
                {(pagina) => (
                  <ul className="space-y-2 text-sm">
                    {pagina.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2">
                        <span>
                          v{v.version} <span className="text-xs text-slate-400">· {formatearFecha(v.elaboradoEn)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-slate-600">{dinero(v.total, v.moneda)}</span>
                          <EstadoBadge estado={v.estado} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Paginado>
            </Tarjeta>
          )}
        </div>
      </div>

      {modal === "observar" && (
        <FormularioMotivo
          titulo={`Observar la liquidación v${liq!.version}`}
          textoGuardar="Devolver a elaboración"
          ayuda="Vuelve a elaborada para que se corrija."
          onCerrar={cerrar}
          onGuardar={(m) => observar.mutate(m)}
          guardando={observar.isPending}
          error={aviso}
        />
      )}
      {modal === "reabrir" && (
        <FormularioMotivo
          titulo={`Reabrir la liquidación v${liq!.version}`}
          textoGuardar="Reabrir"
          ayuda={`Queda el usuario, la fecha y el motivo. La operación vuelve a finalizada y la corrección será la v${liq!.version + 1}.`}
          onCerrar={cerrar}
          onGuardar={(m) => reabrir.mutate(m)}
          guardando={reabrir.isPending}
          error={aviso}
        />
      )}
      {modal === "nota" && liq && (
        <GenerarNotaModal
          liquidacionId={liq.id}
          clienteId={data.cliente.id}
          fechaFacturas={data.fechaFacturas}
          opciones={liq.porMoneda.filter((m) => !(notas.data?.items ?? []).some((n) => n.estado !== "ANULADA" && n.moneda === m.moneda)).map((m) => ({ moneda: m.moneda, total: m.total }))}
          onCerrar={cerrar}
        />
      )}
      {modal === "anular" && (
        <FormularioMotivo
          titulo={`Anular la liquidación v${liq!.version}`}
          textoGuardar="Anular liquidación"
          ayuda="Se descarta (por ejemplo, si se elaboró por error). La operación vuelve a finalizada."
          onCerrar={cerrar}
          onGuardar={(m) => anular.mutate(m)}
          guardando={anular.isPending}
          error={aviso}
        />
      )}
    </div>
  );
}
