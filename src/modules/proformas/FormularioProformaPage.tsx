import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Trash2, X } from "lucide-react";
import { useCatalogos, useClientes, useConceptos, useEmpresa } from "../maestros/useMaestros";
import { FormularioCliente, FormularioConcepto, FormularioItemCatalogo } from "../maestros/FormulariosMaestros";
import { BuscadorConcepto } from "./BuscadorConcepto";
import { avisarPasoProforma } from "./pasoProforma";
import {
  crearProforma, editarProforma, listarTarifasParaProforma, obtenerTarifaParaProforma, useProforma, useTarifasParaProforma,
  type DatosLineaProforma, type DatosProforma, type Proforma, type TarifaAplicable,
} from "./proformas.api";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { Campo } from "../../components/ui/FormularioModal";
import { CampoBuscable } from "../../components/ui/CampoBuscable";
import { btnPrimario, inputClass } from "../../lib/estilos";
import { calcularCif, calcularLinea, totalesLineas, tramoAplicable } from "../../lib/calculoProforma";
import { dinero, etiqueta, redondear } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { fechaLocalHoy } from "../almacen/almacen.utils";
import { tienePermiso } from "../auth/auth.utils";
import { CampoMotivoCambio } from "../../components/ui/MotivoCambio";
import type { Concepto, ItemCatalogo, Moneda, TipoCatalogo } from "../maestros/maestros.api";
import type { Unidad, Via } from "../tarifas/tarifas.api";

const numeroONulo = (v: string) => (v === "" ? null : Number(v));

type Cabecera = Omit<DatosProforma, "lineas" | "moneda" | "condiciones" | "clienteId" | "fecha" | "ordenServicio" | "dam"> & {
  fecha: string;
  /** Si ya se tiene; al convertir pasa a la operación */
  dam: string;
  clienteId: number | null;
  ordenServicio: string;
  /** null = la de la tarifa (o la del cliente si no hay tarifa) */
  moneda: Moneda | null;
  /** null = las condiciones por defecto de la empresa */
  condiciones: string | null;
};

/** Una línea en pantalla. `cantidad` solo cuenta si `cantidadManual`; si no, sale de la carga. */
type Fila = Omit<DatosLineaProforma, "descripcion"> & {
  clave: string;
  /** Ya está en una factura vigente: se muestra pero no se cambia ni se quita */
  facturadaEn?: string | null;
  cantidadManual: boolean;
  especial: boolean;
  /** Solo para mostrar: el texto del tarifario o el guardado (el backend lo vuelve a tomar de la tarifa) */
  texto?: string | null;
};

const vacia = (): Cabecera => ({
  fecha: fechaLocalHoy(),
  dam: "",
  clienteId: null,
  ordenServicio: "",
  tipoOperacion: "IMPORTACION",
  via: "MARITIMA",
  tarifaId: null,
  regimenId: null,
  aduanaId: null,
  puertoId: null,
  lineaNavieraId: null,
  terminalId: null,
  almacenId: null,
  tipoCargaId: null,
  tipoContenedorId: null,
  cantidadContenedores: 1,
  pesoKg: null,
  valorFob: null,
  valorFlete: null,
  valorSeguro: null,
  valorCif: null,
  moneda: null,
  tipoCambio: null,
  condiciones: null,
  validezDias: 15,
});

/** Cantidad que sale de la carga según la unidad (contenedores, kg, toneladas). */
function cantidadAuto(unidad: Unidad, c: Cabecera) {
  if (unidad === "CONTENEDOR") return Math.max(c.cantidadContenedores ?? 0, 1);
  // Los contenedores después del primero (0 si es uno solo)
  if (unidad === "CONT_ADICIONAL") return Math.max((c.cantidadContenedores ?? 0) - 1, 0);
  if (unidad === "KG") return c.pesoKg || 1;
  if (unidad === "TONELADA") return c.pesoKg ? redondear(c.pesoKg / 1000) : 1;
  return 1;
}

/** Lo que se envía de cada línea: la descripción la arma el backend según el cálculo. */
const aDatos = (f: Fila, c: Cabecera): DatosLineaProforma => ({
  ...(f.id != null && { id: f.id }),
  conceptoId: f.conceptoId,
  tarifaDetalleId: f.tarifaDetalleId,
  tipoCalculo: f.tipoCalculo,
  unidad: f.unidad,
  cantidad: f.cantidadManual ? f.cantidad : cantidadAuto(f.unidad, c),
  importe: f.importe,
  porcentaje: f.porcentaje,
  basePorcentaje: f.basePorcentaje,
  tramos: f.tipoCalculo === "TRAMOS" ? f.tramos : null,
  incluyeIgv: f.incluyeIgv,
  montoMinimo: f.montoMinimo,
  montoMaximo: f.montoMaximo,
  monedaOrigen: f.monedaOrigen,
  ...(f.afectoIgv !== undefined && { afectoIgv: f.afectoIgv }),
  costoUnitario: f.costoUnitario,
  proveedorId: f.proveedorId ?? null,
});

