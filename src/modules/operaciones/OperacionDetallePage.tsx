import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Calculator, Check, Circle, Flag, Lock, Pencil, Plus, Undo2 } from "lucide-react";
import { Modal } from "../../components/ui/FormularioModal";
import { ComparacionTabla } from "../../components/ui/ComparacionTabla";
import { useLiquidacionDeOperacion } from "../liquidaciones/liquidaciones.api";
import { anularOperacion, cerrarOperacion, EDITABLES, reabrirOperacion, useOperacion, type Operacion } from "./operaciones.api";
import { FormularioContenedores, FormularioDatos, FormularioFinalizar, FormularioMotivo } from "./FormulariosOperacion";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { Tabla } from "../../components/ui/Tabla";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { DetallePagoModal } from "../pagos/DetallePagoModal";
import { GastosProforma } from "../pagos/GastosProforma";
import { RegistrarPagoModal } from "../pagos/RegistrarPagoModal";
import { usePagos } from "../pagos/pagos.api";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, btnSecundario } from "../../lib/estilos";
import { dinero, etiqueta } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import { Paginado } from "../../components/ui/Paginado";
import { Aqui } from "../../components/ui/Aqui";
import { useAqui } from "../../lib/useAqui";
import { RecuadroSiguientePaso } from "./RecuadroSiguientePaso";

type Tab = "resumen" | "pagos" | "comparacion" | "cierre" | "historial";
type ModalAbierto = "datos" | "contenedores" | "finalizar" | "reabrir" | "anular" | "pago" | "cerrar" | null;

const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{valor || "—"}</dd>
    </div>
  );
}

