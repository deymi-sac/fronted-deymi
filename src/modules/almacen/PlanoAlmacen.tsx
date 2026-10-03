import { useMemo, useState } from "react";
import { History, Info, LayoutGrid, Truck } from "lucide-react";
import { useDetalleOcupacionDivision, useActualizarCapacidad } from "./useAlmacen";
import type { DivisionAlmacen, ClienteEnDivision } from "./almacen.api";

// Plano del almacén (PI-ALM-001). Cada zona se pinta según su % de ocupación real y dibuja una
// posición por cada pallet de capacidad (ocupadas con el color del cliente, libres vacías).
// La disposición de las zonas y el orden de las posiciones son ilustrativos: el sistema no guarda
// la posición exacta de cada pallet.
const PALETA = ["#1e3a8a", "#b91c1c", "#047857", "#b45309", "#6d28d9", "#0e7490", "#9d174d", "#4d7c0f", "#475569"];
const colorCliente = (id: number) => PALETA[id % PALETA.length];
const MAX_POSICIONES = 600;

function estilo(pct: number | null) {
  if (pct === null) return { acento: "border-l-slate-300", pill: "border-slate-200 bg-slate-50 text-slate-500", barra: "bg-slate-300", texto: "text-slate-500", color: "#94a3b8", estado: "Sin capacidad definida" };
  if (pct >= 90) return { acento: "border-l-red-500", pill: "border-red-200 bg-red-50 text-red-700", barra: "bg-red-500", texto: "text-red-700", color: "#ef4444", estado: "Crítica" };
  if (pct >= 60) return { acento: "border-l-amber-500", pill: "border-amber-200 bg-amber-50 text-amber-700", barra: "bg-amber-500", texto: "text-amber-700", color: "#f59e0b", estado: "Alta" };
  return { acento: "border-l-emerald-500", pill: "border-emerald-200 bg-emerald-50 text-emerald-700", barra: "bg-emerald-500", texto: "text-emerald-700", color: "#10b981", estado: "Disponible" };
}

