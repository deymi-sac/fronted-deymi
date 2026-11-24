import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Ban, Paperclip, Receipt, Search, X } from "lucide-react";
import {
  anularFactura, corregirFechaFactura, enlaceArchivoFactura, registrarFactura, subirArchivoFactura, useFactura, useFacturas, useOperacionesPorFacturar, usePendientesDeFacturar,
  type EstadoFactura, type LineaPorFacturar, type PendienteNota, type PendienteOperacion,
} from "./cobranza.api";
import { FormularioMotivo } from "../operaciones/FormulariosOperacion";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { CorregirFechaModal } from "../../components/ui/CorregirFecha";
import { PieTabla } from "../../components/ui/PieTabla";
import { Tabla } from "../../components/ui/Tabla";
import { Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { dinero, etiqueta, redondear } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import { useEmpresa } from "../maestros/useMaestros";
import { Ventana } from "../../components/ui/Ventana";
import { Aqui } from "../../components/ui/Aqui";
import { useAqui } from "../../lib/useAqui";
import { notificar } from "../../lib/toast";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";

type Vista = "pendientes" | EstadoFactura;
const hoyLocal = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);

/**
 * Base e IGV como los calcula el sistema de facturación: sobre el total de las líneas afectas, no línea por línea
 * (igual que el servidor, así lo que se ve aquí es lo que se registra).
 */
function repartirIgv(lineas: LineaPorFacturar[], tasa: number) {
  const afectas = lineas.filter((l) => l.afectoIgv);
  const totalAfecto = redondear(afectas.reduce((s, l) => s + l.importe + l.igv, 0));
  const baseAfecta = redondear(totalAfecto / (1 + tasa));
  const inafecto = redondear(lineas.filter((l) => !l.afectoIgv).reduce((s, l) => s + l.importe, 0));
  const igv = redondear(totalAfecto - baseAfecta);
  const base = redondear(baseAfecta + inafecto);
  return { base, igv, total: redondear(base + igv) };
}

type Destino =
  | ({ tipo: "nota" } & PendienteNota)
  | ({ tipo: "operacion" } & PendienteOperacion);

const SERIE = /^[FB][A-Z0-9]{3}$/;
const MAX_ARCHIVO = 10 * 1024 * 1024;
/** El mensaje del servidor, o el de un error armado aquí (ej. "se registró F001-1, pero F001-2 no"). */
const mensajeDe = (e: unknown) => (e instanceof Error && !isAxiosError(e) ? e.message : mensajeDeError(e));

/**
 * Comprobantes emitidos en el sistema de facturación: se registran con su serie y número (a mano) y qué líneas cubren.
 * Cada línea lleva su serie y número: las que tienen el mismo forman un solo comprobante, y cada comprobante tiene su fecha y su archivo.
 */