export default function OperacionDetallePage() {
  const id = Number(useParams().id);
  const { data: op, error } = useOperacion(id);
  const [tab, setTab] = useState<Tab>("resumen");
  const aqui = useAqui();
  const [modal, setModal] = useState<ModalAbierto>(null);
  const cerrarModal = () => setModal(null);
  const [pagoAbierto, setPagoAbierto] = useState<number | null>(null);
  const pagos = usePagos({ pagina: 1, operacionId: id });
  const qc = useQueryClient();
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const cerrar = useMutation({
    mutationFn: () => cerrarOperacion(id),
    meta: { exito: "Operación cerrada" },
    onSuccess: () => {
      setErrorCierre(null);
      setModal(null);
      for (const clave of ["operaciones", "pagos", "liquidaciones", "facturas"]) qc.invalidateQueries({ queryKey: [clave] });
    },
    onError: (e) => setErrorCierre(mensajeDeError(e)),
  });
  const puedeCerrar = tienePermiso("operaciones_cerrar");
  const puedeVerComparacion = tienePermiso("liquidaciones_ver");
  const comparacion = useLiquidacionDeOperacion(id, tab === "comparacion" && puedeVerComparacion);

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <Link to="/comercial/operaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Operaciones
        </Link>
        <Aviso tono="error" titulo="No se pudo cargar la operación">
          La operación no existe o no tienes acceso.
        </Aviso>
      </div>
    );
  }
  if (!op) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;

  const editable = EDITABLES.includes(op.estado) && tienePermiso("operaciones_editar");
  const ck = op.checklist;
  const items = [
    { ok: ck.pagosRegistrados, texto: ck.pagosRequeridos ? "Pagos registrados" : "Sin gastos de terceros en la proforma" },
    { ok: ck.pagosSinSustento === 0, texto: ck.pagosSinSustento ? `Todos los pagos con comprobante (faltan ${ck.pagosSinSustento})` : "Todos los pagos con comprobante" },
    { ok: ck.tieneLiquidacion, texto: "Liquidación aprobada" },
    { ok: ck.tieneLiquidacion && ck.diferenciasRevisadas, texto: "Diferencias de la liquidación revisadas" },
    { ok: ck.tieneNotaCobranza, texto: "Nota de cobranza generada" },
    { ok: ck.tieneFactura, texto: "Facturado" },
    { ok: ck.tieneLiquidacion && ck.lineasPorFacturar === 0, texto: ck.lineasPorFacturar ? `Todo lo facturable facturado (faltan ${ck.lineasPorFacturar} líneas)` : "Todo lo facturable facturado" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina
        volverA="/comercial/operaciones"
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {op.numero} <EstadoBadge estado={op.estado} />
          </span>
        }
        subtitulo={`${op.cliente.razonSocial} · ${etiqueta(op.tipoOperacion)} ${etiqueta(op.via).toLowerCase()} · abierta el ${formatearFecha(op.fechaApertura)}`}
        acciones={
          <>
          {(op.estado === "ABIERTA" || op.estado === "FINALIZADA") && tienePermiso("pagos_registrar") && (
            <button type="button" onClick={() => setModal("pago")} className={btnSecundario}>
              <Plus size={16} /> Registrar pago
            </button>
          )}
          {["FINALIZADA", "EN_LIQUIDACION", "LIQUIDADA", "FACTURADA", "CERRADA"].includes(op.estado) && (
            <Link to={`/comercial/liquidaciones/${op.id}`} className={btnPrimario}>
              <Calculator size={16} /> Ir a liquidación
            </Link>
          )}
          {op.estado === "FACTURADA" && puedeCerrar && (
            <span className="inline-flex items-center gap-2">
              {aqui("cerrar") && <Aqui />}
              <button type="button" onClick={() => setTab("cierre")} className={`${btnPrimario} ${aqui("cerrar") ? "brillo" : ""}`}>
                <Lock size={16} /> Cerrar operación
              </button>
            </span>
          )}
          {op.estado === "FINALIZADA" && tienePermiso("operaciones_editar") && (
            <button type="button" onClick={() => setModal("reabrir")} className={btnSecundario}>
              <Undo2 size={16} /> Reabrir
            </button>
          )}
          {(op.estado === "ABIERTA" || op.estado === "FINALIZADA") && tienePermiso("operaciones_anular") && (
            <button type="button" onClick={() => setModal("anular")} className={btnSecundario}>
              <Ban size={16} /> Anular
            </button>
          )}
          {op.estado === "ABIERTA" && tienePermiso("operaciones_editar") && (
            <span className="inline-flex items-center gap-2">
              {aqui("finalizar") && <Aqui />}
              <button type="button" onClick={() => setModal("finalizar")} className={`${btnPrimario} ${aqui("finalizar") ? "brillo" : ""}`}>
                <Flag size={16} /> Finalizar operación
              </button>
            </span>
          )}
          </>
        }
      />

      <RecuadroSiguientePaso siguiente={op.siguientePaso} />

      {op.estado === "ANULADA" && (
        <div className="mb-5">
          <Aviso tono="advertencia" titulo="Operación anulada">
            {op.historial.find((h) => h.accion === "ANULAR")?.motivo ?? "Ya no se modifica."}
          </Aviso>
        </div>
      )}

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {(
          [
            { clave: "resumen", label: "Resumen" },
            { clave: "pagos", label: "Pagos", contador: op.pagos.cantidad },
            ...(puedeVerComparacion && op.proforma ? ([{ clave: "comparacion", label: "Proformado vs. real" }] as const) : []),
            { clave: "cierre", label: "Checklist de cierre" },
            { clave: "historial", label: "Historial", contador: op.historial.length },
          ] as const
        ).map((t) => (
          <button
            key={t.clave}
            type="button"
            onClick={() => setTab(t.clave)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === t.clave ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
            {"contador" in t && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.contador}</span>}
          </button>
        ))}
      </div>

      {tab === "resumen" && <Resumen op={op} editable={editable} onEditar={setModal} />}

      {tab === "comparacion" && (
        <Tarjeta sinPadding titulo={`Comparación en ${op.moneda} (los pagos en otra moneda se convierten con su tipo de cambio)`}>
          {comparacion.isLoading ? (
            <p className="p-5 text-sm text-slate-400">Calculando…</p>
          ) : comparacion.error || !comparacion.data ? (
            <div className="p-4">
              <Aviso tono="error" titulo="No se pudo calcular la comparación" />
            </div>
          ) : (
            <ComparacionTabla filas={comparacion.data.comparacion} moneda={op.moneda} />
          )}
        </Tarjeta>
      )}

      {tab === "cierre" && (
        <Tarjeta titulo="Checklist de cierre">
          {errorCierre && (
            <div className="mb-3">
              <Aviso tono="error" titulo={errorCierre} />
            </div>
          )}
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.texto} className="flex items-center gap-3 text-sm">
                {i.ok ? <Check size={18} className="text-green-600" /> : <Circle size={18} className="text-slate-300" />}
                <span className={i.ok ? "text-slate-800" : "text-slate-500"}>{i.texto}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            {op.estado === "CERRADA" ? (
              <Aviso tono="exito" titulo="Operación cerrada">
                Ya no cambian sus pagos, liquidación ni facturas.
              </Aviso>
            ) : op.estado === "ANULADA" ? (
              <Aviso tono="advertencia" titulo="Operación anulada" />
            ) : !op.checklist.completo ? (
              <Aviso tono="advertencia" titulo="La operación no puede cerrarse">
                Falta: {op.checklist.pendientes.join("; ")}.
              </Aviso>
            ) : op.estado !== "FACTURADA" ? (
              <Aviso tono="info" titulo="Checklist completo">
                Se cierra cuando la operación está facturada.
              </Aviso>
            ) : (
              puedeCerrar && (
                <button type="button" onClick={() => setModal("cerrar")} className={btnPrimario}>
                  <Lock size={16} /> Cerrar operación
                </button>
              )
            )}
          </div>
        </Tarjeta>
      )}

      {tab === "pagos" && (
        <div className="space-y-6">
          {op.proforma && (
            <Tarjeta titulo="Ítems de la proforma">
              <GastosProforma operacionId={op.id} />
            </Tarjeta>
          )}
          <Tarjeta sinPadding>
            <Tabla
              cargando={!pagos.data}
              filas={pagos.data?.items}
              claveFila={(p) => p.id}
              onFila={(p) => setPagoAbierto(p.id)}
              vacio="Aún no se registran pagos para esta operación"
              columnas={[
                { titulo: "Fecha", celda: (p) => formatearFecha(p.fechaPago) },
                { titulo: "Proveedor", celda: (p) => p.proveedor },
                {
                  titulo: "Concepto",
                  celda: (p) => (
                    <span>
                      {p.concepto}
                      {p.noProformado && <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">NO PROFORMADO</span>}
                    </span>
                  ),
                },
                {
                  titulo: "Comprobante",
                  celda: (p) =>
                    p.sinSustento && p.estado !== "ANULADO" ? <span className="text-red-600">{p.serieNumero ?? "Pendiente"} · sin comprobante</span> : (p.serieNumero ?? "—"),
                },
                { titulo: "Importe", alinear: "derecha", celda: (p) => dinero(p.total, p.moneda) },
                { titulo: "Estado", celda: (p) => <EstadoBadge estado={p.estado} /> },
              ]}
            />
            {pagos.data && pagos.data.total > pagos.data.items.length && (
              <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                Se muestran {pagos.data.items.length} de {pagos.data.total} pagos: el resto está en{" "}
                <Link to="/comercial/pagos" className="underline">
                  Pagos
                </Link>
                .
              </p>
            )}
          </Tarjeta>
        </div>
      )}

      {tab === "historial" && (
        <Tarjeta titulo="Trazabilidad de la operación">
          {op.historial.length === 0 ? (
            <p className="text-sm text-slate-400">Sin movimientos registrados.</p>
          ) : (
            <Paginado items={op.historial}>
              {(pagina) => (
                <ol className="relative space-y-5 border-l border-slate-200 pl-6">
                  {pagina.map((h, i) => (
                    <li key={i}>
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-700" />
                      <p className="text-xs text-slate-500">
                        {fechaHora(h.fechaHora)} · {h.usuario}
                      </p>
                      <p className="text-sm text-slate-800">{h.descripcion}</p>
                      {h.motivo && <p className="text-xs italic text-slate-500">Motivo: {h.motivo}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </Paginado>
          )}
        </Tarjeta>
      )}

      {modal === "datos" && <FormularioDatos op={op} onCerrar={cerrarModal} />}
      <RegistrarPagoModal abierto={modal === "pago"} onCerrar={cerrarModal} operacion={{ id: op.id, numero: op.numero, estado: op.estado, cliente: op.cliente.razonSocial, moneda: op.moneda }} />
      {pagoAbierto !== null && <DetallePagoModal id={pagoAbierto} onCerrar={() => setPagoAbierto(null)} />}
      {modal === "contenedores" && <FormularioContenedores op={op} onCerrar={cerrarModal} />}
      {modal === "finalizar" && <FormularioFinalizar op={op} onCerrar={cerrarModal} />}
      {modal === "cerrar" && (
        <Modal titulo={`Cerrar ${op.numero}`} onCerrar={cerrarModal} onGuardar={() => cerrar.mutate()} guardando={cerrar.isPending} error={errorCierre} textoGuardar="Cerrar operación" ancho="max-w-md">
          <p className="text-sm text-slate-700 sm:col-span-2">
            El checklist está completo. Una operación cerrada <b>ya no se puede reabrir</b>: no recibe pagos ni se modifican su liquidación ni sus facturas.
          </p>
        </Modal>
      )}
      {modal === "reabrir" && <AccionConMotivo op={op} tipo="reabrir" onCerrar={cerrarModal} />}
      {modal === "anular" && <AccionConMotivo op={op} tipo="anular" onCerrar={cerrarModal} />}
    </div>
  );
}

function AccionConMotivo({ op, tipo, onCerrar }: { op: Operacion; tipo: "reabrir" | "anular"; onCerrar: () => void }) {
  const qc = useQueryClient();
  // El motivo llega como argumento: así siempre se envía lo que está escrito en el formulario
  const accion = useMutation({
    mutationFn: (motivo: string) => (tipo === "reabrir" ? reabrirOperacion(op.id, motivo) : anularOperacion(op.id, motivo)),
    meta: { exito: tipo === "reabrir" ? "Operación reabierta" : "Operación anulada" },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operaciones"] });
      onCerrar();
    },
  });
  return (
    <FormularioMotivo
      titulo={tipo === "reabrir" ? `Reabrir ${op.numero}` : `Anular ${op.numero}`}
      textoGuardar={tipo === "reabrir" ? "Reabrir" : "Anular operación"}
      ayuda={tipo === "reabrir" ? "Vuelve a abierta, por ejemplo si faltan gestiones por hacer." : "Queda en el historial. Una operación anulada ya no se modifica."}
      onCerrar={onCerrar}
      onGuardar={(motivo) => accion.mutate(motivo)}
      guardando={accion.isPending}
      error={accion.isError ? mensajeDeError(accion.error) : null}
    />
  );
}

function Resumen({ op, editable, onEditar }: { op: Operacion; editable: boolean; onEditar: (m: "datos" | "contenedores") => void }) {
  const editar = (m: "datos" | "contenedores", texto: string) =>
    editable ? (
      <button type="button" onClick={() => onEditar(m)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:underline">
        <Pencil size={13} /> {texto}
      </button>
    ) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Tarjeta titulo="Datos de la operación" acciones={editar("datos", "Editar fechas / DAM / BL y datos")}>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Dato label="Cliente" valor={op.cliente.razonSocial} />
            <Dato label={op.cliente.tipoDocumento === "RUC" ? "RUC" : "Tax ID"} valor={op.cliente.numeroDocumento} />
            <Dato label="Proforma" valor={op.proforma && <Link to={`/comercial/proformas/${op.proforma.id}`} className="text-slate-800 underline">{op.proforma.numero}</Link>} />
            <Dato label="DAM" valor={op.dam} />
            <Dato label="BL / AWB" valor={op.blAwb} />
            <Dato label="Régimen" valor={op.regimen} />
            <Dato label="Aduana" valor={op.aduana} />
            <Dato label="Puerto" valor={op.puerto} />
            <Dato label="Línea naviera" valor={op.lineaNaviera} />
            <Dato label="Terminal" valor={op.terminal} />
            <Dato label="Almacén" valor={op.almacen} />
            <Dato label="Moneda" valor={op.moneda} />
            <Dato label="Fin del trámite" valor={op.fechaFin && formatearFecha(op.fechaFin)} />
            <Dato label="Creada por" valor={op.creadoPor} />
          </dl>
        </Tarjeta>

        <Tarjeta titulo={`Contenedores (${op.contenedores.length})`} acciones={editar("contenedores", "Editar contenedores")} sinPadding>
          <Tabla
            filas={op.contenedores}
            claveFila={(c) => c.id}
            vacio="Sin contenedores registrados"
            columnas={[
              { titulo: "Número", celda: (c) => <span className="font-mono text-slate-800">{c.numero}</span> },
              { titulo: "Tipo", celda: (c) => c.tipoContenedor ?? "—" },
              { titulo: "Precinto", celda: (c) => c.precinto ?? "—" },
              { titulo: "Peso", alinear: "derecha", celda: (c) => (c.pesoKg != null ? `${c.pesoKg.toLocaleString("es-PE")} kg` : "—") },
            ]}
          />
        </Tarjeta>
      </div>

      <Tarjeta titulo="Proforma y pagos">
        <ul className="space-y-3 text-sm">
          <li className="flex justify-between gap-3">
            <span className="text-slate-500">Proforma</span>
            <span className="font-medium">{op.proforma ? op.proforma.numero : "—"}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-slate-500">Total proformado</span>
            <span className="font-medium">{op.proforma ? dinero(op.proforma.total, op.proforma.moneda) : "—"}</span>
          </li>
        </ul>
        <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Pagos registrados</span>
            <span className="text-right font-medium">
              {op.pagos.cantidad}
              {op.pagos.totales.map((t) => (
                <span key={t.moneda} className="block text-xs font-normal text-slate-500">
                  {dinero(t.total, t.moneda)}
                </span>
              ))}
            </span>
          </div>
          {op.pagos.sinSustento > 0 && (
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-slate-500">Sin comprobante</span>
              <span className="font-medium text-red-600">{op.pagos.sinSustento}</span>
            </div>
          )}
        </div>
      </Tarjeta>

    </div>
  );
}