// Indicador circular de ocupación de la zona seleccionada.
function Medidor({ pct, color }: { pct: number | null; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const lleno = Math.min(100, pct ?? 0);
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
      <circle cx="30" cy="30" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(lleno / 100) * c} ${c}`}
        transform="rotate(-90 30 30)"
      />
      <text x="30" y="34" textAnchor="middle" className="fill-slate-800 text-[12px] font-semibold">
        {pct !== null ? `${pct}%` : "—"}
      </text>
    </svg>
  );
}

type Posicion = { id: number; nombre: string; unidad?: string } | null;
type Tipo = "piso" | "mitades" | "racks";

const totalUnidades = (c: ClienteEnDivision) => Object.values(c.unidades ?? {}).reduce((a, b) => a + b, 0);
const textoUnidades = (c: ClienteEnDivision) =>
  Object.entries(c.unidades ?? {})
    .map(([u, n]) => `${n} ${u.toLowerCase()}`)
    .join(" · ");

// Una posición por pallet: primero las ocupadas (agrupadas por cliente) y luego las libres.
// Las cajas y otras unidades no se dibujan en el plano: se avisan aparte y salen en el panel.
function armarPosiciones(clientes: ClienteEnDivision[], capacidad: number | null): Posicion[] {
  const ocupadas: NonNullable<Posicion>[] = clientes.flatMap((c) =>
    Array.from({ length: c.pallets }, () => ({ id: c.id_cliente_almacen, nombre: c.razon_social }))
  );
  const total = Math.min(Math.max(capacidad ?? 0, ocupadas.length), MAX_POSICIONES);
  return Array.from({ length: total }, (_, i) => ocupadas[i] ?? null);
}

function Posiciones({ posiciones, foco, ancho = "w-4", alto = "h-3" }: { posiciones: Posicion[]; foco: number | null; ancho?: string; alto?: string }) {
  return (
    <>
      {posiciones.map((p, i) => (
        <span
          key={i}
          title={p ? p.nombre : "Posición libre"}
          className={`${alto} ${ancho} rounded-[3px] ${p ? "shadow-sm ring-1 ring-black/15" : "border border-slate-300/80 bg-slate-100/70"}`}
          style={
            p
              ? {
                  backgroundColor: colorCliente(p.id),
                  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 55%, rgba(0,0,0,.14) 100%)",
                  opacity: foco === null || foco === p.id ? 1 : 0.15,
                }
              : undefined
          }
        />
      ))}
    </>
  );
}

// Un rack: estructura azul con vigas naranjas y varios niveles; las posiciones se reparten en los niveles.
const NIVELES_RACK = 3;
const NUM_RACKS = 4;
const PALLETS_POR_NIVEL = 8;
const CAPACIDAD_RACKS = NUM_RACKS * NIVELES_RACK * PALLETS_POR_NIVEL; // 4 racks × 3 niveles × 8 pallets = 96
function ModuloRack({ numero, posiciones, porNivel, foco }: { numero: number; posiciones: Posicion[]; porNivel: number; foco: number | null }) {
  const ocupados = posiciones.filter(Boolean).length;
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between px-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Rack {numero}</p>
        <p className="text-[10px] text-slate-400">
          {ocupados}/{posiciones.length}
        </p>
      </div>
      {/* Parantes azules a los lados y una viga naranja bajo cada nivel (el nivel 1 es el de abajo). */}
      <div className="flex rounded-[3px] bg-blue-900/5">
        <div className="w-1.5 shrink-0 rounded-l-[3px] bg-gradient-to-r from-blue-800 to-blue-600" />
        <div className="flex min-w-0 flex-1 flex-col-reverse gap-0 px-[3px]">
          {Array.from({ length: NIVELES_RACK }, (_, nivel) => (
            <div key={nivel} className="border-b-[4px] border-orange-500 py-[3px] first:border-b-[5px]">
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${porNivel}, minmax(0, 1fr))` }}>
                <Posiciones posiciones={posiciones.slice(nivel * porNivel, (nivel + 1) * porNivel)} foco={foco} ancho="w-full" alto="h-3" />
              </div>
            </div>
          ))}
        </div>
        <div className="w-1.5 shrink-0 rounded-r-[3px] bg-gradient-to-l from-blue-800 to-blue-600" />
      </div>
    </div>
  );
}
// En los pasillos también se pueden dejar pallets cuando los racks se llenan.
function Pasillo({ rotulo = false, posiciones = [], foco = null }: { rotulo?: boolean; posiciones?: Posicion[]; foco?: number | null }) {
  return (
    <div
      className="flex w-12 shrink-0 flex-col items-center gap-1 self-stretch border-x-2 border-dashed border-amber-400/70 py-1"
      style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(148,163,184,.14) 0 6px, transparent 6px 12px)" }}
      title={posiciones.length > 0 ? `Pasillo · ${posiciones.length} pallets` : "Pasillo"}
    >
      {rotulo && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-400 [writing-mode:vertical-rl]">
          Pasillo{posiciones.length > 0 ? ` · ${posiciones.length}` : ""}
        </span>
      )}
      {posiciones.length > 0 && (
        <div className="flex flex-wrap justify-center gap-[3px] px-0.5">
          <Posiciones posiciones={posiciones} foco={foco} ancho="w-4" alto="h-2.5" />
        </div>
      )}
    </div>
  );
}

