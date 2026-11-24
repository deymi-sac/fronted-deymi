import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { Aviso } from "../../components/ui/Tarjeta";
import { inputClass } from "../../lib/estilos";
import { dinero, etiqueta, redondear } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { useDiferido } from "../../lib/useDiferido";
import { fechaLocalHoy, formatearFecha } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import { useConceptos, useEmpresa, useProveedores } from "../maestros/useMaestros";
import { FormularioProveedor } from "../maestros/FormulariosMaestros";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";
import type { Moneda } from "../maestros/maestros.api";
import { ChecklistGastos, type ItemMarcado } from "./ChecklistGastos";
import {
  buscarOperacion, editarPago, MEDIOS_PAGO, obtenerGastosProforma, registrarPago, registrarPagosVarios, SUBCLASIFICACIONES, TIPOS_COMPROBANTE, verificarPago,
  type Clasificacion, type DatosPago, type MedioPago, type PagoDetalle, type Subclasificacion, type TipoComprobante,
} from "./pagos.api";

const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Banco de la Nación", "Pichincha"];

interface Form {
  fechaPago: string;
  proveedorId: number;
  conceptoId: number;
  descripcion: string;
  tipoComprobante: TipoComprobante | "";
  serieNumero: string;
  moneda: Moneda | null;
  importe: number | null;
  igv: number | null;
  tipoCambio: number | null;
  medioPago: MedioPago;
  banco: string;
  nroOperacionBancaria: string;
  clasificacion: Clasificacion;
  subclasificacion: Subclasificacion;
  justificacion: string;
  observaciones: string;
}

const numeroONulo = (v: string) => (v === "" ? null : Number(v));

const vacio = (): Form => ({
  fechaPago: fechaLocalHoy(),
  proveedorId: 0,
  conceptoId: 0,
  descripcion: "",
  tipoComprobante: "FACTURA",
  serieNumero: "",
  moneda: null,
  importe: null,
  igv: 0,
  tipoCambio: null,
  medioPago: "TRANSFERENCIA",
  banco: "",
  nroOperacionBancaria: "",
  clasificacion: "REEMBOLSABLE",
  subclasificacion: "FACTURABLE",
  justificacion: "",
  observaciones: "",
});

const desdePago = (p: PagoDetalle): Form => ({
  fechaPago: p.fechaPago,
  proveedorId: p.proveedorId,
  conceptoId: p.conceptoId,
  descripcion: p.descripcion ?? "",
  tipoComprobante: p.tipoComprobante ?? "",
  serieNumero: p.serieNumero ?? "",
  moneda: p.moneda,
  importe: p.importe,
  igv: p.igv,
  tipoCambio: p.tipoCambio,
  medioPago: p.medioPago,
  banco: p.banco ?? "",
  nroOperacionBancaria: p.nroOperacionBancaria ?? "",
  clasificacion: p.clasificacion,
  subclasificacion: p.subclasificacion ?? "FACTURABLE",
  justificacion: p.justificacion ?? "",
  observaciones: p.observaciones ?? "",
});

/**
 * Registrar un pago o corregir uno existente (`pago`, con motivo).
 * `operacion` llega ya elegida desde el detalle de una operación.
 */
export function RegistrarPagoModal({
  abierto,
  onCerrar,
  operacion,
  pago,
}: {
  abierto: boolean;
  onCerrar: () => void;
  operacion?: { id: number; numero: string; estado?: string; cliente?: string; moneda?: Moneda };
  pago?: PagoDetalle;
}) {
  if (!abierto) return null;
  // Se monta de nuevo cada vez que se abre: el formulario empieza limpio
  const inicial = pago ? { id: pago.operacionId, numero: pago.operacion, estado: pago.estadoOperacion, cliente: pago.cliente, moneda: pago.monedaOperacion } : operacion;
  return <Formulario onCerrar={onCerrar} operacion={inicial} pago={pago} />;
}

interface OperacionElegida {
  id: number;
  numero: string;
  estado: string;
  cliente: string;
  moneda: Moneda;
}

