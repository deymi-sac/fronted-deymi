import { useState } from "react";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { inputClass } from "../../lib/estilos";
import { useEnviar } from "../../lib/useEnviar";
import { cambios, type ItemCatalogo } from "../maestros/maestros.api";
import { useCatalogos, useClientes } from "../maestros/useMaestros";
import { fechaLocalHoy } from "../almacen/almacen.utils";
import {
  crearPrecioCliente, crearTarifa, duplicarTarifa, editarPrecioCliente, editarTarifa,
  type DatosCabecera, type DatosPrecioCliente, type PrecioCliente, type Tarifa,
} from "./tarifas.api";

const numeroONulo = (v: string) => (v === "" ? null : Number(v));

/** Select de catálogo con la opción "todas" (null = la tarifa aplica a cualquiera). */
function SelectCatalogo({
  items,
  valor,
  onCambiar,
  todas,
}: {
  items: ItemCatalogo[] | undefined;
  valor: number | null;
  onCambiar: (id: number | null) => void;
  todas: string;
}) {
  return (
    <select className={inputClass} value={valor ?? ""} onChange={(e) => onCambiar(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{todas}</option>
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

// ---------- Cabecera ----------

/** Crear una tarifa (sin conceptos: se agregan después) o editar a qué operaciones aplica. */
export function FormularioCabecera({ tarifa, onCerrar, onCreada }: { tarifa?: Tarifa; onCerrar: () => void; onCreada?: (id: number) => void }) {
  const { data: cat } = useCatalogos();
  const { data: clientes } = useClientes();
  const inicial: DatosCabecera = tarifa
    ? {
        nombre: tarifa.nombre, tipoOperacion: tarifa.tipoOperacion, via: tarifa.via, lineaNavieraId: tarifa.lineaNavieraId,
        aduanaId: tarifa.aduanaId, terminalId: tarifa.terminalId, tipoContenedorId: tarifa.tipoContenedorId, regimenId: tarifa.regimenId,
        tipoCargaId: tarifa.tipoCargaId, moneda: tarifa.moneda, clienteId: tarifa.clienteId, preciosIncluyenIgv: tarifa.preciosIncluyenIgv,
        vigenteDesde: tarifa.vigenteDesde, vigenteHasta: tarifa.vigenteHasta, activo: tarifa.activo,
      }
    : {
        nombre: "", tipoOperacion: "IMPORTACION", via: "MARITIMA", lineaNavieraId: null, aduanaId: null, terminalId: null,
        tipoContenedorId: null, regimenId: null, tipoCargaId: null, moneda: "USD", clienteId: null, preciosIncluyenIgv: false,
        vigenteDesde: fechaLocalHoy(), vigenteHasta: null, activo: true,
      };
  const [f, setF] = useState(inicial);
  const set = <K extends keyof DatosCabecera>(k: K, v: DatosCabecera[K]) => setF((x) => ({ ...x, [k]: v }));
  /** Con régimen, la tarifa es del tipo del régimen; sin régimen (todos) se elige a mano */
  const tipoRegimen = cat?.regimenes.find((r) => r.id === f.regimenId)?.tipoOperacion ?? null;
  function elegirRegimen(id: number | null) {
    const tipo = cat?.regimenes.find((r) => r.id === id)?.tipoOperacion;
    setF((x) => ({ ...x, regimenId: id, ...(tipo && { tipoOperacion: tipo }) }));
  }
  const { enviar, guardando, error } = useEnviar(
    "tarifas",
    () => (tarifa ? editarTarifa(tarifa.id, cambios(inicial, f)) : crearTarifa(f)),
    (t) => {
      onCerrar();
      if (!tarifa) onCreada?.(t.id);
    }
  );

  return (
    <Modal titulo={tarifa ? `Editar ${tarifa.nombre}` : "Nueva tarifa"} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error}>
      <Campo label="Nombre" requerido className="sm:col-span-2" ayuda="Ej. Importación marítima · MSC">
        <input className={inputClass} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus />
      </Campo>
      <Campo label="Tipo de operación" ayuda={tipoRegimen ? "Lo define el régimen" : "Solo para tarifas de todos los regímenes"}>
        <select className={inputClass} value={f.tipoOperacion} disabled={!!tipoRegimen} onChange={(e) => set("tipoOperacion", e.target.value as DatosCabecera["tipoOperacion"])}>
          <option value="IMPORTACION">Importación</option>
          <option value="EXPORTACION">Exportación</option>
        </select>
      </Campo>
      <Campo label="Vía">
        <select className={inputClass} value={f.via} onChange={(e) => set("via", e.target.value as DatosCabecera["via"])}>
          <option value="MARITIMA">Marítima</option>
          <option value="AEREA">Aérea</option>
          <option value="TERRESTRE">Terrestre</option>
        </select>
      </Campo>
      <Campo label="Línea naviera">
        <SelectCatalogo items={cat?.["lineas-navieras"]} valor={f.lineaNavieraId} onCambiar={(v) => set("lineaNavieraId", v)} todas="Todas las líneas" />
      </Campo>
      <Campo label="Aduana">
        <SelectCatalogo items={cat?.aduanas} valor={f.aduanaId} onCambiar={(v) => set("aduanaId", v)} todas="Todas las aduanas" />
      </Campo>
      <Campo label="Terminal">
        <SelectCatalogo items={cat?.terminales} valor={f.terminalId} onCambiar={(v) => set("terminalId", v)} todas="Todos los terminales" />
      </Campo>
      <Campo label="Tipo de contenedor">
        <SelectCatalogo items={cat?.["tipos-contenedor"]} valor={f.tipoContenedorId} onCambiar={(v) => set("tipoContenedorId", v)} todas="Todos los contenedores" />
      </Campo>
      <Campo label="Régimen aduanero" ayuda="Separa, del mismo cliente, p. ej. la exportación temporal de la simplificada">
        <SelectCatalogo items={cat?.regimenes} valor={f.regimenId} onCambiar={elegirRegimen} todas="Todos los regímenes" />
      </Campo>
      <Campo label="Tipo de carga" ayuda="Separa, en la misma aduana, p. ej. LCL de FCL">
        <SelectCatalogo items={cat?.["tipos-carga"]} valor={f.tipoCargaId} onCambiar={(v) => set("tipoCargaId", v)} todas="Todos los tipos de carga" />
      </Campo>
      <Campo label="Moneda">
        <select className={inputClass} value={f.moneda} onChange={(e) => set("moneda", e.target.value as DatosCabecera["moneda"])}>
          <option value="USD">Dólares (USD)</option>
          <option value="PEN">Soles (PEN)</option>
        </select>
      </Campo>
      <Campo label="Cliente" ayuda="Solo si es la tarifa propia de un cliente: en sus proformas gana sobre la general">
        <select className={inputClass} value={f.clienteId ?? ""} onChange={(e) => set("clienteId", e.target.value ? Number(e.target.value) : null)}>
          <option value="">General (todos los clientes)</option>
          {clientes
            ?.filter((c) => c.activo || c.id === f.clienteId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial}
              </option>
            ))}
        </select>
      </Campo>
      <label className="flex items-start gap-2 text-sm text-slate-600 sm:col-span-2">
        <input type="checkbox" className="mt-1" checked={f.preciosIncluyenIgv} onChange={(e) => set("preciosIncluyenIgv", e.target.checked)} />
        <span>
          Los precios incluyen IGV
          <span className="block text-xs text-slate-400">La proforma separa el IGV del importe en vez de sumarlo.</span>
        </span>
      </label>
      <Campo label="Vigente desde" requerido>
        <input type="date" className={inputClass} value={f.vigenteDesde} onChange={(e) => set("vigenteDesde", e.target.value)} />
      </Campo>
      <Campo label="Vigente hasta" ayuda="Vacío = sin fecha de fin">
        <input type="date" className={inputClass} value={f.vigenteHasta ?? ""} onChange={(e) => set("vigenteHasta", e.target.value || null)} />
      </Campo>
      <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
        <input type="checkbox" checked={f.activo} onChange={(e) => set("activo", e.target.checked)} />
        Activa (las proformas solo usan tarifas activas y vigentes)
      </label>
    </Modal>
  );
}

// ---------- Duplicar ----------

/** Copia la tarifa (por ejemplo, para otra naviera o una nueva vigencia); la copia queda inactiva. */
export function FormularioDuplicar({ tarifa, onCerrar, onCreada }: { tarifa: Tarifa; onCerrar: () => void; onCreada: (id: number) => void }) {
  const { data: cat } = useCatalogos();
  const [f, setF] = useState({ nombre: `${tarifa.nombre} (copia)`, lineaNavieraId: tarifa.lineaNavieraId, vigenteDesde: fechaLocalHoy() });
  const { enviar, guardando, error } = useEnviar("tarifas", () => duplicarTarifa(tarifa.id, f), (t) => {
    onCerrar();
    onCreada(t.id);
  });
  return (
    <Modal titulo={`Duplicar ${tarifa.nombre}`} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error} textoGuardar="Duplicar">
      <Campo label="Nombre de la copia" requerido className="sm:col-span-2" ayuda="La copia queda inactiva para que la revises antes de usarla">
        <input className={inputClass} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus />
      </Campo>
      <Campo label="Línea naviera">
        <SelectCatalogo items={cat?.["lineas-navieras"]} valor={f.lineaNavieraId} onCambiar={(v) => setF({ ...f, lineaNavieraId: v })} todas="Todas las líneas" />
      </Campo>
      <Campo label="Vigente desde">
        <input type="date" className={inputClass} value={f.vigenteDesde} onChange={(e) => setF({ ...f, vigenteDesde: e.target.value })} />
      </Campo>
    </Modal>
  );
}

