import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Banknote, CalendarDays, FileText, Files, Mail, Printer, Receipt, Send } from "lucide-react";
import { anularNota, corregirFechasNota, enviarNota, guardarHojasFoliadas, useNota } from "./cobranza.api";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { useEnviar } from "../../lib/useEnviar";
import { FormularioMotivo } from "../operaciones/FormulariosOperacion";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { DocumentoNotaCobranza } from "../../components/documentos/DocumentoNotaCobranza";
import { DocumentoProformaLiquidada } from "../../components/documentos/DocumentoProformaLiquidada";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { dinero, etiqueta, hoyISO } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import { Paginado } from "../../components/ui/Paginado";
import { Aqui } from "../../components/ui/Aqui";
import { useAqui } from "../../lib/useAqui";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";

const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

/** Nota de cobranza: el documento que recibe el cliente, con lo cobrado y su historial al pie (no se imprimen). */
export default function NotaCobranzaPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const puedeEnviar = tienePermiso("notas_enviar");
  const puedeGenerar = tienePermiso("notas_generar");
  const verFacturas = tienePermiso("facturas_ver");
  const verCobros = tienePermiso("cobros_ver");
  const { data: n, error } = useNota(id);
  const [anulando, setAnulando] = useState(false);
  const [editandoFechas, setEditandoFechas] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Texto del campo mientras se edita; null = cerrado */
  const [hojas, setHojas] = useState<string | null>(null);
  /** Qué documento se ve (y se descarga): la nota o la proforma liquidada */
  const [verProforma, setVerProforma] = useState(false);

  const aqui = useAqui();
  const refrescar = () => {
    for (const clave of ["notas", "cobros", "facturas", "liquidaciones", "operaciones"]) qc.invalidateQueries({ queryKey: [clave] });
  };
  const enviar = useMutation({
    mutationFn: () => enviarNota(id),
    meta: { exito: "Nota marcada como enviada" },
    onSuccess: () => {
      setAviso(null);
      refrescar();
      avisarSiguientePaso(n?.operacion.id);
    },
    onError: (e) => setAviso(mensajeDeError(e)),
  });
  const anular = useMutation({
    mutationFn: (motivo: string) => anularNota(id, motivo),
    meta: { exito: "Nota anulada" },
    onSuccess: () => {
      setAnulando(false);
      setAviso(null);
      refrescar();
    },
  });

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <Link to="/comercial/cobranza" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Cobranza
        </Link>
        <Aviso tono="error" titulo="No se pudo cargar la nota">
          La nota no existe o no tienes acceso.
        </Aviso>
      </div>
    );
  }
  if (!n) return <p className="p-6 text-sm text-slate-500">Cargando...</p>;

  const vigente = n.estado !== "ANULADA";
  const asunto = encodeURIComponent(`Nota de cobranza ${n.numero} · ${n.operacion.numero}`);
  const cuerpo = encodeURIComponent(
    `Estimados ${n.cliente.razonSocial}:\n\nAdjuntamos la nota de cobranza ${n.numero} de la operación ${n.operacion.numero} ` +
      `por ${dinero(n.total, n.moneda)}, con vencimiento el ${formatearFecha(n.fechaVencimiento)}.\n\nSaludos,\n${n.empresa?.razonSocial ?? ""}`
  );

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="print:hidden">
        <EncabezadoPagina
          volverA={`/comercial/liquidaciones/${n.operacion.id}`}
          titulo={
            <span className="flex flex-wrap items-center gap-3">
              {n.numero} <EstadoBadge estado={n.estado} />
              {n.vencida && <EstadoBadge estado="VENCIDA" texto={`Vencida hace ${n.diasVencida} día(s)`} />}
            </span>
          }
          subtitulo={`${n.cliente.razonSocial} · ${n.operacion.numero} · liquidación v${n.liquidacion.version}`}
          acciones={
            <>
            <button type="button" onClick={() => setVerProforma((v) => !v)} className={btnSecundario}>
              {verProforma ? (
                <>
                  <Receipt size={16} /> Ver nota de cobranza
                </>
              ) : (
                <>
                  <FileText size={16} /> Ver proforma liquidada
                </>
              )}
            </button>
            <button type="button" onClick={() => window.print()} className={btnSecundario}>
              <Printer size={16} /> Descargar PDF
            </button>
            {n.cliente.correo && vigente && (
              <a href={`mailto:${n.cliente.correo}?subject=${asunto}&body=${cuerpo}`} className={btnSecundario}>
                <Mail size={16} /> Escribir al cliente
              </a>
            )}
            {puedeEnviar && n.estado === "EMITIDA" && (
              <span className="inline-flex items-center gap-2">
                {aqui("enviar") && <Aqui />}
                <button type="button" onClick={() => enviar.mutate()} disabled={enviar.isPending} className={`${btnPrimario} ${aqui("enviar") ? "brillo" : ""}`}>
                  <Send size={16} /> Marcar como enviada
                </button>
              </span>
            )}
            {verFacturas && vigente && (
              <Link to="/comercial/facturas" className={btnSecundario}>
                <Receipt size={16} /> Facturación
              </Link>
            )}
            {verCobros && vigente && n.saldo > 0 && (
              <Link to="/comercial/cobranza" className={btnSecundario}>
                <Banknote size={16} /> Cobranza
              </Link>
            )}
            {puedeGenerar && vigente && (
              <button type="button" onClick={() => setEditandoFechas(true)} className={btnSecundario}>
                <CalendarDays size={16} /> Editar fechas
              </button>
            )}
            {puedeGenerar && vigente && (
              <button type="button" onClick={() => setHojas(n.hojasFoliadas ? String(n.hojasFoliadas) : "")} className={btnSecundario}>
                <Files size={16} /> Hojas foliadas
              </button>
            )}
            {puedeGenerar && (n.estado === "EMITIDA" || n.estado === "ENVIADA") && (
              <button type="button" onClick={() => setAnulando(true)} className={btnSecundario}>
                <Ban size={16} /> Anular
              </button>
            )}
            </>
          }
        />
        <div className="mb-6 space-y-3">
          {aviso && <Aviso tono="error" titulo={aviso} />}
          {n.estado === "ANULADA" && (
            <Aviso tono="advertencia" titulo="Nota anulada">
              Ya no se cobra ni se factura.
            </Aviso>
          )}
          {n.enviadoEn && <p className="text-xs text-slate-500">Enviada al cliente el {fechaHora(n.enviadoEn)}.</p>}
          {vigente && (
            <p className="text-sm text-slate-600">
              Cobrado <b>{dinero(n.cobrado, n.moneda)}</b> de {dinero(n.total, n.moneda)} · saldo <b>{dinero(n.saldo, n.moneda)}</b>
            </p>
          )}
        </div>
      </div>

      {verProforma ? <DocumentoProformaLiquidada nota={n} /> : <DocumentoNotaCobranza nota={n} />}

      <div className="mx-auto mt-6 grid max-w-[820px] gap-6 print:hidden md:grid-cols-2">
        <Tarjeta titulo={`Cobros aplicados (${n.cobros.length})`}>
          {n.cobros.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se cobra.</p>
          ) : (
            <Paginado items={n.cobros}>
              {(pagina) => (
                <ul className="space-y-2 text-sm">
                  {pagina.map((c, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        <b>{c.cobro}</b>{" "}
                        <span className="text-xs text-slate-500">
                          · {formatearFecha(c.fecha)} · {etiqueta(c.medioPago)}
                        </span>
                      </span>
                      <span>{dinero(c.importe, n.moneda)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Paginado>
          )}
        </Tarjeta>
        <Tarjeta titulo="Historial">
          {n.historial.length === 0 ? (
            <p className="text-sm text-slate-400">Sin movimientos.</p>
          ) : (
            <Paginado items={n.historial}>
              {(pagina) => (
                <ol className="space-y-2 text-sm">
                  {pagina.map((h, i) => (
                    <li key={i}>
                      <p className="text-xs text-slate-500">
                        {fechaHora(h.fechaHora)} · {h.usuario}
                      </p>
                      <p className="text-slate-800">{h.descripcion}</p>
                      {h.motivo && <p className="text-xs italic text-slate-500">Motivo: {h.motivo}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </Paginado>
          )}
        </Tarjeta>
      </div>

      {editandoFechas && (
        <EditarFechasNota
          id={n.id}
          numero={n.numero}
          emision={n.fechaEmision}
          vencimiento={n.fechaVencimiento}
          onCerrar={() => setEditandoFechas(false)}
        />
      )}
      {hojas !== null && <HojasFoliadas id={n.id} numero={n.numero} valorInicial={hojas} onCerrar={() => setHojas(null)} />}
      {anulando && (
        <FormularioMotivo
          titulo={`Anular ${n.numero}`}
          textoGuardar="Anular nota"
          ayuda="Solo se anula sin cobros ni facturas vigentes. Después se puede reabrir la liquidación para corregirla."
          onCerrar={() => setAnulando(false)}
          onGuardar={(m) => anular.mutate(m)}
          guardando={anular.isPending}
          error={anular.isError ? mensajeDeError(anular.error) : null}
        />
      )}
    </div>
  );
}

/** Corrige la emisión y el vencimiento de una nota vigente; el cambio queda en el historial de la operación. */
function EditarFechasNota({ id, numero, emision, vencimiento, onCerrar }: { id: number; numero: string; emision: string; vencimiento: string; onCerrar: () => void }) {
  const [fe, setFe] = useState(emision);
  const [fv, setFv] = useState(vencimiento);
  const qc = useQueryClient();
  const { enviar, guardando, error } = useEnviar(
    "notas",
    () => corregirFechasNota(id, { fechaEmision: fe, fechaVencimiento: fv }),
    () => {
      qc.invalidateQueries();
      onCerrar();
    }
  );
  return (
    <Modal titulo={`Editar fechas de ${numero}`} textoGuardar="Guardar fechas" onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error} ancho="max-w-lg">
      <Campo label="Fecha de emisión" ayuda="No puede ser futura ni anterior a la apertura de la operación">
        <input type="date" max={hoyISO()} value={fe} onChange={(e) => e.target.value && setFe(e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="Vencimiento">
        <input type="date" min={fe} value={fv} onChange={(e) => e.target.value && setFv(e.target.value)} className={inputClass} />
      </Campo>
      <p className="text-xs text-slate-500 sm:col-span-2">El cambio queda en el historial de la operación.</p>
    </Modal>
  );
}

/** Total de hojas foliadas del expediente: sale en la nota de cobranza. Vacío lo quita; queda en el historial. */
function HojasFoliadas({ id, numero, valorInicial, onCerrar }: { id: number; numero: string; valorInicial: string; onCerrar: () => void }) {
  const [texto, setTexto] = useState(valorInicial);
  const [invalido, setInvalido] = useState(false);
  const qc = useQueryClient();
  const { enviar, guardando, error } = useEnviar(
    "notas",
    () => {
      const valor = texto.trim() === "" ? null : Number(texto);
      if (valor !== null && (!Number.isInteger(valor) || valor < 1 || valor > 9999)) {
        setInvalido(true);
        return Promise.reject(new Error("Indica un número entero de hojas (1 a 9999)"));
      }
      setInvalido(false);
      return guardarHojasFoliadas(id, valor);
    },
    () => {
      qc.invalidateQueries();
      onCerrar();
    }
  );
  return (
    <Modal titulo={`Hojas foliadas de ${numero}`} textoGuardar="Guardar" onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={invalido ? "Indica un número entero de hojas (1 a 9999)" : error} ancho="max-w-md">
      <Campo label="Total de hojas foliadas" className="sm:col-span-2" ayuda="Sale en la nota de cobranza. Déjalo vacío para quitarlo. Queda en el historial.">
        <input type="number" min={1} max={9999} step={1} value={texto} onChange={(e) => setTexto(e.target.value)} className={inputClass} autoFocus />
      </Campo>
    </Modal>
  );
}
