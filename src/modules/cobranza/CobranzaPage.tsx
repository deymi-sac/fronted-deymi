import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Banknote, Clock, Link2, Plus, Search, Wallet } from "lucide-react";
import {
  anularCobro, aplicarCobro, corregirFechaCobro, quitarConstancia, registrarCobro, subirConstancia, useCobro, useCobros, useCuentasBancarias, useCuentasPorCobrar,
  MEDIOS_COBRO, type MedioCobro, type TipoCobro, type Tramo,
} from "./cobranza.api";
import { AplicarNotas } from "./AplicarNotas";
import { aAplicaciones, problemaAplicacion, totalAplicado, type Aplicado } from "./aplicaciones";
import { FormularioMotivo } from "../operaciones/FormulariosOperacion";
import { useOperaciones } from "../operaciones/operaciones.api";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { AdjuntoArchivo } from "../../components/ui/AdjuntoArchivo";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { CorregirFechaModal } from "../../components/ui/CorregirFecha";
import { PieTabla } from "../../components/ui/PieTabla";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { StatCard } from "../../components/ui/StatCard";
import { Tabla } from "../../components/ui/Tabla";
import { Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, inputClass } from "../../lib/estilos";
import { dinero, etiqueta, redondear } from "../../lib/formato";
import { mensajeDeError, useEnviar } from "../../lib/useEnviar";
import { formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import { useClientes } from "../maestros/useMaestros";
import type { Moneda } from "../maestros/maestros.api";
import { Ventana } from "../../components/ui/Ventana";
import { Aqui } from "../../components/ui/Aqui";
import { useAqui } from "../../lib/useAqui";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";

const hoyLocal = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

function useRefrescar() {
  const qc = useQueryClient();
  return () => {
    for (const clave of ["cobros", "notas", "operaciones", "liquidaciones"]) qc.invalidateQueries({ queryKey: [clave] });
  };
}

/** Nota que se cobra al abrir desde Cuentas por cobrar ("Cobrar"): llena el cliente, la moneda, el importe y la aplicación. */
interface CobroDeNota {
  clienteId: number;
  notaCobranzaId: number;
  operacionId: number;
  moneda: Moneda;
  saldo: number;
}

/** El abono del cliente, con la cuenta donde ingresó. Se aplica a notas ahora o después (anticipo). */
function RegistrarCobroModal({ clienteInicial, nota, onCerrar }: { clienteInicial?: number; nota?: CobroDeNota; onCerrar: () => void }) {
  const refrescar = useRefrescar();
  const { data: clientes } = useClientes();
  const { data: cuentas } = useCuentasBancarias();
  const { data: cxc } = useCuentasPorCobrar();
  const [clienteId, setClienteId] = useState(nota ? String(nota.clienteId) : clienteInicial ? String(clienteInicial) : "");
  const [tipo, setTipo] = useState<TipoCobro>("PAGO");
  const [fecha, setFecha] = useState(hoyLocal());
  const [moneda, setMoneda] = useState<Moneda>(nota?.moneda ?? "USD");
  const [importe, setImporte] = useState(nota ? String(nota.saldo) : "");
  const [cuentaId, setCuentaId] = useState("");
  const [medio, setMedio] = useState<MedioCobro>("TRANSFERENCIA");
  const [nroOperacion, setNroOperacion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [operacionId, setOperacionId] = useState("");
  const [aplicado, setAplicado] = useState<Aplicado>(nota ? { [nota.notaCobranzaId]: { importe: String(nota.saldo), tipoCambio: "" } } : {});

  const cliente = clientes?.find((c) => c.id === Number(clienteId));
  const operaciones = useOperaciones({ pagina: 1, ...(cliente && { buscar: cliente.razonSocial }) });
  const deCliente = (operaciones.data?.items ?? []).filter((o) => o.clienteId === cliente?.id && o.estado !== "ANULADA" && o.estado !== "CERRADA");
  const notas = (cxc?.items ?? []).filter((n) => n.clienteId === Number(clienteId));
  const cuentasMoneda = (cuentas ?? []).filter((c) => c.activo !== false && c.moneda === moneda);
  const monto = Number(importe) || 0;
  const problema = problemaAplicacion(aplicado, notas, moneda, monto);

  const { enviar, guardando, error } = useEnviar(
    "cobros",
    () =>
      registrarCobro({
        clienteId: Number(clienteId),
        tipo,
        fechaCobro: fecha,
        moneda,
        importe: monto,
        cuentaBancariaId: Number(cuentaId),
        medioPago: medio,
        ...(nroOperacion.trim() && { nroOperacionBancaria: nroOperacion.trim() }),
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        ...(operacionId && { operacionId: Number(operacionId) }),
        aplicaciones: aAplicaciones(aplicado, notas, moneda),
      }),
    () => {
      refrescar();
      avisarSiguientePaso(nota?.operacionId);
      onCerrar();
    }
  );

  const falta = [!clienteId && "cliente", !monto && "importe", !cuentaId && "cuenta donde ingresó", problema].filter(Boolean).join(" · ");
  return (
    <Modal titulo="Registrar cobro" textoGuardar="Registrar cobro" onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error} ancho="max-w-2xl" deshabilitado={!!falta} aviso={falta ? `Falta: ${falta}` : undefined}>
      <Campo label="Cliente" requerido className="sm:col-span-2">
        <select
          value={clienteId}
          onChange={(e) => {
            setClienteId(e.target.value);
            setAplicado({});
            setOperacionId("");
          }}
          className={inputClass}
        >
          <option value="">Selecciona…</option>
          {(clientes ?? []).filter((c) => c.activo).map((c) => (
            <option key={c.id} value={c.id}>
              {c.razonSocial}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Tipo">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCobro)} className={inputClass}>
          <option value="PAGO">Pago de notas</option>
          <option value="ANTICIPO">Anticipo (depósito a cuenta)</option>
        </select>
      </Campo>
      <Campo label="Fecha del cobro" requerido>
        <input type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="Moneda" requerido>
        <select
          value={moneda}
          onChange={(e) => {
            setMoneda(e.target.value as Moneda);
            setCuentaId("");
            setAplicado({});
          }}
          className={inputClass}
        >
          <option value="USD">Dólares (US$)</option>
          <option value="PEN">Soles (S/)</option>
        </select>
      </Campo>
      <Campo label="Importe" requerido>
        <input type="number" min={0} step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="Cuenta donde ingresó" requerido className="sm:col-span-2" ayuda="Solo las cuentas de la misma moneda del cobro.">
        <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputClass}>
          <option value="">Selecciona…</option>
          {cuentasMoneda.map((c) => (
            <option key={c.id} value={c.id}>
              {c.banco} · {c.numeroCuenta}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Medio de pago">
        <select value={medio} onChange={(e) => setMedio(e.target.value as MedioCobro)} className={inputClass}>
          {MEDIOS_COBRO.map((m) => (
            <option key={m} value={m}>
              {etiqueta(m)}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="N.° de operación bancaria" ayuda="Si ya está registrado en esa cuenta, se avisa del duplicado.">
        <input value={nroOperacion} onChange={(e) => setNroOperacion(e.target.value)} className={inputClass} />
      </Campo>
      {tipo === "ANTICIPO" && deCliente.length > 0 && (
        <Campo label="Operación" className="sm:col-span-2" ayuda="Opcional: el anticipo se descuenta en la nota de cobranza de esa operación.">
          <select value={operacionId} onChange={(e) => setOperacionId(e.target.value)} className={inputClass}>
            <option value="">Ninguna</option>
            {deCliente.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero}
              </option>
            ))}
          </select>
        </Campo>
      )}
      <Campo label="Observaciones" className="sm:col-span-2">
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputClass} />
      </Campo>
      {clienteId && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-600">Aplicar a notas de cobranza</p>
          <AplicarNotas notas={notas} monedaCobro={moneda} disponible={monto} valor={aplicado} onChange={setAplicado} />
        </div>
      )}
    </Modal>
  );
}

/** Aplica el saldo de un cobro ya registrado a notas del mismo cliente. */
function AplicarCobroModal({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const refrescar = useRefrescar();
  const { data: cobro } = useCobro(id);
  const { data: cxc } = useCuentasPorCobrar();
  const [aplicado, setAplicado] = useState<Aplicado>({});
  const notas = (cxc?.items ?? []).filter((n) => cobro && n.clienteId === cobro.clienteId);
  const problema = cobro ? problemaAplicacion(aplicado, notas, cobro.moneda, cobro.porAplicar) : null;
  const aplicaciones = cobro ? aAplicaciones(aplicado, notas, cobro.moneda) : [];
  const { enviar, guardando, error } = useEnviar("cobros", () => aplicarCobro(id, aplicaciones), () => (refrescar(), onCerrar()));

  return (
    <Modal
      titulo={cobro ? `Aplicar ${cobro.numero}` : "Aplicar cobro"}
      textoGuardar="Aplicar"
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardando}
      error={error}
      ancho="max-w-2xl"
      libre
      deshabilitado={!cobro || aplicaciones.length === 0 || !!problema}
      aviso={problema ?? (aplicaciones.length === 0 ? "Indica cuánto aplicar a cada nota" : undefined)}
    >
      {cobro && (
        <>
          <p className="text-sm text-slate-600">
            {cobro.cliente} · por aplicar <b>{dinero(cobro.porAplicar, cobro.moneda)}</b> de {dinero(cobro.importe, cobro.moneda)}
          </p>
          <AplicarNotas notas={notas} monedaCobro={cobro.moneda} disponible={cobro.porAplicar} valor={aplicado} onChange={setAplicado} />
          {totalAplicado(aplicado, notas, cobro.moneda) > 0 && <p className="text-xs text-slate-500">Se descuenta {dinero(totalAplicado(aplicado, notas, cobro.moneda), cobro.moneda)} del cobro.</p>}
        </>
      )}
    </Modal>
  );
}

function DetalleCobroModal({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const refrescar = useRefrescar();
  const { data: c } = useCobro(id);
  const [modal, setModal] = useState<"aplicar" | "anular" | "fecha" | null>(null);
  const puedeAnular = tienePermiso("cobros_anular");
  const corregirFecha = useMutation({
    mutationFn: (fecha: string) => corregirFechaCobro(id, fecha),
    meta: { exito: "Fecha del cobro corregida" },
    onSuccess: () => {
      refrescar();
      setModal(null);
    },
  });
  const anular = useMutation({
    mutationFn: (motivo: string) => anularCobro(id, motivo),
    meta: { exito: "Cobro anulado" },
    onSuccess: () => {
      refrescar();
      setModal(null);
    },
  });

  return (
    <>
      <Ventana titulo={<span className="flex flex-wrap items-center gap-3">{c ? c.numero : "Cobro"}
              {c && <EstadoBadge estado={c.estado} />}
              {c?.tipo === "ANTICIPO" && <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Anticipo</span>}</span>} ancho="max-w-2xl" onCerrar={onCerrar}>
        {!c ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="space-y-5 p-6 text-sm">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-400">Cliente</dt>
                <dd>{c.cliente}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Fecha</dt>
                <dd>
                  {formatearFecha(c.fechaCobro)}
                  {c.estado !== "ANULADO" && tienePermiso("cobros_registrar") && (
                    <button type="button" onClick={() => setModal("fecha")} className="ml-2 text-xs font-medium text-slate-600 hover:underline">
                      Editar fecha
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Importe</dt>
                <dd className="font-semibold">{dinero(c.importe, c.moneda)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Cuenta</dt>
                <dd>{c.cuentaBancaria}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Medio</dt>
                <dd>
                  {etiqueta(c.medioPago)}
                  {c.nroOperacionBancaria && ` · ${c.nroOperacionBancaria}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Por aplicar</dt>
                <dd className={c.porAplicar > 0 ? "font-semibold text-amber-700" : ""}>{dinero(c.porAplicar, c.moneda)}</dd>
              </div>
            </dl>
            {c.observaciones && <p className="text-slate-600">{c.observaciones}</p>}
            {c.estado === "REGISTRADO" && (
              <AdjuntoArchivo titulo="Constancia del abono (foto o PDF)" url={c.constanciaUrl} editable onSubir={(archivo) => subirConstancia(id, archivo)} onQuitar={() => quitarConstancia(id)} alCambiar={refrescar} />
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Aplicado a notas</p>
              {c.aplicaciones.length === 0 ? (
                <p className="text-slate-400">Aún no se aplica a ninguna nota.</p>
              ) : (
                <ul className="space-y-1">
                  {c.aplicaciones.map((a) => (
                    <li key={a.notaCobranzaId} className="flex justify-between gap-3">
                      <Link to={`/comercial/notas/${a.notaCobranzaId}`} className="underline">
                        {a.notaCobranza}
                      </Link>
                      <span>
                        {dinero(a.importeAplicado, a.monedaNota)}
                        {a.tipoCambio && <span className="text-xs text-slate-400"> (T.C. {a.tipoCambio})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {c.historial.length > 0 && (
              <ol className="space-y-1.5 border-t border-slate-100 pt-4">
                {c.historial.map((h, i) => (
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
            {c.estado === "REGISTRADO" && (
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                {c.porAplicar > 0 && tienePermiso("cobros_registrar") && (
                  <button type="button" onClick={() => setModal("aplicar")} className={btnPrimario}>
                    <Link2 size={16} /> Aplicar a notas
                  </button>
                )}
                {puedeAnular && (
                  <button type="button" onClick={() => setModal("anular")} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline">
                    <Ban size={14} /> Anular cobro
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Ventana>
      {modal === "aplicar" && <AplicarCobroModal id={id} onCerrar={() => setModal(null)} />}
      {modal === "fecha" && c && (
        <CorregirFechaModal
          titulo={`Editar fecha del cobro ${c.numero}`}
          label="Fecha del abono"
          valor={c.fechaCobro}
          guardando={corregirFecha.isPending}
          error={corregirFecha.isError ? mensajeDeError(corregirFecha.error) : null}
          onGuardar={(d) => corregirFecha.mutate(d)}
          onCerrar={() => setModal(null)}
        />
      )}
      {modal === "anular" && c && (
        <FormularioMotivo
          titulo={`Anular ${c.numero}`}
          textoGuardar="Anular cobro"
          ayuda="El abono no ingresó o se registró mal: las notas a las que se aplicó recuperan su saldo."
          onCerrar={() => setModal(null)}
          onGuardar={(m) => anular.mutate(m)}
          guardando={anular.isPending}
          error={anular.isError ? mensajeDeError(anular.error) : null}
        />
      )}
    </>
  );
}

const TRAMO: Record<Tramo, string> = {
  POR_VENCER: "Por vencer",
  "1_30": "1–30 días",
  "31_60": "31–60 días",
  "61_90": "61–90 días",
  MAS_90: "Más de 90 días",
};

type Vista = "cxc" | "cobros" | "porAplicar" | "anulados";

const aFiltro = (v: Vista) => (v === "porAplicar" ? { porAplicar: true } : v === "anulados" ? { estado: "ANULADO" as const } : { estado: "REGISTRADO" as const });

export default function CobranzaPage() {
  const [vista, setVista] = useState<Vista>("cxc");
  const [registrando, setRegistrando] = useState<{ clienteId?: number } | null>(null);
  const [cobrando, setCobrando] = useState<CobroDeNota | null>(null);
  const [parametros] = useSearchParams();
  // Viene del "siguiente paso" de una operación: esa nota se muestra arriba, lista para cobrar
  const notaPedida = Number(parametros.get("nota")) || null;
  // Al pulsar el botón resaltado, deja de resaltarse (y se quita el recuadro "Te toca cobrar")
  useAqui(["nota"]);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const cxc = useCuentasPorCobrar();
  const pedida = cxc.data?.items.find((c) => c.notaCobranzaId === notaPedida);
  const cobros = useCobros({ pagina, ...(vista !== "cxc" && aFiltro(vista)), ...(texto.trim() && { buscar: texto.trim() }) });
  const puedeRegistrar = tienePermiso("cobros_registrar");
  // Saldo de los cobros sin aplicar, sumado por moneda
  const porAplicar = (["PEN", "USD"] as const)
    .map((moneda) => ({ moneda, total: redondear((cxc.data?.porAplicar ?? []).filter((a) => a.moneda === moneda).reduce((s, a) => s + a.porAplicar, 0)) }))
    .filter((x) => x.total > 0);

  const tabs: { clave: Vista; label: string; contador?: number | undefined }[] = [
    { clave: "cxc", label: "Cuentas por cobrar", contador: cxc.data?.items.length || undefined },
    { clave: "cobros", label: "Cobros registrados" },
    { clave: "porAplicar", label: "Por aplicar", contador: cxc.data?.porAplicar.length || undefined },
    { clave: "anulados", label: "Anulados" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina
        titulo="Cobranza"
        subtitulo="Abonos de clientes aplicados a notas de cobranza"
        acciones={
          puedeRegistrar && (
            <button type="button" onClick={() => setRegistrando({})} className={btnPrimario}>
              <Plus size={16} /> Registrar cobro
            </button>
          )
        }
      />

      {/* Los montos no se suman entre monedas: un resumen por moneda */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cxc.data?.resumen.length === 0 && <StatCard label="Por cobrar" valor="Sin saldo" detalle="Todas las notas están cobradas" icono={Wallet} tono="verde" />}
        {cxc.data?.resumen.map((r) => (
          <StatCard
            key={r.moneda}
            label={`Por cobrar en ${r.moneda}`}
            valor={dinero(r.saldo, r.moneda)}
            detalle={`${r.notas} nota(s)${r.vencido ? ` · vencido ${dinero(r.vencido, r.moneda)}` : ""}`}
            icono={r.vencido ? Clock : Wallet}
            tono={r.vencido ? "rojo" : "base"}
          />
        ))}
        {(cxc.data?.porAplicar.length ?? 0) > 0 && (
          <StatCard
            label="Cobros por aplicar"
            valor={porAplicar.map((x) => dinero(x.total, x.moneda)).join(" + ")}
            detalle={`${cxc.data!.porAplicar.length} cobro(s) con saldo`}
            icono={Banknote}
            tono="ambar"
          />
        )}
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

      {vista === "cxc" && pedida && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-marca-200 bg-marca-100/50 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">Te toca cobrar</p>
            <p>
              Nota <b>{pedida.notaCobranza}</b> · {pedida.cliente} · {pedida.operacion} · saldo <b>{dinero(pedida.saldo, pedida.moneda)}</b> · vence{" "}
              {formatearFecha(pedida.fechaVencimiento)}
            </p>
          </div>
          {puedeRegistrar && (
            <span className="inline-flex items-center gap-2">
              <Aqui />
              <button type="button" onClick={() => setCobrando(pedida)} className={`${btnPrimario} brillo`}>
                <Banknote size={16} /> Registrar el cobro de esta nota
              </button>
            </span>
          )}
        </div>
      )}
      {vista === "cxc" && notaPedida && cxc.data && !pedida && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Esa nota ya no tiene saldo por cobrar.</p>
      )}

      {vista === "cxc" ? (
        <Tarjeta sinPadding>
          <Tabla
            cargando={cxc.isLoading}
            filas={cxc.data?.items}
            claveFila={(c) => c.notaCobranzaId}
            vacio="No hay notas con saldo por cobrar"
            columnas={[
              {
                titulo: "Nota",
                celda: (c) => (
                  <Link to={`/comercial/notas/${c.notaCobranzaId}`} className="font-semibold text-slate-800 hover:underline">
                    {c.notaCobranza}
                  </Link>
                ),
              },
              { titulo: "Cliente", celda: (c) => c.cliente },
              { titulo: "Operación", celda: (c) => c.operacion },
              { titulo: "Vence", celda: (c) => formatearFecha(c.fechaVencimiento) },
              { titulo: "Total", alinear: "derecha", celda: (c) => dinero(c.total, c.moneda) },
              { titulo: "Cobrado", alinear: "derecha", celda: (c) => dinero(c.cobrado, c.moneda) },
              { titulo: "Saldo", alinear: "derecha", celda: (c) => <b>{dinero(c.saldo, c.moneda)}</b> },
              {
                titulo: "Antigüedad",
                celda: (c) =>
                  c.diasVencida > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {c.diasVencida} días · {TRAMO[c.tramo]}
                    </span>
                  ) : (
                    <EstadoBadge estado={c.estado} />
                  ),
              },
              {
                titulo: "",
                alinear: "derecha",
                celda: (c) =>
                  puedeRegistrar && (
                    <button
                      type="button"
                      onClick={() => setCobrando({ clienteId: c.clienteId, notaCobranzaId: c.notaCobranzaId, operacionId: c.operacionId, moneda: c.moneda, saldo: c.saldo })}
                      className={`whitespace-nowrap text-sm font-medium ${c.notaCobranzaId === notaPedida ? "brillo rounded-lg bg-slate-800 px-3 py-1 text-white" : "text-slate-600 underline hover:text-slate-900"}`}
                    >
                      Cobrar
                    </button>
                  ),
              },
            ]}
          />
        </Tarjeta>
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
                placeholder="Cobro, cliente, nota u operación bancaria"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <Tabla
            cargando={cobros.isLoading}
            filas={cobros.data?.items}
            claveFila={(c) => c.id}
            onFila={(c) => setDetalle(c.id)}
            vacio="No hay cobros"
            columnas={[
              {
                titulo: "Cobro",
                celda: (c) => (
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    {c.numero}
                    {c.tipo === "ANTICIPO" && <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">ANTICIPO</span>}
                  </span>
                ),
              },
              { titulo: "Fecha", celda: (c) => formatearFecha(c.fechaCobro) },
              { titulo: "Cliente", celda: (c) => c.cliente },
              { titulo: "Medio", celda: (c) => [etiqueta(c.medioPago), c.nroOperacionBancaria].filter(Boolean).join(" · ") },
              { titulo: "Cuenta", celda: (c) => <span className="text-xs text-slate-500">{c.cuentaBancaria}</span> },
              { titulo: "Importe", alinear: "derecha", celda: (c) => <b>{dinero(c.importe, c.moneda)}</b> },
              {
                titulo: "Por aplicar",
                alinear: "derecha",
                celda: (c) => (c.porAplicar > 0 ? <span className="text-amber-700">{dinero(redondear(c.porAplicar), c.moneda)}</span> : "—"),
              },
              { titulo: "Estado", celda: (c) => <EstadoBadge estado={c.estado} /> },
            ]}
          />
          {cobros.data && (
            <PieTabla pagina={cobros.data.pagina} paginas={cobros.data.paginas} onPagina={setPagina}>
              {cobros.data.total} cobros{cobros.data.totales.length > 0 && <> · {cobros.data.totales.map((t) => dinero(t.total, t.moneda)).join(" + ")}</>}
            </PieTabla>
          )}
        </Tarjeta>
      )}

      {cobrando && <RegistrarCobroModal nota={cobrando} onCerrar={() => setCobrando(null)} />}
      {registrando && <RegistrarCobroModal {...(registrando.clienteId !== undefined && { clienteInicial: registrando.clienteId })} onCerrar={() => setRegistrando(null)} />}
      {detalle !== null && <DetalleCobroModal id={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}
