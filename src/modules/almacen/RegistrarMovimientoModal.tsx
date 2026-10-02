import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Plus, ChevronDown, ChevronRight, X } from "lucide-react";
import {
  useClientesAlmacen,
  useDivisiones,
  useProductosDeCliente,
  useCrearMovimiento,
  useActualizarMovimiento,
  useCrearProductoAlmacen,
  useStockPorClientePorDivision,
} from "./useAlmacen";
import { inputClass } from "./CrearClienteModal";
import { UnidadSelect } from "./AlmacenUI";
import type { ExcesoCapacidadInfo, MovimientoAlmacen } from "./almacen.api";

const NUEVO_PRODUCTO = "__nuevo__";

const MOTIVOS_INGRESO = ["N° solicitud de traslado", "Traspaso interno dentro de ZED"];
const MOTIVOS_SALIDA = ["Nacionalizada", "Reexpedición marítima", "Reexpedición terrestre", "Traspaso interno dentro de ZED"];

interface GrupoBultos {
  cantidadPallets: string;
  bultosPorPallet: string;
}

// Agrupa un detalle plano [50,50,50,20] en grupos [{cantidadPallets:3, bultosPorPallet:50}, {cantidadPallets:1, bultosPorPallet:20}].
function detalleAGrupos(detalle: number[]): GrupoBultos[] {
  if (detalle.length === 0) return [{ cantidadPallets: "", bultosPorPallet: "" }];
  const grupos: GrupoBultos[] = [];
  let i = 0;
  while (i < detalle.length) {
    let j = i;
    while (j < detalle.length && detalle[j] === detalle[i]) j++;
    grupos.push({ cantidadPallets: String(j - i), bultosPorPallet: String(detalle[i]) });
    i = j;
  }
  return grupos;
}

