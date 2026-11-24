import { useState } from "react";
import { Pencil } from "lucide-react";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { Tabla } from "../../components/ui/Tabla";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { inputClass } from "../../lib/estilos";
import { useEnviar } from "../../lib/useEnviar";
import { fechaLocalHoy, formatearFecha } from "../almacen/almacen.utils";
import { guardarNumeracion, type DatosNumeracion, type Numeracion } from "./maestros.api";
import { useNumeracion } from "./useMaestros";

/** Mismo armado que el backend: {AAAA} = año, {AA} = año corto; el número no se recorta si supera los dígitos. */
function vistaPrevia(d: DatosNumeracion) {
  const anio = fechaLocalHoy().slice(0, 4);
  const prefijo = d.prefijo.toUpperCase().replaceAll("{AAAA}", anio).replaceAll("{AA}", anio.slice(-2));
  return prefijo + String(d.proximoNumero || 1).padStart(d.digitos || 1, "0");
}

/** Cómo numera DeymiTool cada documento y desde qué número sigue. Solo afecta a los documentos nuevos. */
export function NumeracionPanel({ puedeConfigurar }: { puedeConfigurar: boolean }) {
  const { data, isLoading } = useNumeracion();
  const [editando, setEditando] = useState<Numeracion | null>(null);

  return (
    <Tarjeta titulo="Numeración de documentos" sinPadding>
      <div className="px-5 pt-4">
        <Aviso tono="info" titulo="Solo afecta a los documentos nuevos">
          Los ya emitidos conservan su número. En el prefijo, {"{AA}"} se reemplaza por el año corto (26) y {"{AAAA}"} por el año completo (2026).
        </Aviso>
      </div>
      <Tabla
        cargando={isLoading}
        filas={data}
        claveFila={(n) => n.tipo}
        onFila={puedeConfigurar ? setEditando : undefined}
        columnas={[
          { titulo: "Documento", celda: (n) => <span className="font-medium text-slate-900">{n.nombre}</span> },
          { titulo: "Formato", celda: (n) => <code className="text-xs">{n.prefijo || "—"} + {n.digitos} dígitos</code> },
          { titulo: "Reinicia cada año", celda: (n) => (n.reinicioAnual ? "Sí" : "No") },
          { titulo: "Próximo número", celda: (n) => <span className="font-semibold text-slate-800">{n.siguiente}</span> },
          { titulo: "Último cambio", celda: (n) => (n.actualizadoEn ? formatearFecha(n.actualizadoEn) : "—") },
          ...(puedeConfigurar ? [{ titulo: "", alinear: "derecha" as const, celda: () => <Pencil size={15} className="inline text-slate-400" aria-label="Editar" /> }] : []),
        ]}
      />
      {!puedeConfigurar && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Solo Administrador y Sistemas pueden cambiar la numeración.</p>}
      {editando && <FormularioNumeracion numeracion={editando} onCerrar={() => setEditando(null)} />}
    </Tarjeta>
  );
}

function FormularioNumeracion({ numeracion: n, onCerrar }: { numeracion: Numeracion; onCerrar: () => void }) {
  const [f, setF] = useState<DatosNumeracion>({
    prefijo: n.prefijo,
    digitos: n.digitos,
    reinicioAnual: n.reinicioAnual,
    proximoNumero: n.proximoNumero,
  });
  const set = <K extends keyof DatosNumeracion>(k: K, v: DatosNumeracion[K]) => setF((x) => ({ ...x, [k]: v }));
  const { enviar, guardando, error } = useEnviar("maestros", () => guardarNumeracion(n.tipo, f), onCerrar);
  const siguiente = vistaPrevia(f);

  return (
    <Modal titulo={`Numeración de ${n.nombre.toLowerCase()}`} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error}>
      <Campo label="Prefijo" ayuda="Ej. {AA} → 260606 · PF-{AAAA}- → PF-2026-000001">
        <input className={inputClass} value={f.prefijo} maxLength={20} onChange={(e) => set("prefijo", e.target.value.toUpperCase())} autoFocus />
      </Campo>
      <Campo label="Dígitos del número" ayuda="Se completa con ceros a la izquierda">
        <input type="number" min={1} max={10} className={inputClass} value={f.digitos} onChange={(e) => set("digitos", Number(e.target.value))} />
      </Campo>
      <Campo label="Próximo número" ayuda={`El último usado es ${n.ultimoNumero}`}>
        <input type="number" min={1} className={inputClass} value={f.proximoNumero} onChange={(e) => set("proximoNumero", Number(e.target.value))} />
      </Campo>
      <Campo label="Reinicia cada año">
        <select className={inputClass} value={f.reinicioAnual ? "SI" : "NO"} onChange={(e) => set("reinicioAnual", e.target.value === "SI")}>
          <option value="SI">Sí: en enero vuelve a empezar desde 1</option>
          <option value="NO">No: el número sigue corrido</option>
        </select>
      </Campo>
      <div className="rounded-lg bg-slate-100 px-4 py-3 sm:col-span-2">
        <p className="text-xs text-slate-500">El próximo {n.nombre.toLowerCase()} será</p>
        <p className="text-xl font-bold text-slate-800">{siguiente}</p>
        {siguiente.length > 20 && <p className="mt-1 text-xs text-red-600">Tiene {siguiente.length} caracteres: el máximo es 20.</p>}
      </div>
    </Modal>
  );
}