function filasDesdeTarifa(t: TarifaAplicable): Fila[] {
  return t.detalle.map((d) => ({
    clave: `t${d.id}`,
    tarifaDetalleId: d.id,
    conceptoId: d.conceptoId,
    texto: d.descripcion,
    tipoCalculo: d.tipoCalculo,
    unidad: d.unidad,
    cantidad: 1,
    cantidadManual: false,
    importe: d.importe,
    porcentaje: d.porcentaje,
    basePorcentaje: d.basePorcentaje,
    tramos: d.tramos,
    // Las tarifas con "precios con IGV incluido" pasan el importe como total
    incluyeIgv: t.preciosIncluyenIgv,
    montoMinimo: d.montoMinimo,
    montoMaximo: d.montoMaximo,
    monedaOrigen: d.moneda ?? t.moneda,
    costoUnitario: d.costoUnitario,
    proveedorId: d.proveedorId,
    especial: d.precioEspecialId !== null,
  }));
}

/**
 * Reconstruye cómo se calculó cada línea guardada. La API guarda los montos ya convertidos a la
 * moneda de la proforma; los que estaban en otra moneda se vuelven a la original con el tipo de cambio.
 */
function filasDesdeProforma(p: Proforma, cab: Cabecera): Fila[] {
  return p.lineas.map((l) => {
    const origen = l.monedaOrigen && l.monedaOrigen !== p.moneda ? l.monedaOrigen : null;
    const aOrigen = (n: number | null | undefined) => {
      if (n == null) return null;
      if (!origen || !p.tipoCambio) return n;
      return redondear(origen === "USD" ? n / p.tipoCambio : n * p.tipoCambio);
    };
    const porcentaje = l.tipoCalculo === "PORCENTAJE";
    const sobreValor = porcentaje || l.tipoCalculo === "TRAMOS";
    const base = /% CIF/.test(l.descripcion) ? "CIF" : /% FOB/.test(l.descripcion) ? "FOB" : l.baseCalculo === p.valorCif && p.valorCif !== p.valorFob ? "CIF" : "FOB";
    return {
      clave: `g${l.id}`,
      id: l.id,
      facturadaEn: l.facturadaEn ?? null,
      tarifaDetalleId: l.tarifaDetalleId,
      conceptoId: l.conceptoId,
      texto: l.descripcion,
      tipoCalculo: l.tipoCalculo,
      unidad: l.unidad,
      cantidad: l.cantidad,
      cantidadManual: l.tipoCalculo === "POR_UNIDAD" && l.cantidad !== cantidadAuto(l.unidad, cab),
      // Con IGV incluido el importe original es el total de la línea (lo guardado es sin IGV)
      importe: sobreValor ? null : origen ? l.importeOrigen : l.incluyeIgv ? redondear(l.total / (l.cantidad || 1)) : l.precioUnitario,
      porcentaje: porcentaje ? l.porcentaje : null,
      basePorcentaje: sobreValor ? base : null,
      tramos: l.tramos,
      incluyeIgv: l.incluyeIgv,
      montoMinimo: sobreValor && origen ? l.importeOrigen : aOrigen(l.montoMinimo),
      montoMaximo: aOrigen(l.montoMaximo),
      monedaOrigen: origen,
      afectoIgv: l.afectoIgv,
      costoUnitario: aOrigen(l.costoUnitario),
      proveedorId: l.proveedorId ?? null,
      especial: false,
      // Lo facturado se muestra con el monto guardado, aunque cambie el CIF
      ...(l.facturadaEn && {
        tipoCalculo: "POR_UNIDAD" as const, cantidadManual: true, porcentaje: null, basePorcentaje: null, tramos: null,
        importe: l.incluyeIgv ? redondear(l.total / (l.cantidad || 1)) : l.precioUnitario, montoMinimo: null, montoMaximo: null, monedaOrigen: null,
      }),
    };
  });
}

function cabeceraDesdeProforma(p: Proforma): Cabecera {
  return {
    fecha: p.fecha,
    dam: p.dam ?? "",
    clienteId: p.clienteId,
    ordenServicio: p.ordenServicio ?? "",
    tipoOperacion: p.tipoOperacion,
    via: p.via,
    tarifaId: p.tarifaId,
    regimenId: p.regimenId,
    aduanaId: p.aduanaId,
    puertoId: p.puertoId,
    lineaNavieraId: p.lineaNavieraId,
    terminalId: p.terminalId,
    almacenId: p.almacenId,
    tipoCargaId: p.tipoCargaId,
    tipoContenedorId: p.tipoContenedorId,
    cantidadContenedores: p.cantidadContenedores,
    pesoKg: p.pesoKg,
    valorFob: p.valorFob,
    valorFlete: p.valorFlete,
    valorSeguro: p.valorSeguro,
    valorCif: p.valorCif,
    moneda: p.moneda,
    tipoCambio: p.tipoCambio,
    condiciones: p.condiciones ?? "",
    validezDias: p.validezDias,
  };
}

/** /comercial/proformas/nueva y /comercial/proformas/:id/editar */
export default function FormularioProformaPage() {
  const { id } = useParams();
  const editando = id ? Number(id) : null;
  const { data: proforma, error } = useProforma(editando);

  if (editando === null) return <Formulario />;
  if (error) {
    return (
      <Pagina volverA="/comercial/proformas" titulo="Editar proforma">
        <Aviso tono="error" titulo="No se pudo cargar la proforma">
          La proforma no existe o no tienes acceso.
        </Aviso>
      </Pagina>
    );
  }
  if (!proforma) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
  const convertidaEditable = proforma.estado === "CONVERTIDA" && !proforma.edicionBloqueada;
  if (proforma.estado !== "BORRADOR" && !convertidaEditable) {
    return (
      <Pagina volverA={`/comercial/proformas/${proforma.id}`} titulo={`Editar ${proforma.numero}`}>
        <Aviso tono="advertencia" titulo={`La proforma está ${etiqueta(proforma.estado).toLowerCase()}`}>
          {proforma.estado === "CONVERTIDA"
            ? `Ya no se edita: ${proforma.edicionBloqueada}.`
            : "Solo se edita en borrador. Vuélvela a borrador desde su detalle para cambiarla."}
        </Aviso>
      </Pagina>
    );
  }
  return <Formulario key={proforma.id} inicial={proforma} />;
}

