import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightLeft, Ban, CheckCircle2, Pencil, Printer, Send, Trash2, Undo2, XCircle } from "lucide-react";
import { cambiarEstadoProforma, convertirEnOperacion, eliminarProforma, TRANSICIONES, useProforma, type EstadoProforma } from "./proformas.api";
import { EstadoBadge } from "./EstadoBadge";
import { useClientes } from "../maestros/useMaestros";
import { DocumentoProforma } from "../../components/documentos/DocumentoProforma";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { Aviso } from "../../components/ui/Tarjeta";
import { Aqui } from "../../components/ui/Aqui";
import { useAqui } from "../../lib/useAqui";
import { RecuadroSiguientePaso } from "../operaciones/RecuadroSiguientePaso";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";
import { avisarPasoProforma, pasoDeProforma } from "./pasoProforma";
import { btnExito, btnPeligro, btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { dinero } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";

export default function ProformaDetallePage() {
  const id = Number(useParams().id);
  const { data: p, error } = useProforma(id);
  const { data: clientes } = useClientes();
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [motivoEliminar, setMotivoEliminar] = useState("");
  const puedeEliminar = tienePermiso("proformas_eliminar");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const aqui = useAqui();

  const convertir = useMutation({
    mutationFn: () => convertirEnOperacion(id),
    meta: { exito: "Proforma convertida en operación" },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["proformas"] });
      navigate(`/comercial/operaciones/${r.operacion.id}`);
      avisarSiguientePaso(r.operacion.id);
    },
  });

  const eliminar = useMutation({
    mutationFn: () => eliminarProforma(id, motivoEliminar.trim()),
    meta: { exito: "Proforma eliminada" },
    onSuccess: () => {
      qc.invalidateQueries();
      navigate("/comercial/proformas");
    },
  });

  const cambiar = useMutation({
    mutationFn: ({ estado, motivo }: { estado: EstadoProforma; motivo?: string }) => cambiarEstadoProforma(id, estado, motivo),
    meta: { exito: "Estado de la proforma actualizado" },
    onSuccess: (r) => {
      qc.setQueryData(["proformas", id], r);
      qc.invalidateQueries({ queryKey: ["proformas"] });
      setAnulando(false);
      setMotivo("");
      avisarPasoProforma(r);
    },
  });

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <Link to="/comercial/proformas" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Proformas
        </Link>
        <Aviso tono="error" titulo="No se pudo cargar la proforma">
          La proforma no existe o no tienes acceso.
        </Aviso>
      </div>
    );
  }
  if (!p) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;

  const puedeEstado = tienePermiso("proformas_estado");
  const puede = (e: EstadoProforma) => puedeEstado && TRANSICIONES[p.estado].includes(e);
  const ocupado = cambiar.isPending || convertir.isPending || eliminar.isPending;
  const a = (estado: EstadoProforma) => () => cambiar.mutate({ estado });

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="print:hidden">
        <EncabezadoPagina
          volverA="/comercial/proformas"
          titulo={
            <span className="flex flex-wrap items-center gap-3">
              {p.numero} <EstadoBadge estado={p.estado} />
              {p.vencida && <EstadoBadge estado="VENCIDA" />}
            </span>
          }
          subtitulo={`${p.cliente.razonSocial} · elaborada por ${p.creadoPor}${p.tarifa ? ` · tarifa ${p.tarifa}` : ""}`}
          acciones={
            <>
            <button type="button" onClick={() => window.print()} className={btnSecundario}>
              <Printer size={16} /> Descargar PDF
            </button>
            {(p.estado === "BORRADOR" || (p.estado === "CONVERTIDA" && !p.edicionBloqueada)) && tienePermiso("proformas_crear") && (
              <Link to={`/comercial/proformas/${p.id}/editar`} className={btnSecundario}>
                <Pencil size={16} /> Editar
              </Link>
            )}
            {puede("BORRADOR") && (
              <button type="button" onClick={a("BORRADOR")} disabled={ocupado} className={btnSecundario}>
                <Undo2 size={16} /> Volver a borrador
              </button>
            )}
            {puede("ANULADA") && (
              <button type="button" onClick={() => setAnulando(true)} disabled={ocupado} className={btnSecundario}>
                <Ban size={16} /> Anular
              </button>
            )}
            {puede("ENVIADA") && (
              <span className="inline-flex items-center gap-2">
                {aqui("enviar") && <Aqui />}
                <button type="button" onClick={a("ENVIADA")} disabled={ocupado} className={`${btnPrimario} ${aqui("enviar") ? "brillo" : ""}`}>
                  <Send size={16} /> Marcar como enviada
                </button>
              </span>
            )}
            {puede("RECHAZADA") && (
              <button type="button" onClick={a("RECHAZADA")} disabled={ocupado} className={btnSecundario}>
                <XCircle size={16} /> Rechazada
              </button>
            )}
            {puede("APROBADA") && (
              <span className="inline-flex items-center gap-2">
                {aqui("aprobar") && <Aqui />}
                <button type="button" onClick={a("APROBADA")} disabled={ocupado} className={`${btnExito} ${aqui("aprobar") ? "brillo" : ""}`}>
                  <CheckCircle2 size={16} /> Aprobada por el cliente
                </button>
              </span>
            )}
            {puedeEliminar && (
              <button type="button" onClick={() => setEliminando(true)} disabled={ocupado} className={btnPeligro}>
                <Trash2 size={16} /> Eliminar
              </button>
            )}
            {p.estado === "APROBADA" && tienePermiso("proformas_convertir") && (
              <span className="inline-flex items-center gap-2">
                {aqui("convertir") && <Aqui />}
                <button type="button" onClick={() => convertir.mutate()} disabled={ocupado} className={`${btnPrimario} ${aqui("convertir") ? "brillo" : ""}`}>
                  <ArrowRightLeft size={16} /> CONVERTIR EN OPERACIÓN
                </button>
              </span>
            )}
            </>
          }
        />

        <div className="print:hidden">
          <RecuadroSiguientePaso siguiente={pasoDeProforma(p)} />
        </div>

        <div className="mb-6 space-y-3">
          {cambiar.isError && !anulando && <Aviso tono="error" titulo={mensajeDeError(cambiar.error)} />}
          {convertir.isError && <Aviso tono="error" titulo={mensajeDeError(convertir.error)} />}
          {p.operacion && (
            <Aviso tono="exito" titulo="Proforma convertida en operación">
              El seguimiento del trámite se hace con la operación{" "}
              <Link to={`/comercial/operaciones/${p.operacion.id}`} className="font-semibold underline">
                {p.operacion.numero}
              </Link>
              .{" "}
              {p.edicionBloqueada
                ? `Ya no se edita: ${p.edicionBloqueada}.`
                : p.edicionConMotivo
                  ? `Se puede corregir, pero como ${p.edicionConMotivo}, al guardar se pide el motivo. Lo ya facturado no cambia.`
                  : "Se puede editar (DAM, valores, servicios extraordinarios). Lo ya facturado no cambia; lo nuevo sale en la siguiente factura."}
            </Aviso>
          )}
          {p.vencida && (
            <Aviso tono="advertencia" titulo={`La validez venció el ${formatearFecha(p.fechaVencimiento)}`}>
              Confirma los precios con el cliente antes de aprobarla, o vuélvela a borrador y actualízala.
            </Aviso>
          )}
          {p.estado !== "BORRADOR" && p.estado !== "CONVERTIDA" && p.estado !== "ANULADA" && <p className="text-xs text-slate-500">Para cambiar precios o conceptos, vuelve la proforma a borrador.</p>}
          {p.costoTotal !== undefined && (
            <div className="flex flex-wrap gap-6 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm">
              <span className="text-slate-500">Uso interno:</span>
              <span>
                Costo estimado <b>{dinero(p.costoTotal, p.moneda)}</b>
              </span>
              <span>
                Margen estimado <b className={(p.margenEstimado ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}>{dinero(p.margenEstimado ?? 0, p.moneda)}</b>
              </span>
              <span>
                Margen <b>{p.subtotal ? (((p.margenEstimado ?? 0) / p.subtotal) * 100).toFixed(1) : 0}%</b>
              </span>
            </div>
          )}
        </div>
      </div>

      <DocumentoProforma proforma={p} cliente={clientes?.find((c) => c.id === p.clienteId)} />

      {eliminando && (
        <Modal
          titulo={`Eliminar la proforma ${p.numero}`}
          onCerrar={() => setEliminando(false)}
          onGuardar={() => eliminar.mutate()}
          guardando={eliminar.isPending}
          error={eliminar.isError ? mensajeDeError(eliminar.error) : null}
          textoGuardar="Eliminar definitivamente"
          deshabilitado={motivoEliminar.trim().length < 5}
          ancho="max-w-lg"
        >
          <div className="sm:col-span-2">
            <Aviso tono="advertencia" titulo="No se puede deshacer">
              Se borra la proforma {p.numero} con todos sus conceptos
              {p.operacion ? ` y la operación ${p.operacion.numero}` : ""}. Si es la última, su número se vuelve a usar; si ya hay otras
              después, el número queda sin usar. Queda una copia con el motivo.
            </Aviso>
          </div>
          <Campo label="Motivo (sustento)" requerido className="sm:col-span-2" ayuda="Queda guardado junto con quién la eliminó y cuándo.">
            <textarea rows={3} value={motivoEliminar} onChange={(e) => setMotivoEliminar(e.target.value)} className={inputClass} autoFocus />
          </Campo>
        </Modal>
      )}
      {anulando && (
        <Modal
          titulo={`Anular la proforma ${p.numero}`}
          onCerrar={() => setAnulando(false)}
          onGuardar={() => cambiar.mutate({ estado: "ANULADA", motivo: motivo.trim() })}
          guardando={cambiar.isPending}
          error={cambiar.isError ? mensajeDeError(cambiar.error) : null}
          textoGuardar="Anular proforma"
        >
          <Campo label="Motivo" requerido className="sm:col-span-2" ayuda="La proforma anulada ya no se puede usar.">
            <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} autoFocus />
          </Campo>
        </Modal>
      )}
    </div>
  );
}