export function RegistrarMovimientoModal({
  onClose,
  movimientoEditar,
}: {
  onClose: () => void;
  movimientoEditar?: MovimientoAlmacen;
}) {
  const editando = !!movimientoEditar;
  const { data: clientes } = useClientesAlmacen(false);
  const { data: divisiones } = useDivisiones();
  const crearMovimiento = useCrearMovimiento();
  const actualizarMovimiento = useActualizarMovimiento();
  const crearProducto = useCrearProductoAlmacen();

  const [tipo, setTipo] = useState<"Ingreso" | "Salida">(movimientoEditar?.tipo ?? "Ingreso");
  const [motivo, setMotivo] = useState(movimientoEditar?.motivo ?? MOTIVOS_INGRESO[0]);
  const [idCliente, setIdCliente] = useState<number | "">(movimientoEditar?.id_cliente_almacen ?? "");
  const [idProducto, setIdProducto] = useState<number | "">(movimientoEditar?.id_producto ?? "");
  const [modo, setModo] = useState<"Contenedor" | "Carga suelta">(movimientoEditar?.modo ?? "Contenedor");
  const [numContenedor, setNumContenedor] = useState(movimientoEditar?.num_contenedor ?? "");
  const [numDeclaracion, setNumDeclaracion] = useState(movimientoEditar?.num_declaracion ?? "");
  const [cantidad, setCantidad] = useState(movimientoEditar?.cantidad ?? "");
  // Un retiro de bultos sueltos se guarda con unidad "Bultos" (los bultos no llevan unidad propia);
  // en pantalla se edita como Pallet + modo "Bultos sueltos".
  const [unidadMedida, setUnidadMedida] = useState(
    movimientoEditar?.unidad_medida === "Bultos" ? "Pallet" : movimientoEditar?.unidad_medida ?? "Pallet"
  );
  const [palletsOcupados, setPalletsOcupados] = useState(
    movimientoEditar?.pallets_ocupados != null ? String(movimientoEditar.pallets_ocupados) : ""
  );
  const [cantidadBultos, setCantidadBultos] = useState(
    movimientoEditar?.cantidad_bultos != null ? String(movimientoEditar.cantidad_bultos) : ""
  );
  const [palletsDistintos, setPalletsDistintos] = useState((movimientoEditar?.detalle_bultos_pallets.length ?? 0) > 0);
  const [gruposBultos, setGruposBultos] = useState<GrupoBultos[]>(
    detalleAGrupos(movimientoEditar?.detalle_bultos_pallets ?? [])
  );
  const [mostrarDetalleBultos, setMostrarDetalleBultos] = useState(
    !!movimientoEditar?.cantidad_bultos || (movimientoEditar?.detalle_bultos_pallets.length ?? 0) > 0
  );
  const [tipoRetiro, setTipoRetiro] = useState<"pallet_completo" | "bultos_sueltos">(
    movimientoEditar?.unidad_medida === "Bultos" ? "bultos_sueltos" : "pallet_completo"
  );
  const [idDivision, setIdDivision] = useState<number | "">(movimientoEditar?.id_division ?? "");
  const [fecha, setFecha] = useState(() => movimientoEditar?.fecha.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState(movimientoEditar?.observaciones ?? "");

  const [error, setError] = useState<string | null>(null);
  const [exceso, setExceso] = useState<ExcesoCapacidadInfo | null>(null);

  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState("");
  const [errorNuevoProducto, setErrorNuevoProducto] = useState<string | null>(null);

  const { data: productosCliente } = useProductosDeCliente(idCliente === "" ? null : idCliente);

  // Al registrar una Salida, solo tiene sentido elegir una división donde el cliente
  // realmente tenga stock — evita retiros registrados en la división equivocada.
  const { data: stockPorDivisionCliente, isLoading: cargandoStockDivision } = useStockPorClientePorDivision(
    tipo === "Salida" && idCliente !== "" ? idCliente : null
  );

  useEffect(() => {
    if (tipo !== "Salida" || idCliente === "" || !stockPorDivisionCliente) return;
    if (idDivision !== "" && !stockPorDivisionCliente.some((d) => d.id_division === idDivision)) {
      setIdDivision("");
    }
  }, [tipo, idCliente, stockPorDivisionCliente, idDivision]);

  // No se puede asumir ningún patrón (un pallet puede traer 50 y otro 20, sin relación entre
  // sí), así que se agrupa por "cuántos pallets tienen tal cantidad de bultos" — mucho más
  // rápido que escribir o calcular 20-30 valores cuando en la práctica suelen venir en pocos
  // grupos (ej. "29 pallets de 50" + "1 pallet de 20").
  const distintoCalculo = useMemo(() => {
    if (tipo !== "Ingreso" || !palletsDistintos) return null;
    const filas = gruposBultos.filter((g) => g.cantidadPallets.trim() !== "" || g.bultosPorPallet.trim() !== "");
    if (filas.length === 0) return null;
    const todasValidas = filas.every(
      (g) =>
        /^\d+$/.test(g.cantidadPallets.trim()) &&
        Number(g.cantidadPallets) > 0 &&
        /^\d+(\.\d+)?$/.test(g.bultosPorPallet.trim()) &&
        Number(g.bultosPorPallet) > 0
    );
    if (!todasValidas) return { detalle: [], pallets: 0, invalido: true as const };
    const detalle = filas.flatMap((g) => Array(Number(g.cantidadPallets)).fill(Number(g.bultosPorPallet)));
    return { pallets: detalle.length, detalle, total: detalle.reduce((a, b) => a + b, 0), invalido: false as const };
  }, [tipo, palletsDistintos, gruposBultos]);

  // La "Cantidad" de pallets queda determinada por el cálculo de arriba en este modo.
  useEffect(() => {
    if (distintoCalculo && !distintoCalculo.invalido) setCantidad(String(distintoCalculo.pallets));
  }, [distintoCalculo]);

  function actualizarGrupoBultos(i: number, campo: keyof GrupoBultos, valor: string) {
    setGruposBultos((prev) => prev.map((g, idx) => (idx === i ? { ...g, [campo]: valor } : g)));
  }
  function agregarGrupoBultos() {
    setGruposBultos((prev) => [...prev, { cantidadPallets: "", bultosPorPallet: "" }]);
  }
  function quitarGrupoBultos(i: number) {
    setGruposBultos((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function handleCrearProductoInline() {
    if (!nuevoProductoNombre.trim() || idCliente === "") return;
    setErrorNuevoProducto(null);
    crearProducto.mutate(
      { id_cliente_almacen: Number(idCliente), nombre: nuevoProductoNombre.trim() },
      {
        onSuccess: (producto) => {
          setIdProducto(producto.id_producto);
          setNuevoProductoNombre("");
          setMostrarNuevoProducto(false);
        },
        onError: (err) => {
          setErrorNuevoProducto(
            isAxiosError(err) ? err.response?.data?.error ?? "No se pudo crear el producto" : "No se pudo crear el producto"
          );
        },
      }
    );
  }

  const motivos = tipo === "Ingreso" ? MOTIVOS_INGRESO : MOTIVOS_SALIDA;

  function cambiarTipo(nuevo: "Ingreso" | "Salida") {
    setTipo(nuevo);
    setMotivo(nuevo === "Ingreso" ? MOTIVOS_INGRESO[0] : MOTIVOS_SALIDA[0]);
    setExceso(null);
    setIdDivision("");
  }

  const divisionSeleccionada = useMemo(
    () => divisiones?.find((d) => d.id_division === idDivision) ?? null,
    [divisiones, idDivision]
  );
  const stockClienteEnDivisionSeleccionada = useMemo(
    () => stockPorDivisionCliente?.find((d) => d.id_division === idDivision) ?? null,
    [stockPorDivisionCliente, idDivision]
  );

  // "Bultos sueltos" solo existe en retiros de pallets: descuenta bultos de un pallet (sin unidad)
  // y libera el pallet únicamente cuando se vacía. Un retiro en cajas/sacos/etc. descuenta unidades.
  const esSalidaBultosSueltos = tipo === "Salida" && unidadMedida === "Pallet" && tipoRetiro === "bultos_sueltos";
  const esIngresoConDetalle = tipo === "Ingreso" && palletsDistintos;
  const detalleCompleto = esIngresoConDetalle && distintoCalculo !== null && !distintoCalculo.invalido && distintoCalculo.pallets > 0;
  // Si el Ingreso se registra en una unidad que no es "Pallet" (ej. 1400 Cajas), hace falta
  // que el coordinador indique explícitamente cuántos pallets ocupa esa carga — si no, no hay
  // forma de saber eso y antes se contaba por error la cantidad de cajas como si fueran pallets.
  const necesitaPalletsOcupados = tipo === "Ingreso" && unidadMedida !== "Pallet";

  function construirPayload(forzar: boolean) {
    return {
      tipo,
      motivo,
      id_cliente_almacen: Number(idCliente),
      id_producto: idProducto === "" ? undefined : Number(idProducto),
      id_division: Number(idDivision),
      modo,
      num_contenedor: numContenedor.trim() || undefined,
      num_declaracion: numDeclaracion.trim() || undefined,
      cantidad: Number(cantidad),
      unidad_medida: esSalidaBultosSueltos ? "Bultos" : unidadMedida,
      pallets_ocupados: necesitaPalletsOcupados && palletsOcupados ? Number(palletsOcupados) : undefined,
      cantidad_bultos:
        esSalidaBultosSueltos
          ? Number(cantidad)
          : tipo === "Ingreso" && !esIngresoConDetalle && cantidadBultos
            ? Number(cantidadBultos)
            : undefined,
      detalle_bultos_pallets: detalleCompleto ? distintoCalculo!.detalle : undefined,
      libera_pallet: tipo === "Salida" ? unidadMedida === "Pallet" && tipoRetiro === "pallet_completo" : undefined,
      fecha,
      observaciones: observaciones.trim() || undefined,
      forzar_exceso_capacidad: forzar,
    };
  }

  function handleSubmit(e: React.FormEvent, forzar = false) {
    e.preventDefault();
    setError(null);
    if (!idCliente || !idDivision || !cantidad || Number(cantidad) <= 0) {
      setError("Cliente, división y cantidad (mayor a 0) son obligatorios.");
      return;
    }
    if (esIngresoConDetalle && !detalleCompleto) {
      setError("Completa los grupos de pallets (cantidad y bultos de cada uno), o desactiva \"pallets con cantidades distintas\".");
      return;
    }

    if (editando) {
      actualizarMovimiento.mutate(
        { id: movimientoEditar!.id_movimiento, payload: construirPayload(true) },
        {
          onSuccess: onClose,
          onError: (err) => {
            setError(isAxiosError(err) ? err.response?.data?.error ?? "No se pudo actualizar el movimiento" : "No se pudo actualizar el movimiento");
          },
        }
      );
      return;
    }

    crearMovimiento.mutate(construirPayload(forzar), {
      onSuccess: onClose,
      onError: (err) => {
        if (isAxiosError(err) && err.response?.status === 409 && err.response.data?.requiere_confirmacion) {
          setExceso(err.response.data as ExcesoCapacidadInfo);
          return;
        }
        setError(isAxiosError(err) ? err.response?.data?.error ?? "No se pudo registrar el movimiento" : "No se pudo registrar el movimiento");
      },
    });
  }

  const guardando = crearMovimiento.isPending || actualizarMovimiento.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-800">{editando ? "Editar movimiento" : "Registrar movimiento"}</h2>
          <p className="mt-1 text-sm text-slate-500">Ingreso o salida de mercadería del almacén.</p>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-6 py-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <Seccion titulo="Datos generales">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Tipo de movimiento</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cambiarTipo("Ingreso")}
                  className={`rounded-xl border py-3 text-sm font-semibold transition ${
                    tipo === "Ingreso" ? "border-2 border-green-600 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => cambiarTipo("Salida")}
                  className={`rounded-xl border py-3 text-sm font-semibold transition ${
                    tipo === "Salida" ? "border-2 border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  Salida
                </button>
              </div>
            </div>

            <Campo label={`Motivo de ${tipo.toLowerCase()} *`}>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass}>
                {motivos.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Campo>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Cliente *">
                <select
                  value={idCliente}
                  onChange={(e) => {
                    setIdCliente(e.target.value ? Number(e.target.value) : "");
                    setIdProducto("");
                    setIdDivision("");
                    setMostrarNuevoProducto(false);
                    setNuevoProductoNombre("");
                  }}
                  className={inputClass}
                >
                  <option value="">Selecciona...</option>
                  {clientes?.map((c) => (
                    <option key={c.id_cliente_almacen} value={c.id_cliente_almacen}>
                      {c.razon_social}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Producto">
                <select
                  value={idProducto}
                  onChange={(e) => {
                    if (e.target.value === NUEVO_PRODUCTO) {
                      setIdProducto("");
                      setMostrarNuevoProducto(true);
                      return;
                    }
                    setMostrarNuevoProducto(false);
                    setIdProducto(e.target.value ? Number(e.target.value) : "");
                  }}
                  disabled={idCliente === ""}
                  className={inputClass}
                >
                  <option value="">Selecciona...</option>
                  {productosCliente?.map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>
                      {p.nombre}
                    </option>
                  ))}
                  <option value={NUEVO_PRODUCTO}>+ Nuevo producto...</option>
                </select>
              </Campo>
            </div>

            {mostrarNuevoProducto && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Nuevo producto para este cliente</p>
                {errorNuevoProducto && <p className="mb-2 text-sm text-red-600">{errorNuevoProducto}</p>}
                <input
                  autoFocus
                  value={nuevoProductoNombre}
                  onChange={(e) => setNuevoProductoNombre(e.target.value)}
                  placeholder="Nombre del producto nuevo"
                  className={`${inputClass} mb-2 w-full`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCrearProductoInline}
                    disabled={crearProducto.isPending || !nuevoProductoNombre.trim()}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Plus size={15} /> Agregar
                  </button>
                </div>
              </div>
            )}

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Modo</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setModo("Contenedor")}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                    modo === "Contenedor" ? "border-2 border-slate-800 text-slate-800" : "border-slate-200 text-slate-500"
                  }`}
                >
                  Contenedor
                </button>
                <button
                  type="button"
                  onClick={() => setModo("Carga suelta")}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                    modo === "Carga suelta" ? "border-2 border-slate-800 text-slate-800" : "border-slate-200 text-slate-500"
                  }`}
                >
                  Carga suelta
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="N° de contenedor">
                <input value={numContenedor} onChange={(e) => setNumContenedor(e.target.value)} className={inputClass} placeholder="HLBU2680426" />
              </Campo>
              <Campo label="N° Declaración / Traspaso">
                <input value={numDeclaracion} onChange={(e) => setNumDeclaracion(e.target.value)} className={inputClass} placeholder="Texto libre" />
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Cantidad y bultos">
            {tipo === "Salida" && unidadMedida !== "Pallet" && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                Retiro en {unidadMedida.toLowerCase()}: se descuenta del stock de {unidadMedida.toLowerCase()} del producto.
              </p>
            )}
            {tipo === "Salida" && unidadMedida === "Pallet" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-600">Tipo de retiro</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoRetiro("pallet_completo")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        tipoRetiro === "pallet_completo" ? "border-2 border-slate-800 bg-slate-100 text-slate-800" : "border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      Pallet completo
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoRetiro("bultos_sueltos")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        tipoRetiro === "bultos_sueltos" ? "border-2 border-slate-800 bg-slate-100 text-slate-800" : "border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      Bultos sueltos
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {tipoRetiro === "pallet_completo"
                    ? "La cantidad de abajo son pallets enteros que se retiran."
                    : "La cantidad de abajo son bultos retirados; el pallet se libera solo cuando se vacía por completo."}
                </p>
              </div>
            )}

            <div className={`grid gap-4 ${esSalidaBultosSueltos ? "grid-cols-1" : "grid-cols-2"}`}>
              <Campo label={esSalidaBultosSueltos ? "Cantidad de bultos retirados *" : "Cantidad *"}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cantidad}
                  disabled={esIngresoConDetalle}
                  onChange={(e) => {
                    setCantidad(e.target.value);
                    setExceso(null);
                  }}
                  className={`${inputClass} ${esIngresoConDetalle ? "bg-slate-100 text-slate-500" : ""}`}
                />
                {esIngresoConDetalle && (
                  <span className="mt-1 text-xs text-slate-400">Calculado desde el detalle de bultos de abajo.</span>
                )}
              </Campo>
              {!esSalidaBultosSueltos && (
                <Campo label="Unidad">
                  <UnidadSelect value={unidadMedida} onChange={setUnidadMedida} className={inputClass} />
                </Campo>
              )}
            </div>

            {necesitaPalletsOcupados && (
              <Campo label="Pallets que ocupa (opcional)">
                <input
                  type="number"
                  min="0"
                  value={palletsOcupados}
                  onChange={(e) => setPalletsOcupados(e.target.value)}
                  className={`${inputClass} max-w-[160px]`}
                />
                <span className="mt-1 text-xs text-slate-400">
                  Opcional. Cada {unidadMedida.toLowerCase().replace(/s$/, "")} ingresada ya cuenta como un pallet ocupado en el control
                  diario de facturación; este dato es solo referencia.
                </span>
              </Campo>
            )}

            {tipo === "Ingreso" && !necesitaPalletsOcupados && (
              <div>
                <button
                  type="button"
                  onClick={() => setMostrarDetalleBultos((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  {mostrarDetalleBultos ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Detalle de bultos (opcional) — para calcular retiros parciales más adelante
                </button>

                {mostrarDetalleBultos && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <label className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600">¿Los pallets traen cantidades distintas de bultos?</span>
                      <input
                        type="checkbox"
                        checked={palletsDistintos}
                        onChange={(e) => setPalletsDistintos(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </label>

                    {!palletsDistintos ? (
                      <Campo label="Bultos por pallet">
                        <input type="number" min="0" value={cantidadBultos} onChange={(e) => setCantidadBultos(e.target.value)} className={`${inputClass} max-w-[200px]`} />
                      </Campo>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-slate-500">
                          Agrupa los pallets por cuántos bultos trae cada uno, ej. "29 pallets de 50 bultos" + "1 pallet de 20 bultos".
                        </p>
                        <div className="flex flex-col gap-2">
                          {gruposBultos.map((g, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="Cantidad de pallets"
                                value={g.cantidadPallets}
                                onChange={(e) => actualizarGrupoBultos(i, "cantidadPallets", e.target.value)}
                                className={`${inputClass} flex-1`}
                              />
                              <span className="flex-shrink-0 text-xs text-slate-500">pallet(s) de</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="Bultos c/u"
                                value={g.bultosPorPallet}
                                onChange={(e) => actualizarGrupoBultos(i, "bultosPorPallet", e.target.value)}
                                className={`${inputClass} flex-1`}
                              />
                              <button
                                type="button"
                                onClick={() => quitarGrupoBultos(i)}
                                disabled={gruposBultos.length <= 1}
                                className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={agregarGrupoBultos}
                            className="flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            <Plus size={13} /> Agregar grupo
                          </button>
                        </div>
                        {distintoCalculo?.invalido && (
                          <p className="text-xs text-red-600">Completa cantidad y bultos en cada grupo con números válidos.</p>
                        )}
                        {distintoCalculo && !distintoCalculo.invalido && (
                          <p className="text-xs font-medium text-slate-600">
                            = {distintoCalculo.pallets} pallets, {distintoCalculo.total} bultos en total.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Seccion>

          <Seccion titulo="Ubicación y fecha">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="División *">
                {tipo === "Salida" && idCliente === "" ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>Selecciona un cliente primero</option>
                  </select>
                ) : tipo === "Salida" && cargandoStockDivision ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>Cargando...</option>
                  </select>
                ) : tipo === "Salida" && stockPorDivisionCliente && stockPorDivisionCliente.length === 0 ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>Este cliente no tiene stock en ninguna división</option>
                  </select>
                ) : (
                  <select value={idDivision} onChange={(e) => { setIdDivision(e.target.value ? Number(e.target.value) : ""); setExceso(null); }} className={inputClass}>
                    <option value="">Selecciona...</option>
                    {(tipo === "Salida" ? stockPorDivisionCliente ?? [] : divisiones ?? []).map((d) => (
                      <option key={d.id_division} value={d.id_division}>
                        {d.nombre}
                        {tipo === "Salida" && "pallets" in d && d.pallets > 0 ? ` (${d.pallets} pallets de este cliente)` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {tipo === "Salida" && stockClienteEnDivisionSeleccionada && stockClienteEnDivisionSeleccionada.pallets > 0 && (
                  <span className="mt-1 text-xs text-slate-400">
                    Este cliente tiene {stockClienteEnDivisionSeleccionada.pallets} pallets ahí.
                  </span>
                )}
                {tipo === "Ingreso" && divisionSeleccionada?.capacidad_maxima && (
                  <span className="mt-1 text-xs text-slate-400">
                    Ocupación actual: {divisionSeleccionada.ocupacion_actual ?? 0}/{divisionSeleccionada.capacidad_maxima} pallets
                  </span>
                )}
              </Campo>
              <Campo label="Fecha *">
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
              </Campo>
            </div>

            <Campo label="Observaciones">
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={`${inputClass} h-16 resize-none`} />
            </Campo>
          </Seccion>

          {exceso && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">La división está al límite de su capacidad</p>
              <p className="mt-1 text-xs text-amber-800">
                Ocupación actual: {exceso.ocupacion_actual} / {exceso.capacidad_maxima} pallets. Esta cantidad ({exceso.cantidad_solicitada})
                la superaría. Se puede registrar igual, pero queda marcado para revisión.
              </p>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="mt-2 rounded-lg border border-amber-800 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Registrar de todas formas
              </button>
            </div>
          )}
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">Queda registrado como aprobado por ti.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={guardando}
              className="rounded-lg bg-[#18193B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#242550] disabled:opacity-50"
            >
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : `Registrar ${tipo.toLowerCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h3>
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