// ---------- Precio especial por cliente ----------

export function FormularioPrecio({ tarifa, precio, onCerrar }: { tarifa: Tarifa; precio?: PrecioCliente; onCerrar: () => void }) {
  const { data: clientes } = useClientes();
  const inicial: DatosPrecioCliente = precio
    ? {
        clienteId: precio.clienteId, tarifaDetalleId: precio.tarifaDetalleId, importe: precio.importe, porcentaje: precio.porcentaje,
        montoMinimo: precio.montoMinimo, vigenteDesde: precio.vigenteDesde, vigenteHasta: precio.vigenteHasta,
      }
    : { clienteId: 0, tarifaDetalleId: tarifa.detalle[0]?.id ?? 0, importe: null, porcentaje: null, montoMinimo: null, vigenteDesde: fechaLocalHoy(), vigenteHasta: null };
  const [f, setF] = useState(inicial);
  const linea = tarifa.detalle.find((l) => l.id === f.tarifaDetalleId);
  const porPorcentaje = linea?.tipoCalculo === "PORCENTAJE";
  const { enviar, guardando, error } = useEnviar(
    "tarifas",
    () => {
      if (!precio) return crearPrecioCliente(tarifa.id, f);
      // El cliente y el concepto no se cambian: para eso se crea otro precio especial
      const c = cambios(inicial, f);
      return editarPrecioCliente(tarifa.id, precio.id, {
        ...(c.importe !== undefined && { importe: c.importe }),
        ...(c.porcentaje !== undefined && { porcentaje: c.porcentaje }),
        ...(c.montoMinimo !== undefined && { montoMinimo: c.montoMinimo }),
        ...(c.vigenteDesde !== undefined && { vigenteDesde: c.vigenteDesde }),
        ...(c.vigenteHasta !== undefined && { vigenteHasta: c.vigenteHasta }),
      });
    },
    onCerrar
  );

  return (
    <Modal titulo={precio ? `Precio especial de ${precio.cliente}` : "Nuevo precio especial"} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error}>
      <Campo label="Cliente" requerido className="sm:col-span-2">
        <select className={inputClass} disabled={!!precio} value={f.clienteId || ""} onChange={(e) => setF({ ...f, clienteId: Number(e.target.value) })}>
          <option value="">— Elige un cliente —</option>
          {clientes
            ?.filter((c) => c.activo || c.id === f.clienteId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial}
              </option>
            ))}
        </select>
      </Campo>
      <Campo label="Concepto" requerido className="sm:col-span-2">
        <select
          className={inputClass}
          disabled={!!precio}
          value={f.tarifaDetalleId || ""}
          onChange={(e) => setF({ ...f, tarifaDetalleId: Number(e.target.value), importe: null, porcentaje: null })}
        >
          {tarifa.detalle.map((l) => (
            <option key={l.id} value={l.id}>
              {l.concepto}
            </option>
          ))}
        </select>
      </Campo>
      {porPorcentaje ? (
        <Campo label="Porcentaje especial" ayuda={`Normal: ${linea?.porcentaje}% del ${linea?.basePorcentaje}`}>
          <input type="number" step="0.01" min={0} className={inputClass} value={f.porcentaje ?? ""} onChange={(e) => setF({ ...f, porcentaje: numeroONulo(e.target.value) })} />
        </Campo>
      ) : (
        <Campo label={`Importe especial (${linea?.moneda ?? tarifa.moneda})`} ayuda={`Normal: ${linea?.importe ?? "—"}`}>
          <input type="number" step="0.01" min={0} className={inputClass} value={f.importe ?? ""} onChange={(e) => setF({ ...f, importe: numeroONulo(e.target.value) })} />
        </Campo>
      )}
      <Campo label="Mínimo especial" ayuda={linea?.montoMinimo != null ? `Normal: ${linea.montoMinimo}` : "Opcional"}>
        <input type="number" step="0.01" min={0} className={inputClass} value={f.montoMinimo ?? ""} onChange={(e) => setF({ ...f, montoMinimo: numeroONulo(e.target.value) })} />
      </Campo>
      <Campo label="Vigente desde" requerido>
        <input type="date" className={inputClass} value={f.vigenteDesde} onChange={(e) => setF({ ...f, vigenteDesde: e.target.value })} />
      </Campo>
      <Campo label="Vigente hasta" ayuda="Vacío = sin fecha de fin">
        <input type="date" className={inputClass} value={f.vigenteHasta ?? ""} onChange={(e) => setF({ ...f, vigenteHasta: e.target.value || null })} />
      </Campo>
    </Modal>
  );
}
