import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { Tabla } from "../../components/ui/Tabla";
import { Tarjeta } from "../../components/ui/Tarjeta";
import { useProveedores } from "../maestros/useMaestros";
import { eliminarPrecioCliente, usePreciosCliente, useTarifa, useTarifas, type LineaTarifa, type PrecioCliente, type Tarifa } from "./tarifas.api";
import { EditorConceptos } from "./EditorConceptos";
import { FormularioCabecera, FormularioDuplicar, FormularioPrecio } from "./FormulariosTarifas";
import { btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { dinero, etiqueta } from "../../lib/formato";
import { formatearFecha } from "../almacen/almacen.utils";
import { Paginado } from "../../components/ui/Paginado";

type Modal = { tipo: "nueva" } | { tipo: "cabecera" } | { tipo: "duplicar" } | { tipo: "precio"; precio?: PrecioCliente } | null;

/** "0.5% del FOB (mín. US$ 95.00)" / "US$ 30.00 por contenedor" */
function precioLinea(l: LineaTarifa, monedaTarifa: Tarifa["moneda"]) {
  const moneda = l.moneda ?? monedaTarifa;
  const base =
    l.tipoCalculo === "TRAMOS"
      ? `Por tramos del ${l.basePorcentaje}: ${(l.tramos ?? [])
          .map((t) => `${t.hasta == null ? "resto" : `≤ ${t.hasta.toLocaleString("es-PE")}`} ${t.porcentaje != null ? `${t.porcentaje}%` : dinero(t.importe ?? 0, moneda)}`)
          .join(" · ")}`
      : l.tipoCalculo === "PORCENTAJE"
        ? `${l.porcentaje}% del ${l.basePorcentaje}`
        : `${dinero(l.importe ?? 0, moneda)}${l.tipoCalculo === "POR_UNIDAD" ? ` por ${etiqueta(l.unidad).toLowerCase()}` : ""}`;
  const limites = [l.montoMinimo != null && `mín. ${dinero(l.montoMinimo, moneda)}`, l.montoMaximo != null && `máx. ${dinero(l.montoMaximo, moneda)}`].filter(Boolean);
  return limites.length ? `${base} (${limites.join(", ")})` : base;
}

const vigencia = (t: { vigenteDesde: string; vigenteHasta: string | null }) =>
  t.vigenteHasta ? `${formatearFecha(t.vigenteDesde)} al ${formatearFecha(t.vigenteHasta)}` : `Desde ${formatearFecha(t.vigenteDesde)}`;

function Estado({ activo }: { activo: boolean }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${activo ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
      {activo ? "Activa" : "Inactiva"}
    </span>
  );
}

export default function TarifasPage() {
  const { data: tarifas, isLoading } = useTarifas();
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"activas" | "todas">("activas");
  const [buscar, setBuscar] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  /** La tabla de conceptos necesita todo el ancho: mientras se edita, la lista se oculta */
  const [editandoConceptos, setEditandoConceptos] = useState(false);

  const visibles = tarifas?.filter((t) => (filtro === "todas" || t.activo) && (!buscar || t.nombre.toLowerCase().includes(buscar.toLowerCase())));
  // Si no se eligió ninguna, se muestra la primera de la lista
  const elegida = seleccion ?? visibles?.[0]?.id ?? null;
  const cerrar = () => setModal(null);
  // Una tarifa recién creada o duplicada puede estar inactiva: se muestran todas para que aparezca en la lista
  const mostrar = (id: number) => {
    setSeleccion(id);
    setFiltro("todas");
  };

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina
        titulo="Maestro de tarifas"
        subtitulo="Al elegir una tarifa en la proforma se cargan estos conceptos, y sus precios se pueden cambiar ahí mismo"
        acciones={
          <button type="button" onClick={() => setModal({ tipo: "nueva" })} className={btnPrimario}>
            <Plus size={16} /> Nueva tarifa
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Tarifas" sinPadding className={editandoConceptos ? "hidden" : ""}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            <input className={inputClass} placeholder="Buscar por nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            <div className="flex gap-1 text-xs">
              {(["activas", "todas"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFiltro(v)}
                  className={`rounded-full px-3 py-1 ${filtro === v ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {v === "activas" ? "Activas" : "Todas"}
                </button>
              ))}
            </div>
          </div>
          {isLoading && <p className="p-5 text-sm text-slate-400">Cargando…</p>}
          {visibles?.length === 0 && <p className="p-5 text-sm text-slate-400">No hay tarifas{filtro === "activas" ? " activas" : ""}.</p>}
          <Paginado items={visibles}>
            {(pagina) => (
              <ul className="divide-y divide-slate-100">
                {pagina.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setSeleccion(x.id)}
                      className={`w-full px-5 py-3 text-left transition ${elegida === x.id ? "bg-slate-100" : "hover:bg-slate-50"}`}
                    >
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        {x.nombre}
                        {!x.activo && <Estado activo={false} />}
                      </p>
                      <p className="text-xs text-slate-500">
                        {etiqueta(x.tipoOperacion)} · {etiqueta(x.via)} · {x.lineaNaviera ?? "todas las líneas"} · {x.cantidadConceptos} conceptos
                        {x.cliente && <span className="font-medium text-violet-700"> · solo {x.cliente}</span>}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Paginado>
        </Tarjeta>

        <div className={`min-w-0 ${editandoConceptos ? "lg:col-span-3" : "lg:col-span-2"}`}>
          {elegida !== null && <DetalleTarifa key={elegida} id={elegida} onModal={setModal} onEditando={setEditandoConceptos} />}
        </div>
      </div>

      {modal?.tipo === "nueva" && <FormularioCabecera onCerrar={cerrar} onCreada={mostrar} />}
      {modal && modal.tipo !== "nueva" && elegida !== null && <ModalesTarifa id={elegida} modal={modal} onCerrar={cerrar} onCreada={mostrar} />}
    </div>
  );
}

/** Los modales que necesitan la tarifa completa (se abren cuando ya está cargada). */
function ModalesTarifa({ id, modal, onCerrar, onCreada }: { id: number; modal: NonNullable<Modal>; onCerrar: () => void; onCreada: (id: number) => void }) {
  const { data: tarifa } = useTarifa(id);
  if (!tarifa) return null;
  if (modal.tipo === "cabecera") return <FormularioCabecera tarifa={tarifa} onCerrar={onCerrar} />;
  if (modal.tipo === "duplicar") return <FormularioDuplicar tarifa={tarifa} onCerrar={onCerrar} onCreada={onCreada} />;
  if (modal.tipo === "precio") return <FormularioPrecio tarifa={tarifa} precio={modal.precio} onCerrar={onCerrar} />;
  return null;
}

function DetalleTarifa({ id, onModal, onEditando }: { id: number; onModal: (m: Modal) => void; onEditando: (v: boolean) => void }) {
  const { data: t, isLoading } = useTarifa(id);
  const { data: precios } = usePreciosCliente(id);
  const { data: proveedores } = useProveedores();
  const [tab, setTab] = useState<"conceptos" | "precios">("conceptos");
  const [editando, setEditandoLocal] = useState(false);
  const setEditando = (v: boolean) => {
    setEditandoLocal(v);
    onEditando(v);
  };
  const qc = useQueryClient();
  const quitar = useMutation({
    mutationFn: (p: PrecioCliente) => eliminarPrecioCliente(id, p.id),
    meta: { exito: "Precio quitado" },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas"] }),
  });

  if (isLoading || !t) {
    return (
      <Tarjeta>
        <p className="text-sm text-slate-400">Cargando…</p>
      </Tarjeta>
    );
  }

  const aplica = [t.aduana, t.terminal, t.tipoContenedor, t.regimen, t.tipoCarga].filter(Boolean).join(" · ");
  return (
    <Tarjeta
      titulo={
        <span className="flex items-center gap-2">
          {t.nombre}
          <Estado activo={t.activo} />
        </span>
      }
      sinPadding
      acciones={
        !editando && (
          <div className="flex gap-1">
            <button type="button" onClick={() => onModal({ tipo: "cabecera" })} className={btnSecundario} title="Cliente, vigencia, moneda e IGV de la tarifa">
              <Pencil size={15} /> Editar datos
            </button>
            <button type="button" onClick={() => onModal({ tipo: "duplicar" })} className={btnSecundario} title="Duplicar tarifa">
              <Copy size={15} /> Duplicar
            </button>
          </div>
        )
      }
    >
      <div className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
        {etiqueta(t.tipoOperacion)} {etiqueta(t.via).toLowerCase()} · {t.lineaNaviera ?? "todas las líneas"}
        {aplica && ` · ${aplica}`} · {t.moneda} · {vigencia(t)}
        {t.cliente && <span className="font-medium text-violet-700"> · tarifa propia de {t.cliente}</span>}
        <span className="font-medium text-slate-700"> · {t.preciosIncluyenIgv ? "precios con IGV incluido" : "precios sin IGV (se suma el 18 %)"}</span>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-5 [scrollbar-width:none]">
        {(["conceptos", "precios"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setTab(v);
              setEditando(false);
            }}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === v ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {v === "conceptos" ? "Conceptos" : "Precios por cliente"}
            {(v === "conceptos" ? t.detalle.length : precios?.length) !== undefined && (
              <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{v === "conceptos" ? t.detalle.length : precios?.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "conceptos" &&
        (editando ? (
          <EditorConceptos tarifa={t} onTerminar={() => setEditando(false)} />
        ) : (
          <>
            <Tabla
              filas={t.detalle}
              claveFila={(l) => l.id}
              vacio="Esta tarifa aún no tiene conceptos"
              columnas={[
                {
                  titulo: "Concepto",
                  // El texto del tarifario va primero: así lo reconocen en las proformas
                  celda: (l) => (
                    <span>
                      <span className="font-medium text-slate-800">{l.descripcion ?? l.concepto}</span>
                      <span className="block text-xs text-slate-400">
                        {l.descripcion && `${l.concepto} · `}
                        {etiqueta(l.conceptoTipo)}
                        {l.afectoIgv ? " · afecto a IGV" : ""}
                      </span>
                    </span>
                  ),
                },
                { titulo: "Cálculo", celda: (l) => (l.tipoCalculo === "POR_UNIDAD" ? `Por ${etiqueta(l.unidad).toLowerCase()}` : etiqueta(l.tipoCalculo)) },
                { titulo: "Precio al cliente", alinear: "derecha", celda: (l) => precioLinea(l, t.moneda) },
                {
                  titulo: "Costo proveedor",
                  alinear: "derecha",
                  celda: (l) => (
                    <span className="text-slate-500">
                      {l.costoUnitario != null ? dinero(l.costoUnitario, l.moneda ?? t.moneda) : "Al costo"}
                      {l.proveedorId && <span className="block text-xs text-slate-400">{proveedores?.find((p) => p.id === l.proveedorId)?.razonSocial}</span>}
                    </span>
                  ),
                },
              ]}
            />
            <div className="flex justify-end border-t border-slate-100 px-4 py-3">
              <button type="button" onClick={() => setEditando(true)} className={btnSecundario}>
                <Pencil size={16} /> Editar conceptos
              </button>
            </div>
          </>
        ))}

      {tab === "precios" && (
        <>
          <Tabla
            filas={precios}
            claveFila={(p) => p.id}
            onFila={(p) => onModal({ tipo: "precio", precio: p })}
            vacio="Sin precios especiales: todos los clientes pagan la tarifa normal"
            columnas={[
              { titulo: "Cliente", celda: (p) => <span className="font-medium text-slate-800">{p.cliente}</span> },
              { titulo: "Concepto", celda: (p) => p.concepto },
              {
                titulo: "Precio especial",
                alinear: "derecha",
                celda: (p) =>
                  [p.importe != null && dinero(p.importe, t.moneda), p.porcentaje != null && `${p.porcentaje}%`, p.montoMinimo != null && `mín. ${dinero(p.montoMinimo, t.moneda)}`]
                    .filter(Boolean)
                    .join(" · "),
              },
              { titulo: "Vigencia", celda: (p) => vigencia(p) },
              {
                titulo: "",
                alinear: "derecha",
                celda: (p) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar el precio especial de ${p.cliente} para ${p.concepto}?`)) quitar.mutate(p);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar precio especial"
                  >
                    <Trash2 size={15} />
                  </button>
                ),
              },
            ]}
          />
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <button type="button" onClick={() => onModal({ tipo: "precio" })} disabled={t.detalle.length === 0} className={btnSecundario}>
              <Plus size={16} /> Nuevo precio especial
            </button>
          </div>
        </>
      )}
    </Tarjeta>
  );
}