function RegistrarFacturaModal({ destino, onCerrar }: { destino: Destino; onCerrar: () => void }) {
  const { data: empresa } = useEmpresa();
  const tasa = empresa?.tasaIgv ?? 0.18;
  const qc = useQueryClient();
  const [marcadas, setMarcadas] = useState<number[]>(destino.lineas.map((l) => l.id));
  const [tipo, setTipo] = useState<"FACTURA" | "BOLETA">("FACTURA");
  const [comprobantes, setComprobantes] = useState<Record<number, { serie: string; numero: string }>>({});
  // Fecha de emisión y archivo de cada comprobante (clave "SERIE-número")
  const [porComprobante, setPorComprobante] = useState<Record<string, { fecha: string; archivo: File | null }>>({});
  const letra = tipo === "FACTURA" ? "F" : "B";
  const elegidas = destino.lineas.filter((l) => marcadas.includes(l.id));

  const datoDe = (id: number) => comprobantes[id] ?? { serie: "", numero: "" };
  const serieOk = (s: string) => SERIE.test(s) && s[0] === letra;
  const cambiar = (id: number, c: Partial<{ serie: string; numero: string }>) => setComprobantes((m) => ({ ...m, [id]: { ...(m[id] ?? { serie: "", numero: "" }), ...c } }));

  /** Las líneas marcadas agrupadas por serie y número: un comprobante por grupo */
  const grupos = new Map<string, { clave: string; serie: string; numero: number; lineas: LineaPorFacturar[] }>();
  for (const l of elegidas) {
    const d = datoDe(l.id);
    const clave = `${d.serie}-${Number(d.numero)}`;
    if (!grupos.has(clave)) grupos.set(clave, { clave, serie: d.serie, numero: Number(d.numero), lineas: [] });
    grupos.get(clave)!.lineas.push(l);
  }
  const lista = [...grupos.values()].map((g) => ({ ...g, ...repartirIgv(g.lineas, tasa) }));
  // Solo los comprobantes con serie y número completos se muestran abajo para su fecha y archivo
  const completos = lista.filter((g) => serieOk(g.serie) && g.numero > 0);
  const base = redondear(lista.reduce((s, g) => s + g.base, 0));
  const igv = redondear(lista.reduce((s, g) => s + g.igv, 0));
  const total = redondear(base + igv);
  const extraDe = (clave: string) => porComprobante[clave] ?? { fecha: hoyLocal(), archivo: null };
  const cambiarExtra = (clave: string, c: Partial<{ fecha: string; archivo: File | null }>) =>
    setPorComprobante((m) => ({ ...m, [clave]: { ...(m[clave] ?? { fecha: hoyLocal(), archivo: null }), ...c } }));

  const registrar = useMutation({
    mutationFn: async () => {
      const hechos: string[] = [];
      const sinArchivo: string[] = [];
      for (const g of lista) {
        const extra = extraDe(g.clave);
        try {
          const f = await registrarFactura({
            ...(destino.tipo === "nota" ? { notaCobranzaId: destino.notaCobranzaId } : { operacionId: destino.operacionId }),
            tipoComprobante: tipo,
            serie: g.serie,
            numero: g.numero,
            fechaEmision: extra.fecha,
            lineasIds: g.lineas.map((l) => l.id),
          });
          hechos.push(f.comprobante);
          // El archivo se sube después: si falla, la factura ya quedó y se sube desde su detalle
          if (extra.archivo) {
            try {
              await subirArchivoFactura(f.id, extra.archivo);
            } catch (e) {
              sinArchivo.push(`${f.comprobante} (${mensajeDe(e)})`);
            }
          }
          const ids = g.lineas.map((l) => l.id);
          setMarcadas((m) => m.filter((id) => !ids.includes(id)));
        } catch (e) {
          // Los anteriores ya quedaron registrados: se avisa cuáles y quedan marcadas solo las líneas que faltan
          if (hechos.length) {
            for (const clave of ["facturas", "pagos", "operaciones", "notas", "liquidaciones"]) void qc.invalidateQueries({ queryKey: [clave] });
            throw new Error(`Se registró ${hechos.join(", ")}, pero ${g.serie}-${g.numero} no: ${mensajeDe(e)}`, { cause: e });
          }
          throw e;
        }
      }
      if (sinArchivo.length) notificar(`No se pudo subir el archivo de ${sinArchivo.join("; ")}. Súbelo desde el detalle de la factura.`, "error");
      return hechos;
    },
    onSuccess: (hechos) => {
      for (const clave of ["facturas", "pagos", "operaciones", "notas", "liquidaciones"]) qc.invalidateQueries({ queryKey: [clave] });
      notificar(hechos.length === 1 ? `${etiqueta(tipo)} ${hechos[0]} registrada` : `${hechos.length} comprobantes registrados: ${hechos.join(", ")}`);
      avisarSiguientePaso(destino.operacionId);
      onCerrar();
    },
  });

  /** Lo que falta para poder registrar (la ventana lo muestra al pie) */
  const falta = (() => {
    if (!elegidas.length) return "Elige al menos una línea";
    for (const l of elegidas) {
      const d = datoDe(l.id);
      if (!serieOk(d.serie)) return `Serie de "${l.descripcion || l.concepto}": ${letra} + 3 caracteres (ej. ${letra}001)`;
      if (!(Number(d.numero) > 0)) return `Número del comprobante de "${l.descripcion || l.concepto}"`;
    }
    for (const g of lista) {
      const f = extraDe(g.clave).fecha;
      if (!f || f > hoyLocal()) return `Fecha de emisión de ${g.serie}-${g.numero}`;
    }
    return null;
  })();

  const titulo = destino.tipo === "nota" ? `Registrar factura de ${destino.notaCobranza}` : `Facturar ${destino.operacion} antes de liquidar`;
  return (
    <Modal
      titulo={titulo}
      textoGuardar={`Registrar ${lista.length > 1 ? `${lista.length} comprobantes · ` : ""}${dinero(total, destino.moneda)}`}
      onCerrar={onCerrar}
      onGuardar={() => registrar.mutate()}
      guardando={registrar.isPending}
      error={registrar.isError ? mensajeDe(registrar.error) : null}
      ancho="max-w-3xl"
      deshabilitado={!!falta}
      aviso={falta ? `Falta: ${falta}` : undefined}
    >
      {/* Quién emite el comprobante: la empresa de Maestros */}
      {empresa && (
        <div className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-marca-100/40 px-4 py-2 text-sm sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-marca-800">Emite</span>
          <span className="font-semibold text-gray-800">{empresa.razonSocial}</span>
          <span className="text-gray-500">RUC {empresa.ruc}</span>
        </div>
      )}
      <p className="text-sm text-gray-600 sm:col-span-2">
        {destino.cliente} · {destino.operacion} · {destino.moneda === "PEN" ? "soles" : "dólares"}. Marca lo que facturas y escribe la serie y el número de su comprobante; si varias líneas van en la misma factura, ponles el mismo número.
      </p>
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 sm:col-span-2">
        {destino.lineas.map((l) => {
          const marcada = marcadas.includes(l.id);
          const d = datoDe(l.id);
          return (
            <li key={l.id} className={`flex flex-wrap items-center gap-3 px-4 py-2 text-sm ${marcada ? "bg-marca-100/30" : ""}`}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={marcada} onChange={(e) => setMarcadas((m) => (e.target.checked ? [...m, l.id] : m.filter((x) => x !== l.id)))} aria-label={`Facturar ${l.concepto}`} />
                <span className="min-w-0 flex-1">
                  {l.descripcion || l.concepto}
                  <span className="block text-xs text-gray-400">{l.origen === "SERVICIO" ? "Servicio propio" : `Gasto de ${l.proveedor || "tercero"} · ${l.documento ?? "sin comprobante"}`}</span>
                </span>
              </label>
              {marcada && (
                <span className="flex items-center gap-1">
                  <input
                    aria-label="Serie"
                    value={d.serie}
                    maxLength={4}
                    onChange={(e) => cambiar(l.id, { serie: e.target.value.toUpperCase() })}
                    className={`${inputClass} w-20! px-2! py-1.5! ${d.serie && !serieOk(d.serie) ? "border-amber-400!" : ""}`}
                  />
                  <span className="text-gray-400">-</span>
                  <input aria-label="Número" type="number" min={1} value={d.numero} onChange={(e) => cambiar(l.id, { numero: e.target.value })} className={`${inputClass} w-28! px-2! py-1.5!`} />
                </span>
              )}
              <span className="w-28 text-right tabular-nums">
                {dinero(l.importe, destino.moneda)}
                {l.igv > 0 && <span className="block text-xs text-gray-400">+ IGV {dinero(l.igv, destino.moneda)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
        <Campo label="Tipo">
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as "FACTURA" | "BOLETA");
              setComprobantes({});
              setPorComprobante({});
            }}
            className={inputClass}
          >
            <option value="FACTURA">Factura</option>
            <option value="BOLETA">Boleta</option>
          </select>
        </Campo>
      </div>
      {completos.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Fecha de emisión y archivo de cada comprobante</p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {completos.map((g) => {
              const extra = extraDe(g.clave);
              return (
                <li key={g.clave} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <b>
                      {g.serie}-{String(g.numero).padStart(6, "0")}
                    </b>
                    <span className="ml-2 text-xs text-gray-500">
                      {g.lineas.length} {g.lineas.length === 1 ? "línea" : "líneas"} · {dinero(g.total, destino.moneda)}
                    </span>
                  </span>
                  <input
                    type="date"
                    aria-label={`Fecha de emisión de ${g.serie}-${g.numero}`}
                    max={hoyLocal()}
                    value={extra.fecha}
                    onChange={(e) => cambiarExtra(g.clave, { fecha: e.target.value })}
                    className={`${inputClass} w-40! px-2! py-1.5!`}
                  />
                  <label className={`${btnSecundario} cursor-pointer px-3! py-1.5! text-xs!`}>
                    <Paperclip size={14} />
                    <span className="max-w-40 truncate">{extra.archivo ? extra.archivo.name : "Subir factura"}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const archivo = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        if (archivo && archivo.size > MAX_ARCHIVO) return notificar("El archivo pesa más de 10 MB", "error");
                        cambiarExtra(g.clave, { archivo });
                      }}
                    />
                  </label>
                  {extra.archivo && (
                    <button type="button" onClick={() => cambiarExtra(g.clave, { archivo: null })} className="text-gray-400 hover:text-red-600" aria-label="Quitar archivo">
                      <X size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-xs text-gray-500">El archivo es opcional (PDF, JPG, PNG o WEBP, máx. 10 MB); también se puede subir después desde el detalle de la factura.</p>
        </div>
      )}
      <dl className="ml-auto w-64 space-y-1 text-sm sm:col-span-2">
        <div className="flex justify-between">
          <dt className="text-gray-500">Base imponible</dt>
          <dd>{dinero(base, destino.moneda)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">IGV</dt>
          <dd>{dinero(igv, destino.moneda)}</dd>
        </div>
        <div className="flex justify-between border-t pt-1 font-semibold">
          <dt>Total</dt>
          <dd>{dinero(total, destino.moneda)}</dd>
        </div>
        {lista.length > 1 && <div className="text-right text-xs text-gray-500">Se registran {lista.length} comprobantes</div>}
      </dl>
    </Modal>
  );
}

function DetalleFacturaModal({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { data: f } = useFactura(id);
  const [anulando, setAnulando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const puedeAnular = tienePermiso("facturas_anular");
  const anular = useMutation({
    mutationFn: (motivo: string) => anularFactura(id, motivo),
    meta: { exito: "Factura anulada" },
    onSuccess: () => {
      for (const clave of ["facturas", "pagos", "operaciones", "notas", "liquidaciones"]) qc.invalidateQueries({ queryKey: [clave] });
      setAnulando(false);
    },
  });
  const corregir = useMutation({
    mutationFn: (fecha: string) => corregirFechaFactura(id, fecha),
    meta: { exito: "Fecha de la factura corregida" },
    onSuccess: () => {
      for (const clave of ["facturas", "operaciones", "notas"]) qc.invalidateQueries({ queryKey: [clave] });
      setCorrigiendo(false);
    },
  });
  const subir = useMutation({
    mutationFn: (archivo: File) => subirArchivoFactura(id, archivo),
    meta: { exito: "Archivo de la factura guardado" },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facturas"] }),
    onError: (e) => notificar(mensajeDeError(e), "error"),
  });
  async function verArchivo() {
    // La pestaña se abre antes de pedir el enlace: si no, el navegador la bloquea
    const ventana = window.open("", "_blank");
    try {
      const url = await enlaceArchivoFactura(id);
      if (ventana) ventana.location.replace(url);
      else window.location.assign(url);
    } catch (e) {
      ventana?.close();
      notificar(mensajeDeError(e), "error");
    }
  }
  const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <Ventana titulo={<span className="flex flex-wrap items-center gap-3">{f ? `${f.tipoComprobante === "BOLETA" ? "Boleta" : "Factura"} ${f.comprobante}` : "Factura"}
              {f && <EstadoBadge estado={f.estado} />}</span>} ancho="max-w-2xl" onCerrar={onCerrar}>
        {!f ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="space-y-5 p-6 text-sm">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-400">Cliente</dt>
                <dd>{f.cliente.razonSocial}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Operación</dt>
                <dd>
                  <Link to={`/comercial/operaciones/${f.operacionId}`} className="underline">
                    {f.operacion}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Nota de cobranza</dt>
                <dd>
                  {f.notaCobranzaId ? (
                    <Link to={`/comercial/notas/${f.notaCobranzaId}`} className="underline">
                      {f.notaCobranza}
                    </Link>
                  ) : (
                    "Aún sin nota (antes de liquidar)"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Fecha de emisión</dt>
                <dd>
                  {formatearFecha(f.fechaEmision)}
                  {f.estado === "EMITIDA" && tienePermiso("facturas_registrar") && (
                    <button type="button" onClick={() => setCorrigiendo(true)} className="ml-2 text-xs font-medium text-slate-600 hover:underline">
                      Editar fecha
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Registrada por</dt>
                <dd>{f.registradoPor}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Archivo de la factura</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  {f.archivo ? (
                    <button type="button" onClick={verArchivo} className="inline-flex items-center gap-1 text-slate-700 hover:underline">
                      <Paperclip size={14} /> {f.archivo.nombre ?? "Ver archivo"}
                    </button>
                  ) : (
                    <span className="text-slate-400">Sin archivo</span>
                  )}
                  {f.estado === "EMITIDA" && tienePermiso("facturas_registrar") && (
                    <label className="cursor-pointer text-xs font-medium text-slate-600 hover:underline">
                      {subir.isPending ? "Subiendo…" : f.archivo ? "Reemplazar" : "Subir archivo"}
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={subir.isPending}
                        onChange={(e) => {
                          const archivo = e.target.files?.[0];
                          e.target.value = "";
                          if (archivo) subir.mutate(archivo);
                        }}
                      />
                    </label>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Total</dt>
                <dd className="font-semibold">{dinero(f.total, f.moneda)}</dd>
              </div>
            </dl>
            <table className="w-full">
              <tbody>
                {f.lineas.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5">
                      {l.descripcion || l.concepto}
                      <span className="block text-xs text-slate-400">{l.origen === "SERVICIO" ? "Servicio propio" : (l.documento ?? "Gasto")}</span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{dinero(l.importe, f.moneda)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-2 text-slate-500">Base {dinero(f.baseImponible, f.moneda)} · IGV {dinero(f.igv, f.moneda)}</td>
                  <td className="pt-2 text-right font-semibold">{dinero(f.total, f.moneda)}</td>
                </tr>
              </tbody>
            </table>
            {f.historial.length > 0 && (
              <ol className="space-y-1.5 border-t border-slate-100 pt-4">
                {f.historial.map((h, i) => (
                  <li key={i}>
                    <p className="text-xs text-slate-400">
                      {fechaHora(h.fechaHora)} · {h.usuario}
                    </p>
                    <p>{h.descripcion}</p>
                    {h.motivo && <p className="text-xs italic text-slate-500">Motivo: {h.motivo}</p>}
                  </li>
                ))}
              </ol>
            )}
            {f.estado === "EMITIDA" && puedeAnular && (
              <div className="border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setAnulando(true)} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline">
                  <Ban size={14} /> Anular factura
                </button>
                {f.estadoOperacion === "CERRADA" && <p className="mt-1 text-xs text-slate-400">La operación está cerrada: no se anulan sus facturas.</p>}
              </div>
            )}
          </div>
        )}
      </Ventana>
      {corrigiendo && f && (
        <CorregirFechaModal
          titulo={`Editar fecha de ${f.comprobante}`}
          label="Fecha de emisión"
          valor={f.fechaEmision}
          ayuda="No puede ser futura ni anterior a la apertura de la operación. El cambio queda en el historial."
          guardando={corregir.isPending}
          error={corregir.isError ? mensajeDeError(corregir.error) : null}
          onGuardar={(d) => corregir.mutate(d)}
          onCerrar={() => setCorrigiendo(false)}
        />
      )}
      {anulando && f && (
        <FormularioMotivo
          titulo={`Anular ${f.comprobante}`}
          textoGuardar="Anular factura"
          ayuda="La factura se anuló o se dio de baja en el sistema de facturación: sus líneas vuelven a quedar por facturar."
          onCerrar={() => setAnulando(false)}
          onGuardar={(m) => anular.mutate(m)}
          guardando={anular.isPending}
          error={anular.isError ? mensajeDeError(anular.error) : null}
        />
      )}
    </>
  );
}

/** Lo que falta facturar: operaciones terminadas (antes de liquidar) y notas de cobranza con líneas sin factura. */
function Pendientes({ onRegistrar }: { onRegistrar: (d: Destino) => void }) {
  const notas = usePendientesDeFacturar();
  const operaciones = useOperacionesPorFacturar();
  const puede = tienePermiso("facturas_registrar");
  // Desde el "siguiente paso": la operación o la nota que toca facturar
  const [parametros] = useSearchParams();
  const operacionPedida = Number(parametros.get("operacion")) || null;
  const notaPedida = Number(parametros.get("nota")) || null;
  // Al pulsar el botón resaltado, deja de resaltarse
  useAqui(["operacion", "nota"]);
  const boton = (destino: Destino) => {
    const toca = destino.tipo === "operacion" ? destino.operacionId === operacionPedida : destino.notaCobranzaId === notaPedida;
    return (
      puede && (
        <span className="inline-flex items-center gap-2">
          {toca && <Aqui />}
          <button type="button" onClick={() => onRegistrar(destino)} className={`${btnPrimario} px-3 py-1.5 text-xs ${toca ? "brillo" : ""}`}>
            <Receipt size={14} /> Registrar factura
          </button>
        </span>
      )
    );
  };

  return (
    <div className="space-y-4">
      <Tarjeta titulo="Operaciones por facturar (antes de liquidar)" sinPadding>
        <Tabla
          cargando={operaciones.isLoading}
          filas={operaciones.data}
          claveFila={(x) => x.operacionId}
          vacio="No hay operaciones terminadas con servicios por facturar"
          columnas={[
            {
              titulo: "Operación",
              celda: (x) => (
                <Link to={`/comercial/operaciones/${x.operacionId}`} className="font-semibold text-slate-800 hover:underline">
                  {x.operacion}
                </Link>
              ),
            },
            { titulo: "Cliente", celda: (x) => x.cliente },
            { titulo: "Proforma", celda: (x) => x.proforma },
            { titulo: "Fin del trámite", celda: (x) => (x.fechaFin ? formatearFecha(x.fechaFin) : "—") },
            { titulo: "Servicios", alinear: "centro", celda: (x) => x.lineas.length },
            { titulo: "Por facturar", alinear: "derecha", celda: (x) => <b>{dinero(x.porFacturar.total, x.moneda)}</b> },
            { titulo: "", alinear: "derecha", celda: (x) => boton({ tipo: "operacion", ...x }) },
          ]}
        />
      </Tarjeta>
      <Tarjeta titulo="Notas de cobranza con líneas por facturar" sinPadding>
        <Tabla
          cargando={notas.isLoading}
          filas={notas.data}
          claveFila={(x) => x.notaCobranzaId}
          vacio="No hay notas de cobranza con líneas por facturar"
          columnas={[
            {
              titulo: "Nota de cobranza",
              celda: (x) => (
                <Link to={`/comercial/notas/${x.notaCobranzaId}`} className="font-semibold text-slate-800 hover:underline">
                  {x.notaCobranza}
                </Link>
              ),
            },
            { titulo: "Operación", celda: (x) => x.operacion },
            { titulo: "Cliente", celda: (x) => x.cliente },
            { titulo: "Emisión", celda: (x) => formatearFecha(x.fechaEmision) },
            { titulo: "Líneas", alinear: "centro", celda: (x) => x.lineas.length },
            { titulo: "Por facturar", alinear: "derecha", celda: (x) => <b>{dinero(x.porFacturar.total, x.moneda)}</b> },
            { titulo: "Nota", celda: (x) => <EstadoBadge estado={x.estadoNota} /> },
            { titulo: "", alinear: "derecha", celda: (x) => boton({ tipo: "nota", ...x }) },
          ]}
        />
      </Tarjeta>
    </div>
  );
}

export default function FacturasPage() {
  const [vista, setVista] = useState<Vista>("pendientes");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const [destino, setDestino] = useState<Destino | null>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const { data, isLoading } = useFacturas({ pagina, ...(vista !== "pendientes" && { estado: vista }), ...(texto.trim() && { buscar: texto.trim() }) });
  const pendientes = (usePendientesDeFacturar().data?.length ?? 0) + (useOperacionesPorFacturar().data?.length ?? 0);

  const tabs: { clave: Vista; label: string; contador?: number }[] = [
    { clave: "pendientes", label: "Pendientes de facturar", ...(pendientes > 0 && { contador: pendientes }) },
    { clave: "EMITIDA", label: "Emitidas" },
    { clave: "ANULADA", label: "Anuladas" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Facturación</h1>
        <p className="mt-1 text-sm text-slate-500">Se factura antes de liquidar: la liquidación y la nota de cobranza llevan el número de la factura</p>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.clave}
            type="button"
            onClick={() => {
              setVista(t.clave);
              setPagina(1);
            }}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${vista === t.clave ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
            {t.contador !== undefined && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.contador}</span>}
          </button>
        ))}
      </div>

      {vista === "pendientes" ? (
        <Pendientes onRegistrar={setDestino} />
      ) : (
        <Tarjeta sinPadding>
          <div className="border-b border-slate-100 p-4">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setPagina(1);
                }}
                placeholder="Comprobante, operación, nota o cliente"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <Tabla
            cargando={isLoading}
            filas={data?.items}
            claveFila={(f) => f.id}
            onFila={(f) => setDetalle(f.id)}
            vacio="No hay comprobantes"
            columnas={[
              { titulo: "Comprobante", celda: (f) => <span className="font-semibold">{etiqueta(f.tipoComprobante)} {f.comprobante}</span> },
              { titulo: "Fecha", celda: (f) => formatearFecha(f.fechaEmision) },
              { titulo: "Operación", celda: (f) => f.operacion },
              { titulo: "Cliente", celda: (f) => f.cliente },
              { titulo: "Nota", celda: (f) => f.notaCobranza ?? "—" },
              { titulo: "Base imponible", alinear: "derecha", celda: (f) => dinero(f.baseImponible, f.moneda) },
              { titulo: "IGV", alinear: "derecha", celda: (f) => dinero(f.igv, f.moneda) },
              { titulo: "Total", alinear: "derecha", celda: (f) => <b>{dinero(f.total, f.moneda)}</b> },
              { titulo: "Estado", celda: (f) => <EstadoBadge estado={f.estado} /> },
            ]}
          />
          {data && (
            <PieTabla pagina={data.pagina} paginas={data.paginas} onPagina={setPagina}>
              {data.total} comprobantes{data.totales.length > 0 && <> · {data.totales.map((t) => dinero(t.total, t.moneda)).join(" + ")}</>}
            </PieTabla>
          )}
        </Tarjeta>
      )}

      {destino && <RegistrarFacturaModal destino={destino} onCerrar={() => setDestino(null)} />}
      {detalle !== null && <DetalleFacturaModal id={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}
