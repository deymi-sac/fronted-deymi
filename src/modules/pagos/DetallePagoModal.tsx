import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Save } from "lucide-react";
import { anularPago, completarComprobante, corregirFechaPago, MODIFICABLES, OPERACION_ACEPTA_PAGOS, TIPOS_COMPROBANTE, usePago, type TipoComprobante } from "./pagos.api";
import { RegistrarPagoModal } from "./RegistrarPagoModal";
import { FormularioMotivo } from "../operaciones/FormulariosOperacion";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { AdjuntosPago } from "./AdjuntosPago";
import { Campo } from "../../components/ui/FormularioModal";
import { CorregirFechaModal } from "../../components/ui/CorregirFecha";
import { Aviso } from "../../components/ui/Tarjeta";
import { btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { dinero, etiqueta } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import { Ventana } from "../../components/ui/Ventana";

const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{valor || "—"}</dd>
    </div>
  );
}

/** Detalle de un pago: datos, comprobante pendiente, corrección, anulación e historial. */
export function DetallePagoModal({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const { data: p, error } = usePago(id);
  const qc = useQueryClient();
  const [modal, setModal] = useState<"corregir" | "anular" | "fecha" | null>(null);
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>("FACTURA");
  const [serieNumero, setSerieNumero] = useState("");

  const refrescar = () => {
    for (const clave of ["pagos", "operaciones", "liquidaciones"]) qc.invalidateQueries({ queryKey: [clave] });
  };
  const completar = useMutation({
    mutationFn: () => completarComprobante(id, tipoComprobante, serieNumero.trim()),
    meta: { exito: "Comprobante completado" },
    onSuccess: () => {
      refrescar();
      setSerieNumero("");
    },
  });
  const anular = useMutation({
    mutationFn: (motivo: string) => anularPago(id, motivo),
    meta: { exito: "Pago anulado" },
    onSuccess: () => {
      refrescar();
      setModal(null);
    },
  });

  const corregirFecha = useMutation({
    mutationFn: (fecha: string) => corregirFechaPago(id, fecha),
    meta: { exito: "Fecha del pago corregida" },
    onSuccess: () => {
      refrescar();
      setModal(null);
    },
  });

  if (modal === "corregir" && p) return <RegistrarPagoModal abierto pago={p} onCerrar={() => setModal(null)} />;

  const modificable = !!p && MODIFICABLES.includes(p.estado);
  // Mientras la operación está en liquidación el pago no se corrige: primero se anula la liquidación
  const corregible = modificable && OPERACION_ACEPTA_PAGOS.includes(p.estadoOperacion);
  return (
    <>
      <Ventana titulo={<>{p ? `Pago #${p.id}${p.serieNumero ? ` · ${p.serieNumero}` : ""}` : "Pago"}</>} ancho="max-w-3xl" onCerrar={onCerrar}>
        <div className="p-6">
          {error ? (
            <Aviso tono="error" titulo="No se pudo cargar el pago">
              {mensajeDeError(error)}
            </Aviso>
          ) : !p ? (
            <p className="py-6 text-center text-sm text-slate-400">Cargando…</p>
          ) : (
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-3">
                <Dato label="Operación" valor={<Link to={`/comercial/operaciones/${p.operacionId}`} className="text-slate-800 underline">{p.operacion}</Link>} />
                <Dato label="Cliente" valor={p.cliente} />
                <Dato
                  label="Fecha del pago"
                  valor={
                    <span>
                      {formatearFecha(p.fechaPago)}
                      {p.estado !== "ANULADO" && (tienePermiso("pagos_editar") || tienePermiso("pagos_registrar")) && (
                        <button type="button" onClick={() => setModal("fecha")} className="ml-2 text-xs font-medium text-slate-600 hover:underline">
                          Editar fecha
                        </button>
                      )}
                    </span>
                  }
                />
                <Dato label="Proveedor" valor={`${p.proveedor} · ${p.proveedorRuc}`} />
                <Dato label="Concepto" valor={p.concepto} />
                <Dato label="Clasificación" valor={`${etiqueta(p.clasificacion)}${p.subclasificacion ? ` · ${etiqueta(p.subclasificacion)}` : ""}`} />
                <Dato label="Comprobante" valor={p.serieNumero ? `${p.tipoComprobante ? etiqueta(p.tipoComprobante) : ""} ${p.serieNumero}` : <span className="text-red-600">Pendiente</span>} />
                <Dato label="Importe / IGV" valor={`${dinero(p.importe, p.moneda)} / ${dinero(p.igv, p.moneda)}`} />
                <Dato label="Total" valor={`${dinero(p.total, p.moneda)}${p.tipoCambio ? ` (TC ${p.tipoCambio})` : ""}`} />
                <Dato label="Medio de pago" valor={[etiqueta(p.medioPago), p.banco, p.nroOperacionBancaria].filter(Boolean).join(" · ")} />
                <Dato label="Pagado por" valor={p.pagadoPor} />
                <Dato label="Estado" valor={<EstadoBadge estado={p.estado} />} />
                {p.descripcion && <Dato label="Descripción" valor={p.descripcion} />}
                {p.revisadoPor && p.revisadoEn && <Dato label="Revisado por" valor={`${p.revisadoPor} · ${fechaHora(p.revisadoEn)}`} />}
              </dl>
              {p.posibleDuplicadoDe && (
                <Aviso tono="error" titulo="Guardado pese a la alerta de duplicidad">
                  Coincide con el pago #{p.posibleDuplicadoDe.id} de la operación {p.posibleDuplicadoDe.operacion} ({formatearFecha(p.posibleDuplicadoDe.fechaPago)}).
                </Aviso>
              )}
              {p.noProformado && (
                <Aviso tono="advertencia" titulo="Gasto no proformado">
                  {p.justificacion}
                </Aviso>
              )}
              {p.observaciones && <p className="text-sm text-slate-600">Observaciones: {p.observaciones}</p>}

              {p.estado !== "ANULADO" && (
                <AdjuntosPago
                  pagoId={id}
                  adjuntos={p.adjuntos}
                  puedeAgregar={tienePermiso("pagos_registrar")}
                  puedeQuitar={tienePermiso("pagos_editar") && MODIFICABLES.includes(p.estado)}
                  alCambiar={refrescar}
                />
              )}

              {corregible && !p.serieNumero && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Completar comprobante</p>
                  {completar.isError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(completar.error)}</p>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo label="Tipo de comprobante">
                      <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante)} className={inputClass}>
                        {TIPOS_COMPROBANTE.map((t) => (
                          <option key={t} value={t}>
                            {etiqueta(t)}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo label="N.° de comprobante">
                      <input value={serieNumero} onChange={(e) => setSerieNumero(e.target.value.toUpperCase())} className={inputClass} placeholder="F001-0000" maxLength={30} />
                    </Campo>
                  </div>
                  <button type="button" onClick={() => completar.mutate()} disabled={serieNumero.trim().length < 3 || completar.isPending} className={`${btnPrimario} mt-3`}>
                    <Save size={15} /> {completar.isPending ? "Guardando..." : "Guardar comprobante"}
                  </button>
                </div>
              )}

              {modificable && (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  {corregible ? (
                    <>
                      {tienePermiso("pagos_editar") && (
                        <button type="button" onClick={() => setModal("corregir")} className={btnSecundario}>
                          <Pencil size={15} /> Corregir pago
                        </button>
                      )}
                      {tienePermiso("pagos_anular") && (
                        <button type="button" onClick={() => setModal("anular")} className="text-sm font-medium text-red-600 hover:underline">
                          Anular pago
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      La operación está {etiqueta(p.estadoOperacion).toLowerCase()}:{" "}
                      {p.estadoOperacion === "EN_LIQUIDACION" ? "para corregir el pago, primero anula la liquidación." : "sus pagos ya no se corrigen."}
                    </p>
                  )}
                </div>
              )}

              {p.historial.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historial</p>
                  <ol className="space-y-2 text-sm">
                    {p.historial.map((h, i) => (
                      <li key={i}>
                        <p className="text-xs text-slate-500">
                          {fechaHora(h.fechaHora)} · {h.usuario}
                        </p>
                        <p className="text-slate-800">{h.descripcion}</p>
                        {h.motivo && <p className="text-xs italic text-slate-500">Motivo: {h.motivo}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </Ventana>

      {modal === "fecha" && p && (
        <CorregirFechaModal
          titulo={`Editar fecha del pago #${p.id}`}
          label="Fecha del pago"
          valor={p.fechaPago}
          ayuda="Solo cambia la fecha: el pago no vuelve a revisión ni cambia la liquidación. Queda en el historial."
          guardando={corregirFecha.isPending}
          error={corregirFecha.isError ? mensajeDeError(corregirFecha.error) : null}
          onGuardar={(d) => corregirFecha.mutate(d)}
          onCerrar={() => setModal(null)}
        />
      )}
      {modal === "anular" && (
        <FormularioMotivo
          titulo={`Anular el pago #${id}`}
          textoGuardar="Anular pago"
          ayuda="El pago deja de contar en la liquidación. Queda en el historial."
          onCerrar={() => setModal(null)}
          onGuardar={(m) => anular.mutate(m)}
          guardando={anular.isPending}
          error={anular.isError ? mensajeDeError(anular.error) : null}
        />
      )}
    </>
  );
}
