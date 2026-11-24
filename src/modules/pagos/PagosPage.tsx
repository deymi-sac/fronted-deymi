import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, FileWarning, Plus, Search } from "lucide-react";
import { revisarPagos, usePagos, type EstadoPago, type FiltroPagos, type Pago } from "./pagos.api";
import { RegistrarPagoModal } from "./RegistrarPagoModal";
import { tienePermiso } from "../auth/auth.utils";
import { DetallePagoModal } from "./DetallePagoModal";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { PieTabla } from "../../components/ui/PieTabla";
import { Tabla } from "../../components/ui/Tabla";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { dinero } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { Aqui } from "../../components/ui/Aqui";
import { useAqui } from "../../lib/useAqui";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";
import { notificar } from "../../lib/toast";

type Filtro = "TODOS" | "SIN_SUSTENTO" | EstadoPago;

const FILTROS: { clave: Filtro; label: string }[] = [
  { clave: "TODOS", label: "Todos" },
  { clave: "REGISTRADO", label: "Registrados" },
  { clave: "REVISADO", label: "Revisados" },
  { clave: "LIQUIDADO", label: "Liquidados" },
  { clave: "FACTURADO", label: "Facturados" },
  { clave: "ANULADO", label: "Anulados" },
  { clave: "SIN_SUSTENTO", label: "Sin comprobante" },
];

const aFiltro = (f: Filtro): Omit<FiltroPagos, "pagina"> => (f === "TODOS" ? {} : f === "SIN_SUSTENTO" ? { sinSustento: true } : { estado: f });