function Pagina({ volverA, titulo, subtitulo, children }: { volverA: string; titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina volverA={volverA} titulo={titulo} {...(subtitulo && { subtitulo: <span className="block max-w-3xl">{subtitulo}</span> })} />
      {children}
    </div>
  );
}

type CampoCatalogo = "regimenId" | "aduanaId" | "puertoId" | "lineaNavieraId" | "terminalId" | "almacenId" | "tipoCargaId" | "tipoContenedorId";
type Creando =
  | { tipo: "cliente"; texto: string }
  | { tipo: "concepto"; texto: string }
  | { tipo: "catalogo"; catalogo: TipoCatalogo; campo: CampoCatalogo; texto: string };

function Formulario({ inicial }: { inicial?: Proforma }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: clientes } = useClientes();
  const { data: conceptos } = useConceptos();
  const { data: cat } = useCatalogos();
  const { data: empresa } = useEmpresa();
  // El backend es quien decide qué datos devuelve; aquí solo se evita mostrar columnas vacías
  const verMargen = tienePermiso("proformas_margen");

  const [c, setC] = useState<Cabecera>(() => (inicial ? cabeceraDesdeProforma(inicial) : vacia()));
  const [filas, setFilas] = useState<Fila[]>(() => (inicial ? filasDesdeProforma(inicial, cabeceraDesdeProforma(inicial)) : []));
  /** Al editar: los conceptos son los guardados, todavía no se cargó otra tarifa */
  const [guardados, setGuardados] = useState(!!inicial);
  const [nuevas, setNuevas] = useState(0);
  /** La tarifa la elige quien arma la proforma; al editar, la guardada */
  const [tarifa, setTarifa] = useState<{ id: number; nombre: string; moneda: Moneda } | null>(() =>
    inicial?.tarifaId ? { id: inicial.tarifaId, nombre: inicial.tarifa ?? "Tarifa guardada", moneda: inicial.moneda } : null
  );
  const [cargandoTarifa, setCargandoTarifa] = useState(false);
  /** Corrección de una proforma cuya operación ya está liquidada o facturada */
  const pideMotivo = inicial?.edicionConMotivo ?? null;
  const [motivo, setMotivo] = useState("");
  /** Lo que no existe y se está creando desde aquí */
  const [creando, setCreando] = useState<Creando | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cliente = clientes?.find((x) => x.id === c.clienteId);
  const { data: tarifas } = useTarifasParaProforma({ clienteId: c.clienteId, fecha: c.fecha });

  /** Los conceptos de la tarifa reemplazan a los de la anterior; los agregados a mano se conservan. */
  async function cargarTarifa(id: number, clienteId: number | null) {
    setCargandoTarifa(true);
    setAviso(null);
    try {
      const t = await obtenerTarifaParaProforma(id, { clienteId, fecha: c.fecha });
      setGuardados(false);
      setFilas((fs) => [
        ...(t ? filasDesdeTarifa(t).filter((n) => !fs.some((f) => f.facturadaEn && f.conceptoId === n.conceptoId)) : []),
        ...fs.filter((f) => f.tarifaDetalleId === null || f.facturadaEn),
      ]);
      setTarifa(t && { id: t.id, nombre: t.nombre, moneda: t.moneda });
      setC((x) => ({ ...x, tarifaId: t?.id ?? null }));
      if (!t) setAviso("Esa tarifa no se puede usar para este cliente o fecha: se quitaron sus conceptos");
    } catch (e) {
      setAviso(mensajeDeError(e));
    } finally {
      setCargandoTarifa(false);
    }
  }

  /** La tarifa que se cargó sola (no la eligió nadie): se puede cambiar sola por otra más precisa */
  const tarifaAutomatica = useRef<number | null>(null);

  /**
   * Proforma nueva: la tarifa propia del cliente para ese régimen se carga sola con todos sus servicios.
   * Si hay una de la naviera elegida, esa; si no, la general (sin naviera). Si la tarifa se cargó sola, se cambia sola
   * por otra más precisa. Al cambiar de naviera (`porNaviera`) se cambia aunque se haya elegido a mano: se quita y se
   * pone la de esa naviera (o se quita si era de otra y no hay ninguna).
   */
  async function tarifaDelRegimen(
    clienteId: number | null,
    regimenId: number | null,
    aduanaId: number | null = c.aduanaId ?? null,
    navieraId: number | null = c.lineaNavieraId ?? null,
    via: Via = c.via,
    porNaviera = false
  ) {
    if (inicial || !clienteId) return;
    if (tarifa && !porNaviera && tarifa.id !== tarifaAutomatica.current) return;
    try {
      const lista = await listarTarifasParaProforma({ clienteId, fecha: c.fecha });
      const candidatas = regimenId
        ? lista.filter(
            // Misma vía; con aduana o naviera elegida, solo las de esa aduana/naviera (o sin ella)
            (x) =>
              x.clienteId === clienteId &&
              x.regimenId === regimenId &&
              x.via === via &&
              (!aduanaId || !x.aduanaId || x.aduanaId === aduanaId) &&
              (!navieraId || !x.lineaNavieraId || x.lineaNavieraId === navieraId)
          )
        : [];
      // Gana la de la naviera elegida; si no hay, la general (sin naviera); si solo hay una, esa
      const deLaNaviera = navieraId ? candidatas.filter((x) => x.lineaNavieraId === navieraId) : [];
      const generales = candidatas.filter((x) => !x.lineaNavieraId);
      const elegida =
        deLaNaviera.length === 1 ? deLaNaviera[0] : generales.length === 1 ? generales[0] : candidatas.length === 1 ? candidatas[0] : null;
      if (elegida && elegida.id !== tarifa?.id) {
        const reemplaza = !!tarifa;
        await cargarTarifa(elegida.id, clienteId);
        tarifaAutomatica.current = elegida.id;
        setAviso(
          reemplaza
            ? `Se cambió la tarifa por "${elegida.nombre}", la que corresponde. Revisa los precios antes de guardar.`
            : `Se cargó sola la tarifa "${elegida.nombre}". Revisa los precios antes de guardar.`
        );
      } else if (!elegida && porNaviera && tarifa) {
        // La cargada es de otra naviera y para esta no hay: se quita
        const navieraDeLaCargada = lista.find((x) => x.id === tarifa.id)?.lineaNavieraId ?? null;
        if (navieraDeLaCargada && navieraDeLaCargada !== navieraId) {
          quitarTarifa();
          setAviso(`Se quitó la tarifa "${tarifa.nombre}" porque es de otra naviera. Elige la tarifa o agrega los conceptos.`);
        }
      }
    } catch {
      // Si no se pudo consultar, se elige a mano como siempre
    }
  }

  function quitarTarifa() {
    tarifaAutomatica.current = null;
    setFilas((fs) => fs.filter((f) => f.tarifaDetalleId === null || f.facturadaEn));
    setTarifa(null);
    setC((x) => ({ ...x, tarifaId: null }));
  }

  function cambiarCliente(clienteId: number | null) {
    cambiar("clienteId", clienteId);
    // Otro cliente: sus precios especiales, o la tarifa ya no le corresponde
    if (tarifa) void cargarTarifa(tarifa.id, clienteId);
    else void tarifaDelRegimen(clienteId, c.regimenId);
  }

  const moneda: Moneda = c.moneda ?? tarifa?.moneda ?? cliente?.moneda ?? "USD";
  const ctx = { moneda, tipoCambio: c.tipoCambio, valorFob: c.valorFob, valorCif: c.valorCif, tasaIgv: empresa?.tasaIgv ?? 0.18 };
  const lineas = filas.map((f) => {
    const datos = aDatos(f, c);
    return { fila: f, datos, calculo: calcularLinea(datos, ctx, conceptos?.find((x) => x.id === f.conceptoId)) };
  });
  const t = totalesLineas(lineas.map((l) => l.calculo));
  const elegidaEnLista = tarifas?.find((x) => x.id === tarifa?.id);
  const regimenElegido = cat?.regimenes.find((r: ItemCatalogo) => r.id === c.regimenId);
  const tarifaDistinta = elegidaEnLista && (elegidaEnLista.tipoOperacion !== c.tipoOperacion || elegidaEnLista.via !== c.via) ? elegidaEnLista : null;
  const otraMoneda = filas.some((f) => f.monedaOrigen && f.monedaOrigen !== moneda);

  function cambiar<K extends keyof Cabecera>(campo: K, valor: Cabecera[K]) {
    setC((x) => {
      const n = { ...x, [campo]: valor, ...(campo === "via" && valor !== "MARITIMA" && { lineaNavieraId: null }) };
      // El "1 contenedor" por defecto es de la vía marítima: en terrestre o aérea no sale en la proforma si no se escribe
      if (campo === "via") {
        if (valor !== "MARITIMA" && x.cantidadContenedores === 1 && !x.tipoContenedorId) n.cantidadContenedores = null;
        if (valor === "MARITIMA" && x.cantidadContenedores == null) n.cantidadContenedores = 1;
      }
      // El régimen define si es importación o exportación
      if (campo === "regimenId") {
        const tipo = cat?.regimenes.find((r: ItemCatalogo) => r.id === valor)?.tipoOperacion;
        if (tipo) n.tipoOperacion = tipo;
      }
      // En importación el CIF no se escribe: sale del FOB, el flete y el seguro
      return n.tipoOperacion === "IMPORTACION" ? { ...n, valorCif: calcularCif(n.valorFob, n.valorFlete, n.valorSeguro) } : n;
    });
    if (campo === "regimenId") void tarifaDelRegimen(c.clienteId, valor as number | null);
    // Si con el régimen había varias (ej. una por naviera), al elegir aduana o naviera puede quedar una sola
    if (campo === "aduanaId") void tarifaDelRegimen(c.clienteId, c.regimenId ?? null, valor as number | null);
    if (campo === "lineaNavieraId") void tarifaDelRegimen(c.clienteId, c.regimenId ?? null, c.aduanaId ?? null, valor as number | null, c.via, true);
    if (campo === "via") void tarifaDelRegimen(c.clienteId, c.regimenId ?? null, c.aduanaId ?? null, valor === "MARITIMA" ? (c.lineaNavieraId ?? null) : null, valor as Via);
  }
  const editarFila = (clave: string, cambio: Partial<Fila>) => setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  function cambiarCantidad(f: Fila, cantidad: number | null) {
    // Una línea fija con cantidad pasa a cobrarse por unidad
    editarFila(f.clave, { cantidad: cantidad ?? 0, cantidadManual: true, ...(f.tipoCalculo === "FIJO" && { tipoCalculo: "POR_UNIDAD" }) });
  }

  function agregarExtra(conceptoExtra: number, recien?: Concepto) {
    // Con precio de lista (ej. servicios adicionales), la línea ya sale con ese precio
    const sugerido = recien ?? conceptos?.find((x) => x.id === conceptoExtra);
    const precio = sugerido?.precioSugerido ?? null;
    setFilas((fs) => [
      ...fs,
      {
        clave: `m${nuevas}`, tarifaDetalleId: null, conceptoId: conceptoExtra, tipoCalculo: "FIJO", unidad: "OPERACION", cantidad: 1,
        cantidadManual: false, importe: precio ?? 0, porcentaje: null, basePorcentaje: null, tramos: null,
        incluyeIgv: precio != null && !!sugerido?.precioIncluyeIgv, montoMinimo: null, montoMaximo: null,
        monedaOrigen: precio != null && sugerido!.precioMoneda !== moneda ? sugerido!.precioMoneda : null, costoUnitario: null, especial: false,
      },
    ]);
    setNuevas((n) => n + 1);
  }

  const guardar = useMutation({
    mutationFn: (d: DatosProforma) => (inicial ? editarProforma(inicial.id, d) : crearProforma(d)),
    onSuccess: (p) => {
      qc.setQueryData(["proformas", p.id], p);
      qc.invalidateQueries({ queryKey: ["proformas"] });
      navigate(`/comercial/proformas/${p.id}`);
      avisarPasoProforma(p);
    },
    onError: (e) => setAviso(mensajeDeError(e)),
  });

  function generar() {
    setAviso(null);
    if (!c.clienteId) return setAviso("Selecciona un cliente");
    if (!c.regimenId) return setAviso("Elige el régimen aduanero");
    if (!regimenElegido?.tipoOperacion) return setAviso("El régimen no dice si es importación o exportación: complétalo en Maestros > Catálogos");
    if (filas.length === 0) return setAviso("La proforma no tiene conceptos");
    if (otraMoneda && !c.tipoCambio) return setAviso("Hay conceptos en otra moneda: indica el tipo de cambio");
    if (pideMotivo && motivo.trim().length < 5) return setAviso("Indica el motivo del cambio");
    const { condiciones, ...cab } = c;
    guardar.mutate({
      ...cab,
      ...(pideMotivo && { motivo: motivo.trim() }),
      clienteId: c.clienteId,
      ordenServicio: c.ordenServicio.trim() || null,
      dam: c.dam.trim() || null,
      moneda,
      tipoCambio: c.tipoCambio || null,
      ...(condiciones !== null && { condiciones }),
      // Con cantidad 0 no se cobra (ej. contenedor adicional en una operación de un solo contenedor)
      lineas: lineas.map((l) => l.datos).filter((d) => d.cantidad > 0),
    });
  }

  const opciones = (tipo: TipoCatalogo, actual: number | null) =>
    (cat?.[tipo] ?? [])
      .filter((i: ItemCatalogo) => i.activo || i.id === actual)
      .map((i) => ({ id: i.id, texto: i.codigo ? `${i.codigo} · ${i.nombre}` : i.nombre }));
  const sel = (campo: CampoCatalogo, tipo: TipoCatalogo, disabled = false) => (
    <CampoBuscable
      valor={c[campo] ?? null} opciones={opciones(tipo, c[campo] ?? null)} disabled={disabled} onCambiar={(id) => cambiar(campo, id)}
      onCrear={(texto) => setCreando({ tipo: "catalogo", catalogo: tipo, campo, texto })}
    />
  );
  const numero = (campo: "cantidadContenedores" | "pesoKg" | "valorFob" | "valorFlete" | "valorSeguro" | "valorCif" | "tipoCambio", step = "0.01") => (
    <input type="number" min={0} step={step} value={c[campo] ?? ""} onChange={(e) => cambiar(campo, numeroONulo(e.target.value))} className={inputClass} />
  );
  const celda = `${inputClass} px-2! py-1.5! text-right`;

  return (
    <Pagina
      titulo={inicial ? `Editar ${inicial.numero}` : "Nueva proforma"}
      subtitulo="Elige la tarifa o agrega los conceptos; los precios se pueden cambiar aquí mismo. El total final lo calcula el sistema al guardar."
      volverA={inicial ? `/comercial/proformas/${inicial.id}` : "/comercial/proformas"}
    >
      {inicial?.operacion && (
        <div className="mb-6 space-y-3">
          <Aviso tono="exito" titulo={`Esta proforma ya es la operación ${inicial.operacion.numero}`}>
            Los cambios de régimen, vía, aduana, puerto, naviera, terminal, almacén, moneda y la DAM pasan también a la operación. El cliente no se cambia.
            Se pueden agregar servicios extraordinarios; lo ya facturado se queda como está y lo nuevo sale en la siguiente factura.
          </Aviso>
          {pideMotivo && (
            <Aviso tono="advertencia" titulo="Corrección con motivo">
              Como {pideMotivo}, al guardar se pide el motivo del cambio. La liquidación y las facturas ya emitidas no cambian solas: si el cambio las afecta,
              reabre la liquidación (o anula y vuelve a emitir la factura).
            </Aviso>
          )}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Tarjeta titulo="Cliente">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Cliente" requerido className="sm:col-span-2">
                <CampoBuscable
                  ariaLabel="Cliente" valor={c.clienteId} placeholder="Selecciona un cliente…" onCambiar={cambiarCliente} disabled={!!inicial?.operacion}
                  opciones={(clientes ?? []).filter((x) => x.activo || x.id === c.clienteId).map((x) => ({ id: x.id, texto: `${x.razonSocial} · ${x.numeroDocumento}` }))}
                  onCrear={(texto) => setCreando({ tipo: "cliente", texto })}
                />
              </Campo>
              {cliente && (
                <div className="grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:col-span-2 sm:grid-cols-3">
                  <span>Contacto: <b className="text-slate-800">{cliente.contacto || "—"}</b></span>
                  <span>Correo: <b className="text-slate-800">{cliente.correo || "—"}</b></span>
                  <span>Teléfono: <b className="text-slate-800">{cliente.telefono || "—"}</b></span>
                  <span>Tipo: <b className="text-slate-800">{etiqueta(cliente.tipoCliente)}</b></span>
                  <span>Condición: <b className="text-slate-800">{cliente.condicionCredito === "CREDITO" ? `Crédito ${cliente.diasCredito} días` : "Contado"}</b></span>
                  <span>Moneda: <b className="text-slate-800">{cliente.moneda}</b></span>
                </div>
              )}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Datos de la operación">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo
                label="Régimen aduanero"
                requerido
                ayuda={regimenElegido ? (regimenElegido.tipoOperacion ? `Es de ${etiqueta(regimenElegido.tipoOperacion).toLowerCase()}` : "Sin tipo: complétalo en Maestros > Catálogos") : undefined}
              >
                {sel("regimenId", "regimenes")}
              </Campo>
              <Campo label="Vía" requerido>
                <select value={c.via} onChange={(e) => cambiar("via", e.target.value as Via)} className={inputClass}>
                  <option value="MARITIMA">Marítima</option>
                  <option value="AEREA">Aérea</option>
                  <option value="TERRESTRE">Terrestre</option>
                </select>
              </Campo>
              <Campo label="Línea naviera">{sel("lineaNavieraId", "lineas-navieras", c.via !== "MARITIMA")}</Campo>
              <Campo label="Aduana">{sel("aduanaId", "aduanas")}</Campo>
              <Campo label="Terminal">{sel("terminalId", "terminales")}</Campo>
              <Campo label="Tipo de contenedor">{sel("tipoContenedorId", "tipos-contenedor")}</Campo>
              <Campo label="Puerto">{sel("puertoId", "puertos")}</Campo>
              <Campo label="Almacén">{sel("almacenId", "almacenes")}</Campo>
              <Campo label="Tipo de carga">{sel("tipoCargaId", "tipos-carga")}</Campo>
              <Campo label="N.° de contenedores">{numero("cantidadContenedores", "1")}</Campo>
              <Campo label="Peso (kg)">{numero("pesoKg")}</Campo>
              <Campo label="Valor FOB">{numero("valorFob")}</Campo>
              {c.tipoOperacion === "IMPORTACION" ? (
                <>
                  <Campo label="Flete">{numero("valorFlete")}</Campo>
                  <Campo label="Seguro">{numero("valorSeguro")}</Campo>
                  <Campo label="Valor CIF" ayuda="FOB + flete + seguro">
                    <input value={c.valorCif ?? ""} readOnly disabled className={`${inputClass} bg-slate-50 font-semibold`} />
                  </Campo>
                </>
              ) : (
                <Campo label="Valor CIF">{numero("valorCif")}</Campo>
              )}
              <Campo label="Orden de servicio">
                <input value={c.ordenServicio} onChange={(e) => cambiar("ordenServicio", e.target.value)} className={inputClass} placeholder="OS-0000" maxLength={30} />
              </Campo>
              <Campo label="DAM" ayuda={inicial?.operacion ? `Se guarda en la operación ${inicial.operacion.numero}` : "Si ya la tienes; al convertir pasa a la operación"}>
                <input value={c.dam} onChange={(e) => cambiar("dam", e.target.value.toUpperCase())} className={inputClass} placeholder="118-2026-10-000000" maxLength={40} />
              </Campo>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Conceptos de la proforma" sinPadding>
            <div className="border-b border-slate-100 p-4">
              <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <CampoBuscable
                  ariaLabel="Tarifa" valor={null} quitable={false} placeholder="Buscar tarifa… (escribe el nombre)" disabled={cargandoTarifa}
                  onCambiar={(id) => id !== null && void cargarTarifa(id, c.clienteId)}
                  opciones={[...(tarifas ?? [])]
                    // Primero las de este cliente y las de esta operación
                    .sort((a, b) => Number(b.clienteId !== null) - Number(a.clienteId !== null) || Number(b.tipoOperacion === c.tipoOperacion && b.via === c.via) - Number(a.tipoOperacion === c.tipoOperacion && a.via === c.via))
                    .map((x) => ({ id: x.id, texto: x.nombre, detalle: [etiqueta(x.tipoOperacion), etiqueta(x.via), x.aduana, x.regimen, x.tipoCarga, x.lineaNaviera, x.preciosIncluyenIgv && "IGV incluido"].filter(Boolean).join(" · ") }))}
                />
                {tarifa && (
                  <span className="inline-flex max-w-sm items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    <span className="truncate" title={tarifa.nombre}>{tarifa.nombre}</span>
                    <button type="button" onClick={quitarTarifa} aria-label="Quitar tarifa" title="Quitar la tarifa y sus conceptos" className="rounded-full p-0.5 hover:bg-sky-100"><X size={13} /></button>
                  </span>
                )}
              </div>
              {!c.clienteId && <p className="mt-2 text-xs text-slate-400">Elige el cliente para ver también sus tarifas propias.</p>}
              {tarifaDistinta && (
                <div className="mt-3">
                  <Aviso tono="advertencia" titulo="La tarifa es de otra operación">
                    Revisa el régimen y la vía: la tarifa elegida es de {etiqueta(tarifaDistinta.tipoOperacion).toLowerCase()} {etiqueta(tarifaDistinta.via).toLowerCase()}.
                  </Aviso>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 text-left">Concepto</th>
                    <th className="w-24 px-2 py-2 text-right">Cant.</th>
                    <th className="w-36 px-2 py-2 text-right">Precio</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                    <th className="px-4 py-2 text-right">IGV</th>
                    {verMargen && <th className="px-4 py-2 text-right">Costo</th>}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">{cargandoTarifa ? "Cargando la tarifa…" : "Busca una tarifa o agrega los conceptos abajo"}</td>
                    </tr>
                  )}
                  {lineas.map(({ fila: f, datos, calculo: r }) => {
                    const concepto = conceptos?.find((x) => x.id === f.conceptoId);
                    const enOtra = f.monedaOrigen && f.monedaOrigen !== moneda ? f.monedaOrigen : null;
                    const reglas = [
                      enOtra && `en ${enOtra}`,
                      f.tipoCalculo === "POR_UNIDAD" && `por ${etiqueta(f.unidad).toLowerCase()}`,
                      f.incluyeIgv && concepto?.afectoIgv && "IGV incluido",
                      f.montoMinimo != null && `mín. ${f.montoMinimo}`,
                      f.montoMaximo != null && `máx. ${f.montoMaximo}`,
                    ].filter(Boolean);
                    return (
                      <tr key={f.clave} className="align-top">
                        <td className="px-4 py-2">
                          <p className="font-medium text-slate-800">{f.texto ?? concepto?.nombre ?? `Concepto ${f.conceptoId}`}</p>
                          <p className="text-xs text-slate-400">
                            {concepto?.tipo === "SERVICIO_PROPIO" ? "Servicio propio" : "Gasto de tercero"}
                            {f.tarifaDetalleId === null && !guardados && " · agregado a mano"}
                            {f.especial && <span className="font-medium text-violet-600"> · precio especial del cliente</span>}
                            {f.facturadaEn && <span className="font-medium text-emerald-700"> · facturado en {f.facturadaEn} (no se cambia)</span>}
                          </p>
                        </td>
                        <td className="px-2 py-2">
                          {f.tipoCalculo === "PORCENTAJE" || f.tipoCalculo === "TRAMOS" ? (
                            <p className="py-1.5 text-right text-slate-400">1</p>
                          ) : (
                            <input
                              type="number" min={0} step="any" aria-label="Cantidad" className={celda} disabled={!!f.facturadaEn}
                              value={datos.cantidad} onChange={(e) => cambiarCantidad(f, numeroONulo(e.target.value))}
                            />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {f.tipoCalculo === "TRAMOS" ? (
                            <>
                              {/* Por tramos sale solo; si se escribe otro monto, la línea pasa a ese monto fijo */}
                              <input
                                type="number" min={0} step="0.01" aria-label="Precio unitario" className={celda}
                                value={f.incluyeIgv && (datos.afectoIgv ?? concepto?.afectoIgv) ? r.total : r.precioUnitario}
                                onChange={(e) => editarFila(f.clave, { tipoCalculo: "FIJO", importe: numeroONulo(e.target.value), tramos: null, basePorcentaje: null, porcentaje: null, montoMinimo: null, montoMaximo: null, monedaOrigen: null })}
                              />
                              <TramoAplicado fila={f} cabecera={c} />
                            </>
                          ) : f.tipoCalculo === "PORCENTAJE" ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number" min={0} step="0.01" aria-label="Porcentaje" className={celda}
                                value={f.porcentaje ?? ""} onChange={(e) => editarFila(f.clave, { porcentaje: numeroONulo(e.target.value) })}
                              />
                              <span className="whitespace-nowrap text-xs text-slate-500">% {f.basePorcentaje}</span>
                            </div>
                          ) : (
                            <input
                              type="number" min={0} step="0.01" aria-label="Precio unitario" className={celda} disabled={!!f.facturadaEn}
                              value={f.importe ?? ""} onChange={(e) => editarFila(f.clave, { importe: numeroONulo(e.target.value) })}
                            />
                          )}
                          {reglas.length > 0 && <p className="mt-0.5 text-right text-[11px] text-slate-400">{reglas.join(" · ")}</p>}
                        </td>
                        <td className="px-4 py-2 text-right">{r.sinTipoCambio ? "—" : dinero(r.subtotal, moneda)}</td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          <p>{r.igv ? dinero(r.igv, moneda) : "—"}</p>
                          {/* Viene del concepto; se puede quitar en la línea (ej. cliente del exterior) */}
                          <label className="mt-1 inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-400">
                            <input
                              type="checkbox" checked={datos.afectoIgv ?? concepto?.afectoIgv ?? false} disabled={!!f.facturadaEn}
                              onChange={(e) => editarFila(f.clave, { afectoIgv: e.target.checked })}
                            />
                            Afecto a IGV
                          </label>
                        </td>
                        {verMargen && <td className="px-4 py-2 text-right text-slate-500">{dinero(r.costoTotal, moneda)}</td>}
                        <td className="px-2 py-2">
                          {!f.facturadaEn && (
                            <button
                              type="button"
                              onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Quitar concepto"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-4">
              <BuscadorConcepto
                conceptos={conceptos?.filter((x) => x.activo) ?? []} onElegir={agregarExtra}
                onCrear={(texto) => setCreando({ tipo: "concepto", texto })}
              />
            </div>
          </Tarjeta>
        </div>

        <div className="space-y-6">
          <Tarjeta titulo="Resumen" className="xl:sticky xl:top-4">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Campo label="Moneda">
                <select value={moneda} onChange={(e) => cambiar("moneda", e.target.value as Moneda)} className={inputClass}>
                  <option value="USD">USD</option>
                  <option value="PEN">PEN</option>
                </select>
              </Campo>
              <Campo label="Fecha">
                <input type="date" value={c.fecha} onChange={(e) => cambiar("fecha", e.target.value || fechaLocalHoy())} className={inputClass} />
              </Campo>
              {(otraMoneda || c.tipoCambio) && (
                <Campo label="Tipo de cambio (S/ por USD)" requerido={otraMoneda} className="col-span-2">
                  {numero("tipoCambio", "0.001")}
                </Campo>
              )}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Conceptos</dt><dd>{filas.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{dinero(t.subtotal, moneda)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-slate-500">IGV ({Math.round(ctx.tasaIgv * 100)}%)</dt>
                <dd>{dinero(t.igv, moneda)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{dinero(t.total, moneda)}</dd>
              </div>
              {verMargen && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="mb-1 font-semibold text-slate-600">Uso interno (no sale en el PDF)</p>
                  <div className="flex justify-between"><span>Costo estimado</span><span>{dinero(t.costoTotal, moneda)}</span></div>
                  <div className={`flex justify-between font-semibold ${t.subtotal - t.costoTotal >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    <span>Margen estimado</span><span>{dinero(redondear(t.subtotal - t.costoTotal), moneda)}</span>
                  </div>
                </div>
              )}
            </dl>
            {otraMoneda && !c.tipoCambio && <p className="mt-2 text-xs text-amber-700">Hay conceptos en otra moneda: sin tipo de cambio no se suman.</p>}

            <div className="mt-4 space-y-3">
              <Campo label="Validez (días)">
                <input
                  type="number" min={1} max={365} value={c.validezDias}
                  onChange={(e) => cambiar("validezDias", Number(e.target.value) || 15)} className={inputClass}
                />
              </Campo>
              <Campo label="Condiciones comerciales" ayuda={c.condiciones === null ? "Las condiciones por defecto de la empresa" : undefined}>
                <textarea
                  rows={4} value={c.condiciones ?? empresa?.pieProforma ?? ""} maxLength={4000}
                  onChange={(e) => cambiar("condiciones", e.target.value)} className={inputClass}
                />
              </Campo>
            </div>

            {pideMotivo && (
              <div className="mt-4">
                <CampoMotivoCambio razon={pideMotivo} valor={motivo} onCambiar={setMotivo} className="" />
              </div>
            )}
            {aviso && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{aviso}</p>}
            <button type="button" onClick={generar} disabled={guardar.isPending} className={`${btnPrimario} mt-4 w-full justify-center py-2.5`}>
              <FileCheck2 size={16} /> {guardar.isPending ? "Guardando…" : inicial ? "GUARDAR CAMBIOS" : "GENERAR PROFORMA"}
            </button>
          </Tarjeta>
        </div>
      </div>
      {creando?.tipo === "cliente" && (
        <FormularioCliente nombreInicial={creando.texto} onCreado={(n) => cambiarCliente(n.id)} onCerrar={() => setCreando(null)} />
      )}
      {creando?.tipo === "concepto" && (
        <FormularioConcepto nombreInicial={creando.texto} onCreado={(n) => agregarExtra(n.id, n)} onCerrar={() => setCreando(null)} />
      )}
      {creando?.tipo === "catalogo" && (
        <FormularioItemCatalogo tipo={creando.catalogo} nombreInicial={creando.texto} onCreado={(n) => cambiar(creando.campo, n.id)} onCerrar={() => setCreando(null)} />
      )}
    </Pagina>
  );
}

/** Qué tramo de la tabla se aplica con el FOB/CIF actual (se recalcula solo al cambiar el valor). */
function TramoAplicado({ fila: f, cabecera: c }: { fila: Fila; cabecera: Cabecera }) {
  const base = (f.basePorcentaje === "CIF" ? c.valorCif : c.valorFob) ?? 0;
  const tramo = f.tramos?.length ? tramoAplicable(f.tramos, base) : undefined;
  return (
    <p className="py-1.5 text-right text-xs text-slate-600" title={`Tabla de ${f.tramos?.length ?? 0} tramos sobre el ${f.basePorcentaje}`}>
      {!tramo ? "Sin tramos" : tramo.porcentaje != null ? `${tramo.porcentaje} % ${f.basePorcentaje}` : `Fijo ${tramo.importe}`}
      <span className="block text-[11px] text-slate-400">por tramos de {f.basePorcentaje}</span>
    </p>
  );
}