function Zona({
  division,
  detalle,
  seleccionada,
  foco,
  onSeleccionar,
  clase = "",
  tipo,
}: {
  division: DivisionAlmacen | undefined;
  detalle: ClienteEnDivision[];
  seleccionada: boolean;
  foco: number | null;
  onSeleccionar: () => void;
  clase?: string;
  tipo: Tipo;
}) {
  const capacidad = division?.capacidad_maxima ?? null;

  // Los racks tienen una capacidad física fija (4 racks × 3 niveles × 8 pallets), distinta de la capacidad configurada.
  const posiciones = useMemo(
    () => armarPosiciones(detalle, tipo === "racks" ? CAPACIDAD_RACKS : capacidad),
    [detalle, capacidad, tipo]
  );

  // Almacén 2 son dos sectores contiguos: los clientes se reparten equilibrando los pallets de cada lado.
  const mitades = useMemo(() => {
    if (tipo !== "mitades") return null;
    const lados: { clientes: ClienteEnDivision[]; pallets: number }[] = [
      { clientes: [], pallets: 0 },
      { clientes: [], pallets: 0 },
    ];
    for (const c of [...detalle].sort((a, b) => b.pallets - a.pallets)) {
      const lado = lados[0].pallets <= lados[1].pallets ? lados[0] : lados[1];
      lado.clientes.push(c);
      lado.pallets += c.pallets;
    }
    const mitad = capacidad ? Math.ceil(capacidad / 2) : null;
    return lados.map((l) => ({ ...l, posiciones: armarPosiciones(l.clientes, mitad) }));
  }, [tipo, detalle, capacidad]);

  if (!division) return <div className={`bg-white ${clase}`} />;
  const ocupacion = division.ocupacion_actual ?? 0;
  const pct = capacidad ? Math.round((ocupacion / capacidad) * 100) : null;
  const e = estilo(pct);

  // Cada rack tiene 3 niveles de 8 pallets (24); lo que exceda los 96 de los racks queda en los pasillos.
  const enRacks = tipo === "racks" ? posiciones.slice(0, CAPACIDAD_RACKS) : [];
  const enPasillos = tipo === "racks" ? posiciones.slice(CAPACIDAD_RACKS) : [];
  const porRack = NIVELES_RACK * PALLETS_POR_NIVEL;
  const porNivelRack = PALLETS_POR_NIVEL;
  const modulos = tipo === "racks" ? Array.from({ length: NUM_RACKS }, (_, i) => enRacks.slice(i * porRack, (i + 1) * porRack)) : [];
  const pasilloA = enPasillos.slice(0, Math.ceil(enPasillos.length / 2));
  const pasilloB = enPasillos.slice(Math.ceil(enPasillos.length / 2));
  return (
    <button
      type="button"
      onClick={onSeleccionar}
      className={`flex flex-col gap-3 border-l-4 bg-white p-4 text-left transition ${e.acento} ${
        seleccionada ? "relative z-10 shadow-lg ring-2 ring-slate-900" : "hover:bg-slate-50"
      } ${clase}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{division.nombre}</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">
            {tipo === "racks" ? "Almacenamiento en racks" : tipo === "mitades" ? "Dos sectores" : "Piso"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <p className="text-2xl font-semibold leading-none text-slate-900">
            {ocupacion}
            <span className="ml-1 text-xs font-normal text-slate-400">{capacidad ? `/ ${capacidad}` : "pallets"}</span>
          </p>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${e.pill}`}>
            {pct !== null ? `${pct}% · ` : ""}
            {e.estado}
          </span>
        </div>
      </div>

      <div
        className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.12) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {posiciones.length === 0 && <p className="py-2 text-xs text-slate-400">Sin posiciones registradas</p>}

        {tipo === "piso" && (
          <div className="flex flex-wrap content-start gap-[3px]">
            <Posiciones posiciones={posiciones} foco={foco} />
          </div>
        )}

        {tipo === "mitades" && mitades && (
          <div className="flex">
            {mitades.map((m, i) => (
              <div key={i} className="contents">
                {i > 0 && <Pasillo />}
                <div className="min-w-0 flex-1 px-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Sector {i === 0 ? "A" : "B"} · {m.pallets} pallets
                  </p>
                  <div className="flex flex-wrap content-start gap-[3px]">
                    <Posiciones posiciones={m.posiciones} foco={foco} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tipo === "racks" && (
          <div className="flex">
            {modulos.map((m, i) => (
              <div key={i} className="contents">
                {/* Los racks 2 y 3 van juntos; el resto se separa con pasillos. */}
                {(i === 1 || i === 3) && <Pasillo rotulo posiciones={i === 1 ? pasilloA : pasilloB} foco={foco} />}
                {i === 2 && <div className="w-1 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <ModuloRack numero={i + 1} posiciones={m} porNivel={porNivelRack} foco={foco} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${e.barra}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
      </div>
    </button>
  );
}

// Capacidad máxima de la zona: se edita aquí mismo (queda registrada en el historial).
function CapacidadZona({
  division,
  puedeOperar,
  onVerHistorial,
}: {
  division: DivisionAlmacen;
  puedeOperar: boolean;
  onVerHistorial: (d: DivisionAlmacen) => void;
}) {
  const actualizar = useActualizarCapacidad();
  const [valor, setValor] = useState(division.capacidad_maxima != null ? String(division.capacidad_maxima) : "");

  function guardar() {
    const n = Number(valor);
    if (valor.trim() === "" || isNaN(n) || n < 0) {
      alert("Ingresa un número válido de posiciones/pallets.");
      return;
    }
    actualizar.mutate({ id_division: division.id_division, capacidad_maxima: n });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">Capacidad máxima</span>
      {puedeOperar ? (
        <>
          <input
            type="number"
            min={0}
            placeholder="sin definir"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-700 outline-none focus:border-slate-500"
          />
          <span className="text-xs text-slate-500">pallets</span>
          <button
            type="button"
            disabled={actualizar.isPending}
            onClick={guardar}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            Guardar
          </button>
        </>
      ) : (
        <span className="text-sm font-semibold text-slate-700">{division.capacidad_maxima ?? "sin definir"} pallets</span>
      )}
      <button
        type="button"
        onClick={() => onVerHistorial(division)}
        className="ml-auto flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
      >
        <History size={12} /> Historial
      </button>
    </div>
  );
}

function PanelZona({
  division,
  detalle,
  cargando,
  puedeOperar,
  onVerHistorial,
}: {
  division: DivisionAlmacen | undefined;
  detalle: ClienteEnDivision[];
  cargando: boolean;
  puedeOperar: boolean;
  onVerHistorial: (d: DivisionAlmacen) => void;
}) {
  if (!division) {
    return <p className="p-5 text-sm text-slate-400">Selecciona una zona del plano para ver qué hay guardado.</p>;
  }
  const pctZona = division.capacidad_maxima ? Math.round(((division.ocupacion_actual ?? 0) / division.capacidad_maxima) * 100) : null;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <Medidor pct={pctZona} color={estilo(pctZona).color} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Zona seleccionada</p>
            <h3 className="text-base font-semibold leading-tight text-slate-900">{division.nombre}</h3>
            <p className="text-xs text-slate-500">
              {division.ocupacion_actual ?? 0} de {division.capacidad_maxima ?? "—"} pallets
            </p>
          </div>
        </div>
        {division.funcion && <p className="mt-3 text-xs leading-relaxed text-slate-500">{division.funcion}</p>}
        <CapacidadZona key={division.id_division} division={division} puedeOperar={puedeOperar} onVerHistorial={onVerHistorial} />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : detalle.length === 0 ? (
          <p className="text-sm text-slate-400">No hay stock guardado en esta zona.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {detalle.map((c) => (
              <div key={c.id_cliente_almacen}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorCliente(c.id_cliente_almacen) }} />
                    {c.razon_social}
                  </span>
                  <span className="text-right text-sm font-semibold text-slate-700">
                    {c.pallets > 0 && `${c.pallets} pallets`}
                    {c.pallets > 0 && totalUnidades(c) > 0 && " · "}
                    {totalUnidades(c) > 0 && textoUnidades(c)}
                  </span>
                </div>
                <ul className="mt-2 flex flex-col gap-1 border-l-2 border-slate-100 pl-3 text-xs text-slate-500">
                  {c.productos.map((p) => (
                    <li key={p.nombre} className="flex justify-between">
                      <span>{p.nombre}</span>
                      <span>{p.pallets}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="bg-slate-50/60 px-5 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{etiqueta}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{valor}</p>
      {detalle && <p className="text-[11px] text-slate-500">{detalle}</p>}
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {texto}
    </span>
  );
}

export function PlanoAlmacen({
  divisiones,
  puedeOperar,
  onVerHistorial,
}: {
  divisiones: DivisionAlmacen[];
  puedeOperar: boolean;
  onVerHistorial: (d: DivisionAlmacen) => void;
}) {
  const ordenadas = [...divisiones].sort((a, b) => a.orden - b.orden);
  const [d1, d2, d3] = ordenadas;
  const [seleccion, setSeleccion] = useState<number | null>(d1?.id_division ?? null);
  const [foco, setFoco] = useState<number | null>(null);

  const q1 = useDetalleOcupacionDivision(d1?.id_division ?? null);
  const q2 = useDetalleOcupacionDivision(d2?.id_division ?? null);
  const q3 = useDetalleOcupacionDivision(d3?.id_division ?? null);
  const detalles = new Map<number, { data: ClienteEnDivision[]; cargando: boolean }>(
    [
      [d1, q1],
      [d2, q2],
      [d3, q3],
    ]
      .filter(([d]) => !!d)
      .map(([d, q]) => [(d as DivisionAlmacen).id_division, { data: (q as typeof q1).data ?? [], cargando: (q as typeof q1).isLoading }])
  );

  const elegida = ordenadas.find((d) => d.id_division === seleccion);

  const ocupacionZona = (d: DivisionAlmacen) => d.ocupacion_actual ?? 0;
  const totalPallets = ordenadas.reduce((a, d) => a + ocupacionZona(d), 0);
  const totalCapacidad = ordenadas.reduce((a, d) => a + (d.capacidad_maxima ?? 0), 0);
  const criticas = ordenadas.filter((d) => d.capacidad_maxima && (ocupacionZona(d) / d.capacidad_maxima) * 100 >= 90).length;

  const clientes = (() => {
    const mapa = new Map<number, { nombre: string; pallets: number }>();
    for (const { data } of detalles.values()) {
      for (const c of data) {
        const prev = mapa.get(c.id_cliente_almacen);
        mapa.set(c.id_cliente_almacen, { nombre: c.razon_social, pallets: (prev?.pallets ?? 0) + c.pallets });
      }
    }
    return [...mapa.entries()].sort((a, b) => b[1].pallets - a[1].pallets);
  })();

  // Dónde está guardado lo que no son pallets (cajas, rollos...): cliente, cantidad y sección.
  const avisosUnidades = ordenadas.flatMap((d) =>
    (detalles.get(d.id_division)?.data ?? [])
      .filter((c) => totalUnidades(c) > 0)
      .map((c) => ({ clave: `${d.id_division}-${c.id_cliente_almacen}`, id_division: d.id_division, zona: d.nombre, cliente: c.razon_social, texto: textoUnidades(c) }))
  );

  const zona = (d: DivisionAlmacen | undefined, clase: string, tipo: Tipo) => (
    <Zona
      division={d}
      detalle={d ? detalles.get(d.id_division)?.data ?? [] : []}
      tipo={tipo}
      clase={clase}
      foco={foco}
      seleccionada={!!d && seleccion === d.id_division}
      onSeleccionar={() => setSeleccion(d?.id_division ?? null)}
    />
  );

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <LayoutGrid size={18} className="text-slate-300" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Plano de almacén</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Leyenda color="bg-emerald-500" texto="Menos de 60%" />
          <Leyenda color="bg-amber-500" texto="60% – 89%" />
          <Leyenda color="bg-red-500" texto="90% o más" />
          <Leyenda color="border border-slate-400 bg-slate-100" texto="Posición libre" />
        </div>
      </div>

      {avisosUnidades.length > 0 && (
        <div className="flex gap-3 border-b border-sky-200 bg-sky-50 px-5 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-sky-600" />
          <div className="text-xs text-sky-900">
            <p className="font-semibold">Cajas y otras unidades guardadas</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {avisosUnidades.map((a) => (
                <li key={a.clave}>
                  <button type="button" onClick={() => setSeleccion(a.id_division)} className="text-left hover:underline">
                    <span className="font-medium">{a.cliente}</span>: {a.texto} en {a.zona}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 sm:grid-cols-4">
        <Kpi etiqueta="Pallets en plano" valor={String(totalPallets)} />
        <Kpi etiqueta="Capacidad total" valor={totalCapacidad ? String(totalCapacidad) : "—"} detalle="pallets" />
        <Kpi etiqueta="Ocupación global" valor={totalCapacidad ? `${Math.round((totalPallets / totalCapacidad) * 1000) / 10}%` : "—"} />
        <Kpi etiqueta="Zonas críticas" valor={String(criticas)} detalle="con 90% o más" />
      </div>

      {clientes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-2.5">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Clientes</span>
          {clientes.map(([id, c]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFoco((f) => (f === id ? null : id))}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                foco === id ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: colorCliente(id) }} />
              {c.nombre} · {c.pallets}
            </button>
          ))}
          {foco !== null && (
            <button type="button" onClick={() => setFoco(null)} className="text-xs text-slate-500 underline">
              Quitar resaltado
            </button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-2 gap-px bg-slate-300 p-px">
          {zona(d3, "col-span-2", "racks")}
          {zona(d2, "col-span-2", "mitades")}
          {zona(d1, "", "piso")}
          <div
            className="flex flex-col items-center justify-center gap-3 border-l-4 border-l-slate-400 bg-slate-100 p-4"
            style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(148,163,184,.12) 0 8px, transparent 8px 16px)" }}
          >
            <Truck size={26} className="text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">Zona de carga y descarga</p>
            <div className="h-2 w-40 rounded-sm" style={{ backgroundImage: "repeating-linear-gradient(135deg,#dc2626 0 7px,#fff 7px 14px)" }} />
          </div>
        </div>
        <div className="min-h-72 border-t border-slate-300 bg-white lg:border-l lg:border-t-0">
          <PanelZona
            division={elegida}
            detalle={elegida ? detalles.get(elegida.id_division)?.data ?? [] : []}
            cargando={elegida ? detalles.get(elegida.id_division)?.cargando ?? false : false}
            puedeOperar={puedeOperar}
            onVerHistorial={onVerHistorial}
          />
        </div>
      </div>
    </div>
  );
}


