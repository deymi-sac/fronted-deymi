import { useMemo, useState } from "react";
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
  useIngresosDisponibles,
} from "./useAlmacen";
import { inputClass } from "./CrearClienteModal";
import { UnidadSelect } from "./AlmacenUI";
import { formatearFecha, fechaLocalHoy, fechaMasDias, tamanosTrasGrupos, errorDeSecuencia } from "./almacen.utils";
import type { ExcesoCapacidadInfo, MovimientoAlmacen } from "./almacen.api";

const NUEVO_PRODUCTO = "__nuevo__";

const MOTIVOS_INGRESO = ["N° solicitud de traslado", "Traspaso interno dentro de ZED"];
const MOTIVOS_SALIDA = ["Nacionalizada", "Reexpedición marítima", "Reexpedición terrestre", "Traspaso interno dentro de ZED"];

interface GrupoBultos {
  cantidadPallets: string;
  bultosPorPallet: string;
  // Solo en un retiro: bultos que tiene hoy el pallet del que sale (identifica el pallet).
  dePallet: string;
}

// Agrupa un detalle plano [50,50,50,20] en grupos [{cantidadPallets:3, bultosPorPallet:50}, {cantidadPallets:1, bultosPorPallet:20}].
// En un retiro, "de" trae los bultos que tenía cada pallet elegido y también separa los grupos.
function detalleAGrupos(detalle: number[], de: number[] = []): GrupoBultos[] {
  if (detalle.length === 0) return [{ cantidadPallets: "", bultosPorPallet: "", dePallet: "" }];
  const grupos: GrupoBultos[] = [];
  let i = 0;
  while (i < detalle.length) {
    let j = i;
    while (j < detalle.length && detalle[j] === detalle[i] && de[j] === de[i]) j++;
    grupos.push({
      cantidadPallets: String(j - i),
      bultosPorPallet: String(detalle[i]),
      dePallet: de[i] !== undefined ? String(de[i]) : "",
    });
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
  // Sin valor por defecto: en un Ingreso hay que elegir si es Contenedor o Carga suelta (define los días libres de cobro).
  const [modo, setModo] = useState<"" | "Contenedor" | "Carga suelta">(movimientoEditar?.modo ?? "");
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
    detalleAGrupos(movimientoEditar?.detalle_bultos_pallets ?? [], movimientoEditar?.detalle_pallets_origen ?? [])
  );
  // En un retiro de bultos sueltos: detallar cuántos bultos salen de cada pallet (opcional).
  const [retiroPorPallet, setRetiroPorPallet] = useState(
    movimientoEditar?.tipo === "Salida" && (movimientoEditar?.detalle_bultos_pallets.length ?? 0) > 0
  );
  const [mostrarDetalleBultos, setMostrarDetalleBultos] = useState(
    !!movimientoEditar?.cantidad_bultos || (movimientoEditar?.detalle_bultos_pallets.length ?? 0) > 0
  );
  const [tipoRetiro, setTipoRetiro] = useState<"pallet_completo" | "bultos_sueltos">(
    movimientoEditar?.unidad_medida === "Bultos" ? "bultos_sueltos" : "pallet_completo"
  );
  const [idDivision, setIdDivision] = useState<number | "">(movimientoEditar?.id_division ?? "");
  const [idOrigen, setIdOrigen] = useState<number | "">(movimientoEditar?.id_movimiento_origen ?? "");
  const [fecha, setFecha] = useState(() => movimientoEditar?.fecha.slice(0, 10) ?? fechaLocalHoy());
  const [observaciones, setObservaciones] = useState(movimientoEditar?.observaciones ?? "");

  const [error, setError] = useState<string | null>(null);
  const [exceso, setExceso] = useState<ExcesoCapacidadInfo | null>(null);

  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState("");
  const [errorNuevoProducto, setErrorNuevoProducto] = useState<string | null>(null);

  const { data: productosCliente } = useProductosDeCliente(idCliente === "" ? null : idCliente);

  // Al registrar una Salida, solo tiene sentido elegir una división donde el cliente
  // realmente tenga stock — evita retiros registrados en la división equivocada.
  // Un retiro de pallets o bultos se descuenta de un ingreso concreto (por su N° de declaración);
  // la división y el producto salen de ese ingreso. Los retiros en cajas/otras unidades siguen
  // eligiendo la división.
  const retiraPallets = tipo === "Salida" && unidadMedida === "Pallet";
  const retiraBultosSueltos = retiraPallets && tipoRetiro === "bultos_sueltos";
  const retiraOtraUnidad = tipo === "Salida" && unidadMedida.trim() !== "" && unidadMedida !== "Pallet";
  // Todo retiro sale de un ingreso concreto, sea en pallets, bultos, cajas u otra unidad.
  const retiraDeIngreso = retiraPallets || retiraOtraUnidad;
  const { data: ingresosCliente, isLoading: cargandoIngresos } = useIngresosDisponibles(
    retiraDeIngreso && idCliente !== "" ? idCliente : null,
    retiraOtraUnidad ? unidadMedida : undefined,
    movimientoEditar?.id_movimiento
  );
  const ingresosOpcion = (ingresosCliente ?? []).filter((i) =>
    retiraOtraUnidad ? (i.unidades_restantes ?? 0) > 0 : retiraBultosSueltos ? (i.bultos_restantes ?? 0) > 0 : i.pallets_restantes > 0
  );
  const ingresoOrigenSeleccionado = idOrigen === "" ? null : ingresosOpcion.find((i) => i.id_movimiento === idOrigen) ?? null;
  // Un retiro anterior sin ingreso asociado se puede seguir editando como estaba.
  const esRetiroAntiguo = !!movimientoEditar && movimientoEditar.tipo === "Salida" && !movimientoEditar.id_movimiento_origen;

  function elegirIngreso(valor: string) {
    const id = valor ? Number(valor) : "";
    setIdOrigen(id);
    const ingreso = ingresosOpcion.find((i) => i.id_movimiento === id);
    setIdDivision(ingreso ? ingreso.id_division : "");
    setIdProducto(ingreso?.id_producto ?? "");
    // Los pallets disponibles cambian de un ingreso a otro: se empieza el detalle de cero.
    const tamanos = ingreso?.pallets_por_bultos ?? [];
    setGruposBultos([{ cantidadPallets: "", bultosPorPallet: "", dePallet: tamanos.length === 1 ? String(tamanos[0]!.bultos) : "" }]);
  }

  const { data: stockPorDivisionCliente, isLoading: cargandoStockDivision } = useStockPorClientePorDivision(
    tipo === "Salida" && !retiraDeIngreso && idCliente !== "" ? idCliente : null
  );


  // No se puede asumir ningún patrón (un pallet puede traer 50 y otro 20, sin relación entre
  // sí), así que se agrupa por "cuántos pallets tienen tal cantidad de bultos" — mucho más
  // rápido que escribir o calcular 20-30 valores cuando en la práctica suelen venir en pocos
  // grupos (ej. "29 pallets de 50" + "1 pallet de 20").
  // Un retiro de bultos sueltos puede detallar cuántos bultos salen de cada pallet, para saber qué
  // pallets quedan vacíos (y dejan de cobrarse).
  // Es obligatorio cuando el ingreso tiene desglose por pallet (sin él no se sabría qué pallets se
  // vacían y la facturación sería imprecisa). Un retiro ya registrado sin detalle se edita como estaba.
  const salidaBultosSueltos = tipo === "Salida" && unidadMedida === "Pallet" && tipoRetiro === "bultos_sueltos";
  const ingresoConDesglose = (ingresoOrigenSeleccionado?.pallets_por_bultos?.length ?? 0) > 0;
  const detalleObligatorio =
    salidaBultosSueltos && ingresoConDesglose && (!movimientoEditar || movimientoEditar.detalle_bultos_pallets.length > 0);
  const retiroConDetalle = salidaBultosSueltos && (retiroPorPallet || detalleObligatorio);
  // De qué pallet sale cada cantidad: se elige entre los que quedan en el ingreso, por los bultos que
  // tienen hoy (un retiro anterior que no lo guardó se edita como estaba).
  const tamanosDePallet = ingresoOrigenSeleccionado?.pallets_por_bultos ?? [];
  const eligeDePallet =
    retiroConDetalle && tamanosDePallet.length > 0 && (!movimientoEditar || movimientoEditar.detalle_pallets_origen.length > 0);

  const distintoCalculo = useMemo(() => {
    if (!((tipo === "Ingreso" && palletsDistintos) || retiroConDetalle)) return null;
    const filas = gruposBultos.filter((g) => g.cantidadPallets.trim() !== "" || g.bultosPorPallet.trim() !== "");
    if (filas.length === 0) return null;
    const todasValidas = filas.every(
      (g) =>
        /^\d+$/.test(g.cantidadPallets.trim()) &&
        Number(g.cantidadPallets) > 0 &&
        (retiroConDetalle ? /^\d+$/ : /^\d+(\.\d+)?$/).test(g.bultosPorPallet.trim()) &&
        Number(g.bultosPorPallet) > 0 &&
        (!eligeDePallet || (/^\d+$/.test(g.dePallet) && Number(g.bultosPorPallet) <= Number(g.dePallet)))
    );
    if (!todasValidas) return { detalle: [], de: [], pallets: 0, invalido: true as const };
    const detalle = filas.flatMap((g) => Array(Number(g.cantidadPallets)).fill(Number(g.bultosPorPallet)));
    const de = eligeDePallet ? filas.flatMap((g) => Array(Number(g.cantidadPallets)).fill(Number(g.dePallet))) : [];
    return { pallets: detalle.length, detalle, de, total: detalle.reduce((a, b) => a + b, 0), invalido: false as const };
  }, [tipo, palletsDistintos, retiroConDetalle, eligeDePallet, gruposBultos]);

  // Pallets completos: si el ingreso tiene pallets de distintos tamaños (por sus bultos), hay que decir
  // cuáles salen; si todos son iguales no hay nada que elegir. Un retiro anterior que no lo guardó se
  // edita como estaba.
  const eligePalletsCompletos =
    tipo === "Salida" &&
    unidadMedida === "Pallet" &&
    tipoRetiro === "pallet_completo" &&
    tamanosDePallet.length >= 2 &&
    (!movimientoEditar || movimientoEditar.detalle_pallets_origen.length > 0);

  const eleccionCompletos = (() => {
    if (!eligePalletsCompletos) return null;
    const filas = gruposBultos.filter((g) => g.cantidadPallets.trim() !== "" || g.dePallet !== "");
    if (filas.length === 0) return null;
    const validas = filas.every((g) => /^\d+$/.test(g.cantidadPallets.trim()) && Number(g.cantidadPallets) > 0 && /^\d+$/.test(g.dePallet));
    if (!validas) return { de: [], pallets: 0, error: "Completa en cada grupo cuántos pallets salen y de qué pallet." };
    const pedidos = new Map<number, number>();
    for (const g of filas) pedidos.set(Number(g.dePallet), (pedidos.get(Number(g.dePallet)) ?? 0) + Number(g.cantidadPallets));
    for (const [bultos, n] of pedidos) {
      const quedan = tamanosDePallet.find((t) => t.bultos === bultos)?.pallets ?? 0;
      if (n > quedan) return { de: [], pallets: 0, error: `Solo quedan ${quedan} pallet(s) de ${bultos} bultos.` };
    }
    const de = filas.flatMap((g) => Array(Number(g.cantidadPallets)).fill(Number(g.dePallet)));
    return { de, pallets: de.length, error: null };
  })();
  const palletsCompletosListos = eleccionCompletos !== null && eleccionCompletos.error === null && eleccionCompletos.pallets > 0;

  // La "Cantidad" queda determinada por el cálculo de arriba: pallets en un ingreso, bultos retirados en un retiro.
  const cantidadEfectiva =
    distintoCalculo && !distintoCalculo.invalido
      ? String(tipo === "Ingreso" ? distintoCalculo.pallets : distintoCalculo.total)
      : palletsCompletosListos
        ? String(eleccionCompletos!.pallets)
        : cantidad;

  // Pallets que se pueden elegir en un grupo: los que quedan después de aplicar los grupos anteriores
  // (un grupo puede partir un pallet de 40 en uno de 20 y el siguiente ya puede elegirlo).
  function opcionesDeFila(i: number, g: GrupoBultos, completos: boolean) {
    const lista = tamanosTrasGrupos(tamanosDePallet, gruposBultos.slice(0, i), completos);
    return g.dePallet === "" || lista.some((t) => String(t.bultos) === g.dePallet) ? lista : [...lista, { bultos: Number(g.dePallet), pallets: 0 }];
  }
  // Primer grupo que no se puede cumplir con los pallets que quedan tras los anteriores.
  const errorSecuencia = eligeDePallet
    ? errorDeSecuencia(tamanosDePallet, gruposBultos, false)
    : eligePalletsCompletos
      ? errorDeSecuencia(tamanosDePallet, gruposBultos, true)
      : null;

  function actualizarGrupoBultos(i: number, campo: keyof GrupoBultos, valor: string) {
    setGruposBultos((prev) => prev.map((g, idx) => (idx === i ? { ...g, [campo]: valor } : g)));
  }
  function agregarGrupoBultos() {
    setGruposBultos((prev) => [
      ...prev,
      { cantidadPallets: "", bultosPorPallet: "", dePallet: tamanosDePallet.length === 1 ? String(tamanosDePallet[0]!.bultos) : "" },
    ]);
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
    setError(null);
    setMotivo(nuevo === "Ingreso" ? MOTIVOS_INGRESO[0] : MOTIVOS_SALIDA[0]);
    setExceso(null);
    setIdDivision("");
    setIdOrigen("");
  }

  // Si cambia el modo de retiro o la unidad, el ingreso elegido deja de servir.
  function limpiarOrigen() {
    setIdOrigen("");
    setIdDivision("");
    setExceso(null);
    // Los pallets que se pueden elegir dependen del ingreso: el detalle empieza de cero.
    setGruposBultos([{ cantidadPallets: "", bultosPorPallet: "", dePallet: "" }]);
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
  const usaDetalle = esIngresoConDetalle || retiroConDetalle;
  const detalleCompleto = usaDetalle && distintoCalculo !== null && !distintoCalculo.invalido && distintoCalculo.pallets > 0;
  // Si el Ingreso se registra en una unidad que no es "Pallet" (ej. 1400 Cajas), hace falta
  // que el coordinador indique explícitamente cuántos pallets ocupa esa carga — si no, no hay
  // forma de saber eso y antes se contaba por error la cantidad de cajas como si fueran pallets.
  const necesitaPalletsOcupados = tipo === "Ingreso" && unidadMedida !== "Pallet";

  // Un ingreso de contenedor tiene 21 días libres de cobro y exige su N° de contenedor. Un ingreso
  // anterior a esa regla (sin días libres) que se edita sin cambiar su tipo no lo exige ni cambia.
  const ingresoAnteriorALaRegla = editando && movimientoEditar!.tipo === "Ingreso" && movimientoEditar!.modo === "Contenedor" && movimientoEditar!.dias_libres == null;
  const requiereNumContenedor =
    tipo === "Ingreso" && modo === "Contenedor" && !(ingresoAnteriorALaRegla && movimientoEditar!.modo === modo);
  const cambiaTipoDeIngreso = editando && tipo === "Ingreso" && movimientoEditar!.tipo === "Ingreso" && modo !== movimientoEditar!.modo;

  function construirPayload(forzar: boolean) {
    return {
      tipo,
      motivo,
      id_cliente_almacen: Number(idCliente),
      id_producto: idProducto === "" ? undefined : Number(idProducto),
      id_division: Number(idDivision),
      // En un retiro el modo lo toma el servidor del ingreso del que sale.
      modo: tipo === "Ingreso" && modo !== "" ? modo : undefined,
      num_contenedor: numContenedor.trim() || undefined,
      num_declaracion: numDeclaracion.trim() || undefined,
      cantidad: Number(cantidadEfectiva),
      unidad_medida: esSalidaBultosSueltos ? "Bultos" : unidadMedida,
      pallets_ocupados: necesitaPalletsOcupados && palletsOcupados ? Number(palletsOcupados) : undefined,
      cantidad_bultos:
        esSalidaBultosSueltos
          ? Number(cantidadEfectiva)
          : tipo === "Ingreso" && !esIngresoConDetalle && cantidadBultos
            ? Number(cantidadBultos)
            : undefined,
      id_movimiento_origen: retiraDeIngreso && idOrigen !== "" ? Number(idOrigen) : undefined,
      // Al editar un retiro que tenía detalle y se desactiva, se manda vacío para borrarlo.
      detalle_bultos_pallets: detalleCompleto ? distintoCalculo!.detalle : esSalidaBultosSueltos && editando ? [] : undefined,
      ...(esSalidaBultosSueltos
        ? { detalle_pallets_origen: detalleCompleto && retiroConDetalle ? distintoCalculo!.de : editando ? [] : undefined }
        : tipo === "Salida" && unidadMedida === "Pallet"
          ? { detalle_pallets_origen: palletsCompletosListos ? eleccionCompletos!.de : editando ? [] : undefined }
          : {}),
      libera_pallet: tipo === "Salida" ? unidadMedida === "Pallet" && tipoRetiro === "pallet_completo" : undefined,
      fecha,
      observaciones: observaciones.trim() || undefined,
      forzar_exceso_capacidad: forzar,
    };
  }

  function handleSubmit(e: React.FormEvent, forzar = false) {
    e.preventDefault();
    setError(null);
    if (tipo === "Ingreso" && modo === "") {
      setError("Elige si el ingreso es de Contenedor o de Carga suelta.");
      return;
    }
    if (requiereNumContenedor && !numContenedor.trim()) {
      setError("Escribe el N° de contenedor: es obligatorio en un ingreso de contenedor.");
      return;
    }
    if (ingresoOrigenSeleccionado && fecha < ingresoOrigenSeleccionado.fecha.slice(0, 10)) {
      setError("El retiro no puede tener una fecha anterior a la del ingreso elegido.");
      return;
    }
    if (tipo === "Salida" && !retiraDeIngreso && stockPorDivisionCliente && !stockPorDivisionCliente.some((d) => d.id_division === idDivision)) {
      setError("Elige una división donde este cliente tenga stock.");
      return;
    }
    if (retiraDeIngreso && idOrigen === "" && !esRetiroAntiguo) {
      setError("Elige el ingreso (N° de declaración) del que sale este retiro.");
      return;
    }
    if (eligePalletsCompletos && !palletsCompletosListos) {
      setError(eleccionCompletos?.error ?? "Indica cuántos pallets salen de cada tipo (por los bultos que tiene cada uno).");
      return;
    }
    if (!idCliente || !idDivision || !cantidadEfectiva || Number(cantidadEfectiva) <= 0) {
      setError(
        detalleObligatorio && idCliente && idDivision
          ? "Indica cuántos pallets y cuántos bultos salen de cada uno."
          : "Cliente, división y cantidad (mayor a 0) son obligatorios."
      );
      return;
    }
    if (errorSecuencia) {
      setError(errorSecuencia);
      return;
    }
    if (usaDetalle && !detalleCompleto) {
      setError(
        retiroConDetalle
          ? detalleObligatorio
            ? "Completa los grupos: cuántos pallets y cuántos bultos salen de cada uno."
            : "Completa los grupos (cuántos pallets y cuántos bultos salen de cada uno), o desactiva el detalle de bultos por pallet."
          : "Completa los grupos de pallets (cantidad y bultos de cada uno), o desactiva \"pallets con cantidades distintas\"."
      );
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
                    setIdOrigen("");
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

            {tipo === "Ingreso" && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-600">Tipo de ingreso *</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setModo("Contenedor"); setError(null); }}
                    className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                      modo === "Contenedor" ? "border-2 border-slate-800 text-slate-800" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    Contenedor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModo("Carga suelta"); setError(null); }}
                    className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                      modo === "Carga suelta" ? "border-2 border-slate-800 text-slate-800" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    Carga suelta
                  </button>
                </div>
                {modo === "" && <p className="mt-1.5 text-xs text-slate-400">Elige una opción: define si el ingreso tiene días libres de cobro.</p>}
                {modo === "Contenedor" && !ingresoAnteriorALaRegla && (
                  <p className="mt-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    Ingreso de contenedor: <b>21 días libres</b>. No se factura el día de ingreso ni hasta el día 21; el cobro empieza el{" "}
                    <b>{formatearFecha(fechaMasDias(fecha, 21))}</b>. Si sale antes, no se cobra nada.
                  </p>
                )}
                {modo === "Contenedor" && ingresoAnteriorALaRegla && !cambiaTipoDeIngreso && (
                  <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Este ingreso se registró antes de la regla de días libres: conserva su facturación original.
                  </p>
                )}
                {cambiaTipoDeIngreso && (
                  <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Al cambiar el tipo de ingreso se modifica el cobro de este ingreso en todos los meses, también los ya facturados.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Campo label={requiereNumContenedor ? "N° de contenedor *" : "N° de contenedor"}>
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
                {unidadMedida.trim() === ""
                  ? "Elige o escribe la unidad del retiro (cajas, rollos, sacos...) para ver los ingresos de los que puede salir."
                  : `Retiro en ${unidadMedida.toLowerCase()}: se descuenta del stock de ${unidadMedida.toLowerCase()} del producto.`}
              </p>
            )}
            {tipo === "Salida" && unidadMedida === "Pallet" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-600">Tipo de retiro</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoRetiro("pallet_completo");
                        limpiarOrigen();
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        tipoRetiro === "pallet_completo" ? "border-2 border-slate-800 bg-slate-100 text-slate-800" : "border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      Pallet completo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoRetiro("bultos_sueltos");
                        limpiarOrigen();
                      }}
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
              {!(esSalidaBultosSueltos && detalleObligatorio) && !eligePalletsCompletos && (
              <Campo label={esSalidaBultosSueltos ? "Cantidad de bultos retirados *" : "Cantidad *"}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cantidadEfectiva}
                  disabled={usaDetalle}
                  onChange={(e) => {
                    setCantidad(e.target.value);
                    setExceso(null);
                  }}
                  className={`${inputClass} ${usaDetalle ? "bg-slate-100 text-slate-500" : ""}`}
                />
                {usaDetalle && (
                  <span className="mt-1 text-xs text-slate-400">
                    {retiroConDetalle ? "Suma de los bultos por pallet de abajo." : "Calculado desde el detalle de bultos de abajo."}
                  </span>
                )}
              </Campo>
              )}
              {!esSalidaBultosSueltos && (
                <Campo label="Unidad">
                  <UnidadSelect
                    value={unidadMedida}
                    onChange={(u) => {
                      setUnidadMedida(u);
                      if (tipo === "Salida") limpiarOrigen();
                    }}
                    className={inputClass}
                  />
                </Campo>
              )}
            </div>

            {eligePalletsCompletos && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-sm font-medium text-slate-600">Pallets que salen *</span>
                <p className="mt-1.5 text-xs text-slate-500">
                  Este ingreso tiene pallets con distinta cantidad de bultos. Indica cuántos salen de cada tipo, así el sistema descuenta el
                  pallet correcto.
                </p>
                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                  Quedan en este ingreso:{" "}
                  <b>{tamanosDePallet.map((g) => `${g.pallets} ${g.pallets === 1 ? "pallet" : "pallets"} de ${g.bultos} bultos`).join(" · ")}</b>
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {gruposBultos.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Pallets"
                        value={g.cantidadPallets}
                        onChange={(e) => actualizarGrupoBultos(i, "cantidadPallets", e.target.value)}
                        className={`${inputClass} flex-1`}
                      />
                      <span className="flex-shrink-0 text-xs text-slate-500">pallet(s) de</span>
                      <select
                        value={g.dePallet}
                        onChange={(e) => actualizarGrupoBultos(i, "dePallet", e.target.value)}
                        className={`${inputClass} flex-1`}
                      >
                        <option value="">Elige pallet</option>
                        {opcionesDeFila(i, g, true).map((t) => (
                          <option key={t.bultos} value={t.bultos}>
                            {t.bultos} bultos (quedan {t.pallets})
                          </option>
                        ))}
                      </select>
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
                {eleccionCompletos?.error && <p className="mt-2 text-xs text-red-600">{eleccionCompletos.error}</p>}
                {palletsCompletosListos && (
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    = {eleccionCompletos!.pallets} {eleccionCompletos!.pallets === 1 ? "pallet" : "pallets"} completos.
                  </p>
                )}
              </div>
            )}

            {esSalidaBultosSueltos && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">
                    Indicar bultos por pallet {detalleObligatorio ? "(obligatorio)" : "(opcional)"}
                  </span>
                  <input
                    type="checkbox"
                    checked={retiroConDetalle}
                    disabled={detalleObligatorio}
                    onChange={(e) => setRetiroPorPallet(e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
                <p className="mt-1.5 text-xs text-slate-500">
                  {retiroConDetalle
                    ? "Indica cuántos pallets y cuántos bultos salen de cada uno: así el sistema libera justo los pallets que quedan vacíos y deja de cobrarlos."
                    : "Sin detalle, los bultos se descuentan en orden y el sistema no sabe de qué pallets salieron."}
                </p>

                {retiroConDetalle && (
                  <div className="mt-3 flex flex-col gap-3">
                    {ingresoOrigenSeleccionado?.pallets_por_bultos && ingresoOrigenSeleccionado.pallets_por_bultos.length > 0 && (
                      <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                        Quedan en este ingreso:{" "}
                        <b>
                          {ingresoOrigenSeleccionado.pallets_por_bultos
                            .map((g) => `${g.pallets} ${g.pallets === 1 ? "pallet" : "pallets"} de ${g.bultos} bultos`)
                            .join(" · ")}
                        </b>
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      {gruposBultos.map((g, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="Pallets"
                            value={g.cantidadPallets}
                            onChange={(e) => actualizarGrupoBultos(i, "cantidadPallets", e.target.value)}
                            className={`${inputClass} flex-1`}
                          />
                          {eligeDePallet ? (
                            <>
                              <span className="flex-shrink-0 text-xs text-slate-500">pallet(s) de</span>
                              <select
                                value={g.dePallet}
                                onChange={(e) => actualizarGrupoBultos(i, "dePallet", e.target.value)}
                                className={`${inputClass} flex-1`}
                              >
                                <option value="">Elige pallet</option>
                                {opcionesDeFila(i, g, false).map((t) => (
                                  <option key={t.bultos} value={t.bultos}>
                                    {t.bultos} bultos (quedan {t.pallets})
                                  </option>
                                ))}
                              </select>
                              <span className="flex-shrink-0 text-xs text-slate-500">salen</span>
                            </>
                          ) : (
                            <span className="flex-shrink-0 text-xs text-slate-500">pallet(s), salen</span>
                          )}
                          <input
                            type="number"
                            min="0"
                            placeholder="Bultos de cada uno"
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
                      <p className="text-xs text-red-600">
                        {eligeDePallet
                          ? "Completa en cada grupo cuántos pallets, de qué pallet salen y cuántos bultos (sin pasar de los que tiene ese pallet)."
                          : "Completa pallets y bultos en cada grupo con números enteros válidos."}
                      </p>
                    )}
                    {errorSecuencia && <p className="text-xs text-red-600">{errorSecuencia}</p>}
                    {distintoCalculo && !distintoCalculo.invalido && (
                      <p className="text-xs font-medium text-slate-600">
                        = {distintoCalculo.pallets} {distintoCalculo.pallets === 1 ? "pallet" : "pallets"}, {distintoCalculo.total} bultos retirados en total.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

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
            {retiraDeIngreso && (
              <Campo label={`Sale del ingreso (N° de declaración) ${esRetiroAntiguo ? "" : "*"}`}>
                {idCliente === "" ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>Selecciona un cliente primero</option>
                  </select>
                ) : cargandoIngresos ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>Cargando...</option>
                  </select>
                ) : (
                  <select value={idOrigen} onChange={(e) => elegirIngreso(e.target.value)} className={inputClass}>
                    <option value="">
                      {ingresosOpcion.length === 0
                        ? retiraBultosSueltos
                          ? "No hay ingresos con bultos registrados para retirar"
                          : retiraOtraUnidad
                            ? `Este cliente no tiene ${unidadMedida.toLowerCase()} en almacén`
                            : "Este cliente no tiene pallets en almacén"
                        : "Selecciona..."}
                    </option>
                    {idOrigen !== "" && !ingresosOpcion.some((i) => i.id_movimiento === idOrigen) && (
                      <option value={idOrigen}>N° {movimientoEditar?.ingreso_origen_declaracion ?? "s/n"} (ingreso actual)</option>
                    )}
                    {ingresosOpcion.map((i) => (
                      <option key={i.id_movimiento} value={i.id_movimiento}>
                        {i.num_declaracion ? `N° ${i.num_declaracion}` : "Sin N°"} · {formatearFecha(i.fecha)} · {i.producto ?? "sin producto"} ·{" "}
                        {retiraOtraUnidad ? `quedan ${i.unidades_restantes} ${unidadMedida}` : `${i.pallets_restantes} pallets`}
                        {!retiraOtraUnidad && i.bultos_restantes !== null ? ` · ${i.bultos_restantes} bultos` : ""} · {i.division}
                      </option>
                    ))}
                  </select>
                )}
                <span className="mt-1 text-xs text-slate-400">
                  {retiraOtraUnidad
                    ? "La cantidad se descuenta solo de este ingreso; la división y el producto salen de él."
                    : "Los pallets y bultos se descuentan solo de este ingreso; la división y el producto salen de él."}
                </span>
              </Campo>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Campo label="División *">
                {retiraDeIngreso ? (
                  <input
                    disabled
                    value={divisiones?.find((d) => d.id_division === idDivision)?.nombre ?? "Se toma del ingreso elegido"}
                    className={`${inputClass} bg-slate-100 text-slate-500`}
                  />
                ) : tipo === "Salida" && idCliente === "" ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>Selecciona un cliente primero</option>
                  </select>
                ) : tipo === "Salida" && cargandoStockDivision ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>Cargando...</option>
                  </select>
                ) : tipo === "Salida" && stockPorDivisionCliente && stockPorDivisionCliente.length === 0 ? (
                  <select disabled className={`${inputClass} opacity-50`}>
                    <option>
                      {retiraBultosSueltos
                        ? "No hay pallets con bultos registrados para retirar"
                        : "Este cliente no tiene stock en ninguna división"}
                    </option>
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
                {fecha > fechaLocalHoy() && (
                  <span className="mt-1 text-xs font-medium text-amber-600">
                    Fecha futura: el movimiento ya se suma al stock y a los KPI hoy, aunque aún no ocurra.
                  </span>
                )}
                {ingresoOrigenSeleccionado && fecha < ingresoOrigenSeleccionado.fecha.slice(0, 10) && (
                  <span className="mt-1 text-xs font-medium text-red-600">
                    El retiro no puede ser anterior al ingreso elegido ({formatearFecha(ingresoOrigenSeleccionado.fecha)}).
                  </span>
                )}
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
