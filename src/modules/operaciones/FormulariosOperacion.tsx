import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { CampoMotivoCambio } from "../../components/ui/MotivoCambio";
import { motivoValido } from "../../lib/motivo";
import { inputClass } from "../../lib/estilos";
import { hoyISO } from "../../lib/formato";
import { useEnviar } from "../../lib/useEnviar";
import { fechaLocalHoy } from "../almacen/almacen.utils";
import { cambios, type ItemCatalogo } from "../maestros/maestros.api";
import { useCatalogos } from "../maestros/useMaestros";
import { editarOperacion, finalizarOperacion, guardarContenedores, type DatosContenedor, type DatosOperacion, type Operacion } from "./operaciones.api";

const numeroONulo = (v: string) => (v === "" ? null : Number(v));

function SelectCatalogo({ items, valor, onCambiar }: { items: ItemCatalogo[] | undefined; valor: number | null; onCambiar: (id: number | null) => void }) {
  return (
    <select className={inputClass} value={valor ?? ""} onChange={(e) => onCambiar(e.target.value ? Number(e.target.value) : null)}>
      <option value="">— Sin definir —</option>
      {items
        ?.filter((i) => i.activo || i.id === valor)
        .map((i) => (
          <option key={i.id} value={i.id}>
            {i.codigo ? `${i.codigo} · ${i.nombre}` : i.nombre}
          </option>
        ))}
    </select>
  );
}

/**
 * Fechas, DAM, BL/AWB y los catálogos: se completan o corrigen durante el trámite.
 * `soloFechas`: la operación ya pasó el trámite (liquidada, facturada, cerrada): solo se corrigen las fechas.
 */
export function FormularioDatos({ op, onCerrar, soloFechas = false }: { op: Operacion; onCerrar: () => void; soloFechas?: boolean }) {
  const { data: cat } = useCatalogos();
  const inicial: DatosOperacion = {
    fechaApertura: op.fechaApertura,
    ...(op.fechaFin && { fechaFin: op.fechaFin }),
    dam: op.dam ?? "", blAwb: op.blAwb ?? "", regimenId: op.regimenId, aduanaId: op.aduanaId, puertoId: op.puertoId,
    lineaNavieraId: op.lineaNavieraId, terminalId: op.terminalId, almacenId: op.almacenId,
  };
  const [f, setF] = useState(inicial);
  const set = <K extends keyof DatosOperacion>(k: K, v: DatosOperacion[K]) => setF((x) => ({ ...x, [k]: v }));
  const [motivo, setMotivo] = useState("");
  // Ya liquidada o facturada: las fechas se editan libres; lo demás pide motivo
  const pideMotivo = soloFechas ? null : (op.edicionConMotivo ?? null);
  const cambiaMasQueFechas = Object.keys(cambios(inicial, f)).some((k) => k !== "fechaApertura" && k !== "fechaFin");
  const necesitaMotivo = !!pideMotivo && cambiaMasQueFechas;
  const { enviar, guardando, error } = useEnviar(
    "operaciones",
    () => editarOperacion(op.id, { ...cambios(inicial, f), ...(necesitaMotivo && { motivo: motivo.trim() }) }),
    onCerrar
  );
  return (
    <Modal
      titulo={soloFechas ? `Editar fechas de ${op.numero}` : `Datos de ${op.numero}`}
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardando}
      error={error}
      deshabilitado={necesitaMotivo && !motivoValido(motivo)}
      {...(necesitaMotivo && !motivoValido(motivo) && { aviso: "Indica el motivo del cambio" })}
    >
      <Campo label="Fecha de apertura">
        <input type="date" className={inputClass} max={f.fechaFin ?? hoyISO()} value={f.fechaApertura ?? ""} onChange={(e) => e.target.value && set("fechaApertura", e.target.value)} />
      </Campo>
      {op.fechaFin && (
        <Campo label="Fin del trámite">
          <input type="date" className={inputClass} min={f.fechaApertura} max={hoyISO()} value={f.fechaFin ?? ""} onChange={(e) => e.target.value && set("fechaFin", e.target.value)} />
        </Campo>
      )}
      {soloFechas ? (
        <p className="text-xs text-slate-500 sm:col-span-2">El cambio queda en el historial de la operación.</p>
      ) : (
        <>
      <Campo label="DAM" ayuda="Declaración aduanera de mercancías">
        <input className={inputClass} value={f.dam ?? ""} maxLength={40} onChange={(e) => set("dam", e.target.value.toUpperCase())} autoFocus />
      </Campo>
      <Campo label="BL / AWB" ayuda="Conocimiento de embarque o guía aérea">
        <input className={inputClass} value={f.blAwb ?? ""} maxLength={40} onChange={(e) => set("blAwb", e.target.value.toUpperCase())} />
      </Campo>
      <Campo label="Régimen aduanero">
        <SelectCatalogo items={cat?.regimenes} valor={f.regimenId} onCambiar={(v) => set("regimenId", v)} />
      </Campo>
      <Campo label="Aduana">
        <SelectCatalogo items={cat?.aduanas} valor={f.aduanaId} onCambiar={(v) => set("aduanaId", v)} />
      </Campo>
      <Campo label="Puerto">
        <SelectCatalogo items={cat?.puertos} valor={f.puertoId} onCambiar={(v) => set("puertoId", v)} />
      </Campo>
      <Campo label="Línea naviera">
        <SelectCatalogo items={cat?.["lineas-navieras"]} valor={f.lineaNavieraId} onCambiar={(v) => set("lineaNavieraId", v)} />
      </Campo>
      <Campo label="Terminal">
        <SelectCatalogo items={cat?.terminales} valor={f.terminalId} onCambiar={(v) => set("terminalId", v)} />
      </Campo>
      <Campo label="Almacén">
        <SelectCatalogo items={cat?.almacenes} valor={f.almacenId} onCambiar={(v) => set("almacenId", v)} />
      </Campo>
      {pideMotivo && (
        <CampoMotivoCambio
          razon={pideMotivo}
          valor={motivo}
          onCambiar={setMotivo}
          ayuda={`Se pide porque ${pideMotivo} (si solo cambias fechas, no hace falta). Queda en el historial.`}
        />
      )}
        </>
      )}
    </Modal>
  );
}