function Formulario({
  onCerrar,
  operacion,
  pago,
}: {
  onCerrar: () => void;
  operacion?: { id: number; numero: string; estado?: string; cliente?: string; moneda?: Moneda } | undefined;
  pago?: PagoDetalle | undefined;
}) {
  const qc = useQueryClient();
  // El backend decide quién puede forzar un duplicado (permiso pagos_forzar_duplicado)
  const puedeForzar = tienePermiso("pagos_forzar_duplicado");
  const { data: proveedores } = useProveedores();
  const { data: conceptos } = useConceptos();
  const { data: empresa } = useEmpresa();
  const [textoOp, setTextoOp] = useState(operacion?.numero ?? "");
  const [opId, setOpId] = useState<number | null>(operacion?.id ?? null);
  const [f, setF] = useState<Form>(() => (pago ? desdePago(pago) : vacio()));
  const [confirmaDuplicado, setConfirmaDuplicado] = useState(false);
  const [motivo, setMotivo] = useState("");
  /** Ítems de la proforma marcados en el checklist (un pago por ítem) */
  const [marcadosTodos, setMarcados] = useState<Record<number, ItemMarcado>>({});
  // Registrar un proveedor sin salir del pago: para un ítem del checklist (su id) o para el formulario ("form")
  const puedeCrearProveedor = tienePermiso("maestros_editar");
  const [nuevoProveedorPara, setNuevoProveedorPara] = useState<number | "form" | null>(null);
  const [todosLosConceptos, setTodosLosConceptos] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const textoBusqueda = useDiferido(textoOp.trim(), 300);
  const busqueda = useQuery({
    queryKey: ["operaciones", "buscar", textoBusqueda],
    queryFn: () => buscarOperacion(textoBusqueda),
    enabled: textoBusqueda.length >= 2,
  });
  // Al elegir el número de operación el sistema completa los demás datos
  const encontrada = busqueda.data?.find((o) => o.id === opId);
  const dePartida: OperacionElegida | null = operacion && opId === operacion.id ? { id: operacion.id, numero: operacion.numero, estado: operacion.estado ?? "", cliente: operacion.cliente ?? "", moneda: operacion.moneda ?? "USD" } : null;
  const opResuelta: OperacionElegida | null = encontrada ?? dePartida;
  const moneda: Moneda = f.moneda ?? opResuelta?.moneda ?? "USD";
  const otraMoneda = !!opResuelta && moneda !== opResuelta.moneda;
  const tasaIgv = empresa?.tasaIgv ?? 0.18;
  const total = redondear((f.importe ?? 0) + (f.igv ?? 0));
  const concepto = conceptos?.find((c) => c.id === f.conceptoId);
  const serie = f.serieNumero.trim();

  // Se consulta cuando se deja de escribir; al guardar, el backend vuelve a verificar igual
  const consulta = useDiferido({
    operacionId: opId ?? undefined,
    conceptoId: f.conceptoId || undefined,
    clasificacion: f.clasificacion,
    proveedorId: f.proveedorId || undefined,
    serieNumero: serie || undefined,
    total: total || undefined,
    excepto: pago?.id,
  });
  const verificacion = useQuery({
    queryKey: ["pagos", "verificar", consulta],
    queryFn: () => verificarPago({ ...consulta, operacionId: consulta.operacionId! }),
    enabled: consulta.operacionId !== undefined,
    placeholderData: keepPreviousData,
  });
  // Conceptos: solo los gastos de la proforma que aún no tienen pago; el resto, a pedido ("Otro concepto")
  const gastosOp = useQuery({
    queryKey: ["pagos", "gastos-proforma", opId],
    queryFn: () => obtenerGastosProforma(opId!),
    enabled: opId !== null,
  });
  // Solo cuentan las marcas de los ítems pendientes de la operación en pantalla: si se cambia de operación
  // (o un ítem ya se pagó), las marcas anteriores no deben quedar escondidas bloqueando el guardado
  const idsPendientes = new Set((gastosOp.data ?? []).filter((g) => g.tipo === "GASTO_TERCERO" && !g.pago).map((g) => g.id));
  const marcados: Record<number, ItemMarcado> = Object.fromEntries(Object.entries(marcadosTodos).filter(([id]) => idsPendientes.has(Number(id))));
  const varios = !pago && Object.keys(marcados).length > 0;
  const pendientes = new Set((gastosOp.data ?? []).filter((g) => g.tipo === "GASTO_TERCERO" && !g.pago).map((g) => g.conceptoId));
  const soloPendientes = opId !== null && !todosLosConceptos && pendientes.size > 0;
  const conceptosVisibles = (conceptos ?? []).filter((c) => (c.activo || c.id === f.conceptoId) && (!soloPendientes || pendientes.has(c.id) || c.id === f.conceptoId));
  const duplicado = verificacion.data?.duplicado ?? null;
  const noProformado = !!verificacion.data?.noProformado;

  /** Lo común a todos los pagos de esta vez (fecha, medio, clasificación…) */
  const comunes = () => ({
    operacionId: opId!,
    fechaPago: f.fechaPago,
    moneda,
    tipoCambio: otraMoneda ? f.tipoCambio : null,
    medioPago: f.medioPago,
    banco: f.banco.trim() || null,
    nroOperacionBancaria: f.nroOperacionBancaria.trim() || null,
    clasificacion: f.clasificacion,
    subclasificacion: f.clasificacion === "REEMBOLSABLE" ? f.subclasificacion : null,
    observaciones: f.observaciones.trim() || null,
  });

  const guardarVarios = useMutation({
    mutationFn: () => {
      const lista: DatosPago[] = Object.entries(marcados).map(([id, m]) => {
        const g = gastosOp.data!.find((x) => x.id === Number(id))!;
        const serieItem = m.serieNumero.trim();
        return {
          ...comunes(),
          proveedorId: m.proveedorId,
          conceptoId: g.conceptoId,
          descripcion: g.descripcion,
          tipoComprobante: serieItem || f.tipoComprobante === "OTRO" ? f.tipoComprobante || null : null,
          serieNumero: serieItem || null,
          importe: m.importe ?? 0,
          igv: m.igv ?? 0,
          justificacion: null,
          confirmarDuplicado: false,
        };
      });
      return registrarPagosVarios(lista);
    },
    onSuccess: () => {
      for (const clave of ["pagos", "operaciones", "liquidaciones"]) qc.invalidateQueries({ queryKey: [clave] });
      avisarSiguientePaso(opId);
      onCerrar();
    },
  });

  const guardar = useMutation({
    mutationFn: () => {
      const datos: DatosPago = {
        operacionId: opId!,
        fechaPago: f.fechaPago,
        proveedorId: f.proveedorId,
        conceptoId: f.conceptoId,
        descripcion: f.descripcion.trim() || null,
        // Sin número el comprobante queda pendiente: el backend exige el número si se indica el tipo
        tipoComprobante: serie || f.tipoComprobante === "OTRO" ? f.tipoComprobante || null : null,
        serieNumero: serie || null,
        moneda,
        importe: f.importe ?? 0,
        igv: f.igv ?? 0,
        tipoCambio: otraMoneda ? f.tipoCambio : null,
        medioPago: f.medioPago,
        banco: f.banco.trim() || null,
        nroOperacionBancaria: f.nroOperacionBancaria.trim() || null,
        clasificacion: f.clasificacion,
        subclasificacion: f.clasificacion === "REEMBOLSABLE" ? f.subclasificacion : null,
        justificacion: f.justificacion.trim() || null,
        observaciones: f.observaciones.trim() || null,
        confirmarDuplicado: confirmaDuplicado,
      };
      return pago ? editarPago(pago.id, { ...datos, motivo: motivo.trim() }) : registrarPago(datos);
    },
    onSuccess: () => {
      for (const clave of ["pagos", "operaciones", "liquidaciones"]) qc.invalidateQueries({ queryKey: [clave] });
      if (!pago) avisarSiguientePaso(opId);
      onCerrar();
    },
  });

  const marcadosLista = Object.values(marcados);
  const faltantes = varios
    ? [
        marcadosLista.some((m) => !m.proveedorId) && "proveedor de cada ítem",
        marcadosLista.some((m) => !m.importe) && "importe de cada ítem",
        otraMoneda && !f.tipoCambio && "tipo de cambio",
      ].filter((x): x is string => typeof x === "string")
    : [
    opId === null && "N.° de operación",
    !f.proveedorId && "proveedor",
    !f.conceptoId && "concepto",
    !f.importe && "importe",
    otraMoneda && !f.tipoCambio && "tipo de cambio",
    noProformado && f.justificacion.trim().length < 10 && "justificación del gasto no proformado",
    duplicado && !confirmaDuplicado && "confirmar la alerta de duplicidad",
    pago && motivo.trim().length < 5 && "motivo del cambio",
  ].filter((x): x is string => typeof x === "string");
  const ocupado = guardar.isPending || guardarVarios.isPending;
  const errorGuardar = guardarVarios.isError ? guardarVarios.error : guardar.isError ? guardar.error : null;
  const totalVarios = redondear(marcadosLista.reduce((s, m) => s + (m.importe ?? 0) + (m.igv ?? 0), 0));

  return (
    <Modal
      titulo={pago ? `Corregir pago #${pago.id}` : "Registrar pago"}
      onCerrar={onCerrar}
      onGuardar={() => (varios ? guardarVarios.mutate() : guardar.mutate())}
      guardando={ocupado}
      error={errorGuardar ? mensajeDeError(errorGuardar) : null}
      textoGuardar={varios ? `Guardar ${marcadosLista.length} ${marcadosLista.length === 1 ? "pago" : "pagos"} · ${dinero(totalVarios, moneda)}` : "Guardar pago"}
      ancho="max-w-4xl"
      libre
      deshabilitado={faltantes.length > 0}
      {...(faltantes.length > 0 && { aviso: `Falta: ${faltantes.join(", ")}` })}
    >
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Datos de identificación</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="N.° de operación" requerido>
            <div className="relative">
              <input
                value={textoOp}
                disabled={!!pago || !!operacion}
                onChange={(e) => {
                  setTextoOp(e.target.value);
                  setOpId(null);
                }}
                placeholder="OP-2026-000004, DAM o BL"
                className={inputClass}
                autoFocus={!operacion}
              />
              {opId === null && busqueda.data && textoBusqueda.length >= 2 && textoBusqueda === textoOp.trim() && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {busqueda.data.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Ninguna operación que reciba pagos coincide</li>}
                  {busqueda.data.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpId(o.id);
                          setTextoOp(o.numero);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold">{o.numero}</span> <span className="text-xs text-slate-400">{etiqueta(o.estado)}</span>
                        <span className="block truncate text-xs text-slate-500">{o.cliente}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Campo>
          <Campo label="Cliente">
            <input disabled value={opResuelta?.cliente ?? ""} className={inputClass} />
          </Campo>
          <Campo label="Estado / moneda">
            <input disabled value={opResuelta ? `${opResuelta.estado ? etiqueta(opResuelta.estado) + " · " : ""}${opResuelta.moneda}` : ""} className={inputClass} />
          </Campo>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Datos del pago</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Fecha del pago" requerido>
            <input type="date" value={f.fechaPago} max={fechaLocalHoy()} onChange={(e) => set("fechaPago", e.target.value || fechaLocalHoy())} className={inputClass} />
          </Campo>
          {opId !== null && !pago && (
            <div className="sm:col-span-3">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Ítems de la proforma por pagar</p>
              {gastosOp.isLoading ? (
                <p className="text-sm text-slate-400">Buscando los ítems de la proforma…</p>
              ) : (
                <ChecklistGastos
                  gastos={gastosOp.data ?? []}
                  marcados={marcados}
                  onCambiar={setMarcados}
                  proveedores={proveedores ?? []}
                  moneda={moneda}
                  tasaIgv={tasaIgv}
                  onNuevoProveedor={puedeCrearProveedor ? setNuevoProveedorPara : undefined}
                />
              )}
            </div>
          )}
          {!varios && (
          <>
          <Campo label="Proveedor / entidad" requerido className="sm:col-span-2">
            <select
              value={f.proveedorId}
              onChange={(e) => (Number(e.target.value) === -1 ? setNuevoProveedorPara("form") : set("proveedorId", Number(e.target.value)))}
              className={inputClass}
            >
              <option value={0}>Selecciona…</option>
              {proveedores
                ?.filter((p) => p.activo || p.id === f.proveedorId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.razonSocial} · {p.ruc}
                  </option>
                ))}
              {puedeCrearProveedor && <option value={-1}>+ Registrar proveedor nuevo…</option>}
            </select>
          </Campo>
          <Campo
            label="Concepto"
            requerido
            {...(soloPendientes ? { ayuda: "Pendientes de pago en la proforma" } : opId !== null && pendientes.size === 0 && gastosOp.data ? { ayuda: "La proforma no tiene gastos pendientes de pago" } : {})}
          >
            <select
              value={f.conceptoId}
              onChange={(e) => {
                const valor = Number(e.target.value);
                // -1 = "Otro concepto": se muestra la lista completa (queda como gasto no proformado o un segundo comprobante)
                if (valor === -1) return setTodosLosConceptos(true);
                set("conceptoId", valor);
              }}
              className={inputClass}
            >
              <option value={0}>Selecciona…</option>
              {conceptosVisibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
              {soloPendientes && <option value={-1}>Otro concepto (no está pendiente en la proforma)…</option>}
            </select>
          </Campo>
          </>
          )}
          <Campo label="Tipo de gasto" requerido>
            <select value={f.clasificacion} onChange={(e) => set("clasificacion", e.target.value as Clasificacion)} className={inputClass}>
              <option value="REEMBOLSABLE">Reembolsable al cliente</option>
              <option value="GASTO_INTERNO">Gasto interno</option>
            </select>
          </Campo>
          {f.clasificacion === "REEMBOLSABLE" ? (
            <Campo label="Subclasificación">
              <select value={f.subclasificacion} onChange={(e) => set("subclasificacion", e.target.value as Subclasificacion)} className={inputClass}>
                {SUBCLASIFICACIONES.map((s) => (
                  <option key={s} value={s}>
                    {etiqueta(s)}
                  </option>
                ))}
              </select>
            </Campo>
          ) : (
            <p className="self-end pb-2 text-xs text-slate-500">No pasa a la liquidación del cliente.</p>
          )}
          <Campo label="Tipo de comprobante">
            <select value={f.tipoComprobante} onChange={(e) => set("tipoComprobante", e.target.value as TipoComprobante | "")} className={inputClass}>
              <option value="">—</option>
              {TIPOS_COMPROBANTE.map((t) => (
                <option key={t} value={t}>
                  {etiqueta(t)}
                </option>
              ))}
            </select>
          </Campo>
          {!varios && (
          <>
          <Campo label="N.° de comprobante" {...(pago ? {} : { ayuda: "Vacío = pendiente de comprobante" })}>
            <input value={f.serieNumero} onChange={(e) => set("serieNumero", e.target.value.toUpperCase())} className={inputClass} maxLength={30} />
          </Campo>
          <Campo label="Descripción">
            <input value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} className={inputClass} maxLength={200} />
          </Campo>
          </>
          )}
          <Campo label="Moneda">
            <select value={moneda} onChange={(e) => set("moneda", e.target.value as Moneda)} className={inputClass}>
              <option value="USD">USD</option>
              <option value="PEN">S/ (soles)</option>
            </select>
          </Campo>
          {!varios && (
          <>
          <Campo label="Importe (base)" requerido>
            <input type="number" min={0} step="0.01" value={f.importe ?? ""} onChange={(e) => set("importe", numeroONulo(e.target.value))} className={inputClass} />
          </Campo>
          <Campo label="IGV">
            <div className="flex items-center gap-2">
              <input type="number" min={0} step="0.01" value={f.igv ?? ""} onChange={(e) => set("igv", numeroONulo(e.target.value))} className={inputClass} />
              <button type="button" onClick={() => set("igv", redondear((f.importe ?? 0) * tasaIgv))} className="whitespace-nowrap text-xs font-medium text-slate-700 hover:underline">
                {Math.round(tasaIgv * 100)}%
              </button>
            </div>
          </Campo>
          <Campo label="Total">
            <input disabled value={dinero(total, moneda)} className={`${inputClass} font-semibold`} />
          </Campo>
          </>
          )}
          {otraMoneda && (
            <Campo label="Tipo de cambio (S/ por USD)" requerido ayuda={`La operación está en ${opResuelta?.moneda}`}>
              <input type="number" min={0} step="0.001" value={f.tipoCambio ?? ""} onChange={(e) => set("tipoCambio", numeroONulo(e.target.value))} className={inputClass} />
            </Campo>
          )}
          <Campo label="Medio de pago">
            <select value={f.medioPago} onChange={(e) => set("medioPago", e.target.value as MedioPago)} className={inputClass}>
              {MEDIOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {etiqueta(m)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Banco">
            <input value={f.banco} onChange={(e) => set("banco", e.target.value)} list="bancos-pago" className={inputClass} maxLength={80} />
            <datalist id="bancos-pago">
              {BANCOS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Campo>
          <Campo label="N.° operación bancaria">
            <input value={f.nroOperacionBancaria} onChange={(e) => set("nroOperacionBancaria", e.target.value)} className={inputClass} maxLength={40} />
          </Campo>
          <Campo label="Observaciones" className="sm:col-span-3">
            <input value={f.observaciones} onChange={(e) => set("observaciones", e.target.value)} className={inputClass} maxLength={1000} />
          </Campo>
        </div>
      </section>

      {!varios && duplicado && (
        <Aviso tono="error" titulo="POSIBLE PAGO DUPLICADO">
          El comprobante <b>{duplicado.serieNumero}</b> de {duplicado.proveedor} (RUC {duplicado.ruc}) por <b>{dinero(duplicado.total, duplicado.moneda)}</b> ya está registrado en la
          operación <b>{duplicado.operacion}</b> ({formatearFecha(duplicado.fechaPago)}, {etiqueta(duplicado.estado).toLowerCase()}).
          {puedeForzar ? (
            <label className="mt-2 flex items-center gap-2 font-medium">
              <input type="checkbox" checked={confirmaDuplicado} onChange={(e) => setConfirmaDuplicado(e.target.checked)} />
              Confirmo que no es un duplicado y deseo guardarlo
            </label>
          ) : (
            <span className="mt-1 block">Solo quien tiene autorización para pagos duplicados puede guardarlo pese a esta alerta.</span>
          )}
        </Aviso>
      )}

      {!varios && noProformado && concepto && (
        <div className="space-y-2">
          <Aviso tono="advertencia" titulo="GASTO NO CONTEMPLADO EN LA PROFORMA">
            Concepto: <b>{concepto.nombre}</b> · Importe: <b>{dinero(total, moneda)}</b>
          </Aviso>
          <textarea
            rows={2}
            value={f.justificacion}
            onChange={(e) => set("justificacion", e.target.value)}
            placeholder="Justificación obligatoria, mínimo 10 caracteres (ej. la nave retrasó su zarpe y se generó almacenaje adicional)"
            className={inputClass}
            maxLength={1000}
          />
        </div>
      )}

      {pago && (
        <Campo label="Motivo del cambio" requerido ayuda="Queda en el historial. Si el pago estaba revisado, vuelve a revisión.">
          <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} maxLength={500} />
        </Campo>
      )}
      {nuevoProveedorPara !== null && (
        <FormularioProveedor
          onCerrar={(creado) => {
            const para = nuevoProveedorPara;
            setNuevoProveedorPara(null);
            if (!creado) return;
            if (para === "form") set("proveedorId", creado.id);
            else setMarcados((m) => (m[para] ? { ...m, [para]: { ...m[para], proveedorId: creado.id } } : m));
          }}
        />
      )}
    </Modal>
  );
}