export default function PagosPage() {
  const qc = useQueryClient();
  // Desde el "siguiente paso": revisar o completar los pagos de una operación ya filtrados
  const [parametros] = useSearchParams();
  const aqui = useAqui();
  const operacionParam = Number(parametros.get("operacion")) || null;
  const numeroParam = parametros.get("numero") ?? "";
  const [filtro, setFiltro] = useState<Filtro>(() => (aqui("revisar") ? "REGISTRADO" : aqui("comprobante") ? "SIN_SUSTENTO" : "TODOS"));
  const [texto, setTexto] = useState(() => (aqui("revisar") || aqui("comprobante") ? numeroParam : ""));
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = usePagos({ pagina, ...aFiltro(filtro), ...(texto.trim() && { buscar: texto.trim() }) });
  // Solo para el aviso: cuántos pagos vigentes siguen sin comprobante
  const { data: pendientes } = usePagos({ pagina: 1, sinSustento: true });
  const [registrando, setRegistrando] = useState(false);
  // Desde el "siguiente paso": el pago se abre con la operación ya elegida y el botón resaltado
  const operacionPedida = operacionParam && numeroParam ? { id: operacionParam, numero: numeroParam } : undefined;
  // Los pagos de la operación que faltan revisar (para el recuadro "Te toca revisar")
  const porRevisarOp = usePagos({ pagina: 1, operacionId: operacionParam ?? undefined, estado: "REGISTRADO" }, !!operacionParam);
  const [revisandoOp, setRevisandoOp] = useState<number | null>(null);
  const pagosPorRevisar = operacionParam ? (porRevisarOp.data?.items ?? []) : [];
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [detalle, setDetalle] = useState<number | null>(null);
  const puedeRevisar = tienePermiso("pagos_revisar");

  function filtrar(f: Filtro) {
    setFiltro(f);
    setPagina(1);
    setSeleccion([]);
  }
  function buscar(t: string) {
    setTexto(t);
    setPagina(1);
  }

  const revisar = useMutation({
    mutationFn: () => revisarPagos(seleccion),
    meta: { exito: "Pagos revisados" },
    onSuccess: () => {
      for (const clave of ["pagos", "liquidaciones"]) qc.invalidateQueries({ queryKey: [clave] });
      setSeleccion([]);
    },
  });
  const revisarOperacion = useMutation({
    mutationFn: () => revisarPagos(pagosPorRevisar.map((p) => p.id)),
    meta: { exito: `Pagos de ${numeroParam} marcados como revisados` },
    onSuccess: (r) => {
      for (const clave of ["pagos", "liquidaciones", "operaciones"]) qc.invalidateQueries({ queryKey: [clave] });
      if (r.omitidos.length) notificar(`No se revisaron: ${r.omitidos.map((o) => `#${o.id} ${o.motivo}`).join(", ")}`, "error");
      avisarSiguientePaso(revisandoOp);
      setRevisandoOp(null);
    },
    onError: () => setRevisandoOp(null),
  });
  const sinSustento = pendientes?.total ?? 0;
  const revisables = data?.items.filter((p) => p.estado === "REGISTRADO") ?? [];
  const todosMarcados = revisables.length > 0 && revisables.every((p) => seleccion.includes(p.id));

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina
        titulo="Bandeja de pagos"
        subtitulo="Cada desembolso hecho por cuenta de una operación"
        acciones={
          <>
            {puedeRevisar && seleccion.length > 0 && (
              <button type="button" onClick={() => revisar.mutate()} disabled={revisar.isPending} className={btnSecundario}>
                <CheckCheck size={16} /> Marcar {seleccion.length} como revisado(s)
              </button>
            )}
            {tienePermiso("pagos_registrar") && (
              <span className="inline-flex items-center gap-2">
                {aqui("registrar") && <Aqui />}
                <button type="button" onClick={() => setRegistrando(true)} className={`${btnPrimario} ${aqui("registrar") ? "brillo" : ""}`}>
                  <Plus size={16} /> Registrar pago
                </button>
              </span>
            )}
          </>
        }
      />

      {revisandoOp === null && operacionParam && pagosPorRevisar.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-marca-200 bg-marca-100/50 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">Te toca revisar</p>
            <p>
              {pagosPorRevisar.length} {pagosPorRevisar.length === 1 ? "pago" : "pagos"} de <b>{numeroParam}</b> por revisar (abajo, en Registrados). Revisa que el
              comprobante y el importe de cada uno estén bien.
            </p>
          </div>
          {puedeRevisar ? (
            <span className="inline-flex items-center gap-2">
              {aqui("revisar") && <Aqui />}
              <button
                type="button"
                onClick={() => {
                  setRevisandoOp(operacionParam);
                  revisarOperacion.mutate();
                }}
                disabled={revisarOperacion.isPending}
                className={`${btnPrimario} ${aqui("revisar") ? "brillo" : ""}`}
              >
                <CheckCheck size={16} /> Marcar {pagosPorRevisar.length === 1 ? "el pago" : `los ${pagosPorRevisar.length} pagos`} como revisados
              </button>
            </span>
          ) : (
            <p className="text-sm text-amber-800">Los revisa quien tiene el permiso de revisar pagos: avísale para continuar.</p>
          )}
        </div>
      )}

      {revisar.isError && (
        <div className="mb-4">
          <Aviso tono="error" titulo={mensajeDeError(revisar.error)} />
        </div>
      )}
      {revisar.data && revisar.data.omitidos.length > 0 && (
        <div className="mb-4">
          <Aviso tono="advertencia" titulo={`No se revisaron: ${revisar.data.omitidos.map((o) => `#${o.id} ${o.motivo}`).join(", ")}`} />
        </div>
      )}
      {sinSustento > 0 && filtro !== "SIN_SUSTENTO" && (
        <div className="mb-4">
          <Aviso tono="advertencia" titulo={`${sinSustento} pago(s) pendientes de comprobante`}>
            Sus operaciones no podrán cerrarse hasta registrar el N.° de comprobante.{" "}
            <button type="button" onClick={() => filtrar("SIN_SUSTENTO")} className="font-semibold underline">
              Ver pagos
            </button>
          </Aviso>
        </div>
      )}

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            type="button"
            onClick={() => filtrar(f.clave)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${filtro === f.clave ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {f.label}
            {f.clave === "SIN_SUSTENTO" && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{sinSustento}</span>}
          </button>
        ))}
      </div>

      <Tarjeta sinPadding>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={texto} onChange={(e) => buscar(e.target.value)} placeholder="Operación, proveedor, RUC, comprobante…" className={`${inputClass} pl-9`} />
          </div>
        </div>
        <Tabla
          cargando={isLoading}
          filas={data?.items}
          claveFila={(p) => p.id}
          onFila={(p) => setDetalle(p.id)}
          vacio={texto || filtro !== "TODOS" ? "Ningún pago coincide" : "Todavía no hay pagos"}
          columnas={[
            ...(puedeRevisar
              ? [
                  {
                    titulo: (
                      <input
                        type="checkbox"
                        aria-label="Marcar todos los registrados de esta página"
                        checked={todosMarcados}
                        disabled={revisables.length === 0}
                        onChange={(e) => setSeleccion(e.target.checked ? revisables.map((p) => p.id) : [])}
                      />
                    ),
                    className: "w-8",
                    celda: (p: Pago) =>
                      p.estado === "REGISTRADO" ? (
                        <input
                          type="checkbox"
                          aria-label={`Marcar el pago #${p.id}`}
                          checked={seleccion.includes(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setSeleccion((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                        />
                      ) : null,
                  },
                ]
              : []),
            { titulo: "Operación", celda: (p) => <span className="font-semibold text-slate-800">{p.operacion}</span> },
            { titulo: "Cliente", celda: (p) => <span className="block max-w-44 truncate">{p.cliente}</span> },
            { titulo: "Fecha", celda: (p) => formatearFecha(p.fechaPago) },
            { titulo: "Proveedor", celda: (p) => <span className="block max-w-44 truncate">{p.proveedor}</span> },
            {
              titulo: "Concepto",
              celda: (p) => (
                <span>
                  {p.concepto}
                  {p.noProformado && <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">NO PROF.</span>}
                  {p.posibleDuplicadoDe && <span className="ml-1.5 rounded bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">DUPLICADO</span>}
                </span>
              ),
            },
            {
              titulo: "Comprobante",
              celda: (p) =>
                p.sinSustento && p.estado !== "ANULADO" ? (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <FileWarning size={14} /> {p.serieNumero ?? "Pendiente"}
                  </span>
                ) : (
                  (p.serieNumero ?? "—")
                ),
            },
            { titulo: "Importe", alinear: "derecha", celda: (p) => <span className="font-medium">{dinero(p.total, p.moneda)}</span> },
            { titulo: "Estado", celda: (p) => <EstadoBadge estado={p.estado} /> },
          ]}
        />
        {data && (
          <PieTabla pagina={data.pagina} paginas={data.paginas} onPagina={setPagina}>
            {data.total} pagos{data.totales.length > 0 && <> · sin anulados: {data.totales.map((t) => dinero(t.total, t.moneda)).join(" + ")}</>}
          </PieTabla>
        )}
      </Tarjeta>

      <RegistrarPagoModal abierto={registrando} onCerrar={() => setRegistrando(false)} operacion={operacionPedida} />
      {detalle !== null && <DetallePagoModal id={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}