type FilaContenedor = DatosContenedor & { clave: string };

/** Lista de contenedores de la operación: se guarda completa (los que faltan se quitan). */
export function FormularioContenedores({ op, onCerrar }: { op: Operacion; onCerrar: () => void }) {
  const { data: cat } = useCatalogos();
  const [filas, setFilas] = useState<FilaContenedor[]>(() =>
    op.contenedores.map((c) => ({ clave: `c${c.id}`, numero: c.numero, tipoContenedorId: c.tipoContenedorId, precinto: c.precinto ?? "", pesoKg: c.pesoKg }))
  );
  const [nuevas, setNuevas] = useState(0);
  const cambiar = (clave: string, c: Partial<FilaContenedor>) => setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...c } : f)));
  const [motivo, setMotivo] = useState("");
  const pideMotivo = op.edicionConMotivo ?? null;
  const { enviar, guardando, error } = useEnviar(
    "operaciones",
    () =>
      guardarContenedores(
        op.id,
        filas.map((c) => ({ numero: c.numero.trim(), tipoContenedorId: c.tipoContenedorId, precinto: c.precinto?.trim() || null, pesoKg: c.pesoKg })),
        pideMotivo ? motivo.trim() : undefined
      ),
    onCerrar
  );
  const celda = `${inputClass} px-2! py-1.5! text-xs!`;
  return (
    <Modal
      titulo={`Contenedores de ${op.numero}`}
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardando}
      error={error}
      deshabilitado={!!pideMotivo && !motivoValido(motivo)}
      {...(pideMotivo && !motivoValido(motivo) && { aviso: "Indica el motivo del cambio" })}
    >
      <div className="space-y-2 sm:col-span-2">
        {filas.length === 0 && <p className="text-sm text-slate-400">Sin contenedores. Agrega los que figuran en el BL.</p>}
        {filas.map((f) => (
          <div key={f.clave} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] items-center gap-2">
            <input className={celda} placeholder="MSKU1234567" aria-label="Número de contenedor" value={f.numero} maxLength={15} onChange={(e) => cambiar(f.clave, { numero: e.target.value.toUpperCase() })} />
            <select className={celda} aria-label="Tipo" value={f.tipoContenedorId ?? ""} onChange={(e) => cambiar(f.clave, { tipoContenedorId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Tipo</option>
              {cat?.["tipos-contenedor"].map((t) => (
                <option key={t.id} value={t.id}>
                  {t.codigo ?? t.nombre}
                </option>
              ))}
            </select>
            <input className={celda} placeholder="Precinto" aria-label="Precinto" value={f.precinto ?? ""} maxLength={30} onChange={(e) => cambiar(f.clave, { precinto: e.target.value.toUpperCase() })} />
            <input className={celda} type="number" min={0} placeholder="Peso (kg)" aria-label="Peso en kg" value={f.pesoKg ?? ""} onChange={(e) => cambiar(f.clave, { pesoKg: numeroONulo(e.target.value) })} />
            <button type="button" onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar contenedor">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setFilas((fs) => [...fs, { clave: `n${nuevas}`, numero: "", tipoContenedorId: null, precinto: "", pesoKg: null }]);
            setNuevas((n) => n + 1);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:underline"
        >
          <Plus size={13} /> Agregar contenedor
        </button>
        <p className="text-xs text-slate-400">Formato ISO: 4 letras y 7 dígitos (ej. MSKU1234567).</p>
      </div>
      {pideMotivo && <CampoMotivoCambio razon={pideMotivo} valor={motivo} onCambiar={setMotivo} />}
    </Modal>
  );
}

/** Pide el motivo (reabrir o anular): queda en el historial. */
export function FormularioMotivo({
  titulo, textoGuardar, ayuda, onCerrar, onGuardar, guardando, error,
}: { titulo: string; textoGuardar: string; ayuda: string; onCerrar: () => void; onGuardar: (motivo: string) => void; guardando: boolean; error: string | null }) {
  const [motivo, setMotivo] = useState("");
  return (
    <Modal titulo={titulo} onCerrar={onCerrar} onGuardar={() => onGuardar(motivo.trim())} guardando={guardando} error={error} textoGuardar={textoGuardar}>
      <Campo label="Motivo" requerido className="sm:col-span-2" ayuda={ayuda}>
        <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} autoFocus />
      </Campo>
    </Modal>
  );
}

/** Fecha en que terminó el trámite. */
export function FormularioFinalizar({ op, onCerrar }: { op: Operacion; onCerrar: () => void }) {
  const [fechaFin, setFechaFin] = useState(fechaLocalHoy());
  const { enviar, guardando, error } = useEnviar("operaciones", () => finalizarOperacion(op.id, fechaFin), onCerrar);
  return (
    <Modal titulo={`Finalizar ${op.numero}`} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error} textoGuardar="Finalizar">
      <Campo label="Fecha en que terminó el trámite" className="sm:col-span-2">
        <input type="date" value={fechaFin} max={fechaLocalHoy()} onChange={(e) => setFechaFin(e.target.value || fechaLocalHoy())} className={inputClass} autoFocus />
      </Campo>
    </Modal>
  );
}
