import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { btnPrimario, btnSecundario, inputCelda } from "../../lib/estilos";
import { etiqueta } from "../../lib/formato";
import { useEnviar } from "../../lib/useEnviar";
import { useConceptos, useProveedores } from "../maestros/useMaestros";
import { guardarDetalle, UNIDADES, type DatosLinea, type Tarifa, type TipoCalculo, type Tramo } from "./tarifas.api";

type Fila = DatosLinea & { clave: string };

const numeroONulo = (v: string) => (v === "" ? null : Number(v));

const aFilas = (t: Tarifa): Fila[] =>
  t.detalle.map((l) => ({
    clave: `l${l.id}`, id: l.id, conceptoId: l.conceptoId, descripcion: l.descripcion, tipoCalculo: l.tipoCalculo, unidad: l.unidad, importe: l.importe,
    porcentaje: l.porcentaje, basePorcentaje: l.basePorcentaje, tramos: l.tramos, montoMinimo: l.montoMinimo, montoMaximo: l.montoMaximo,
    moneda: l.moneda, costoUnitario: l.costoUnitario, proveedorId: l.proveedorId,
  }));

/** Punto de partida al elegir "Por tramos": una tabla de comisión típica. */
const TRAMOS_EJEMPLO: Tramo[] = [
  { hasta: 25000, importe: 130 },
  { hasta: 50000, porcentaje: 0.6 },
  { hasta: 150000, porcentaje: 0.4 },
  { hasta: 250000, porcentaje: 0.3 },
  { hasta: null, porcentaje: 0.25 },
];

/**
 * Conceptos de la tarifa en una tabla editable. Se guarda todo junto: las líneas existentes
 * se actualizan, las nuevas se agregan y las quitadas se borran (junto con sus precios especiales).
 * Una línea guardada no cambia de concepto: para eso se quita y se agrega otra.
 */
export function EditorConceptos({ tarifa, onTerminar }: { tarifa: Tarifa; onTerminar: () => void }) {
  const { data: conceptos } = useConceptos();
  const { data: proveedores } = useProveedores();
  const [filas, setFilas] = useState<Fila[]>(() => aFilas(tarifa));
  const [nuevas, setNuevas] = useState(0);
  const cambiar = (clave: string, c: Partial<Fila>) => setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...c } : f)));
  const usados = new Set(filas.map((f) => f.conceptoId));

  const qc = useQueryClient();
  const { enviar, guardando, error } = useEnviar(
    "tarifas",
    () =>
      guardarDetalle(
        tarifa.id,
        // `clave` es solo de la pantalla: no se envía al servidor
        filas.map((fila) => ({ ...fila, clave: undefined })),
      ),
    (actualizada) => {
      // La API devuelve la tarifa ya guardada: se muestra al instante, sin esperar la recarga
      qc.setQueryData(["tarifas", tarifa.id], actualizada);
      onTerminar();
    }
  );

  function agregar() {
    const libre = conceptos?.find((c) => c.activo && !usados.has(c.id));
    if (!libre) return;
    setFilas((fs) => [
      ...fs,
      {
        clave: `n${nuevas}`, conceptoId: libre.id, descripcion: null, tipoCalculo: "FIJO", unidad: "OPERACION", importe: 0, porcentaje: null,
        basePorcentaje: null, tramos: null, montoMinimo: null, montoMaximo: null, moneda: null, costoUnitario: null, proveedorId: null,
      },
    ]);
    setNuevas((n) => n + 1);
  }

  function cambiarCalculo(f: Fila, tipo: TipoCalculo) {
    cambiar(f.clave, {
      tipoCalculo: tipo,
      unidad: tipo === "POR_UNIDAD" ? (f.unidad === "OPERACION" ? "CONTENEDOR" : f.unidad) : "OPERACION",
      ...(tipo === "PORCENTAJE"
        ? { importe: null, porcentaje: f.porcentaje ?? 0.5, basePorcentaje: f.basePorcentaje ?? "FOB", tramos: null }
        : tipo === "TRAMOS"
          ? { importe: null, porcentaje: null, basePorcentaje: f.basePorcentaje ?? "CIF", tramos: f.tramos ?? TRAMOS_EJEMPLO }
          : { porcentaje: null, basePorcentaje: null, tramos: null, importe: f.importe ?? 0 }),
    });
  }

  return (
    <div>
      {error && <p className="m-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2 text-left">Concepto</th>
              <th className="px-2 py-2 text-left">Cálculo</th>
              <th className="px-2 py-2 text-left">Precio al cliente</th>
              <th className="px-2 py-2 text-left">Mínimo</th>
              <th className="px-2 py-2 text-left">Máximo</th>
              <th className="px-2 py-2 text-left" title="Lo que cobra el proveedor; vacío = se traslada al costo">Costo proveedor</th>
              <th className="px-2 py-2 text-left">Moneda</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((f) => (
              <tr key={f.clave} className="align-top">
                <td className="px-2 py-2">
                  <select className={`${inputCelda} min-w-44`} disabled={f.id !== undefined} value={f.conceptoId} onChange={(e) => cambiar(f.clave, { conceptoId: Number(e.target.value) })}>
                    {conceptos
                      ?.filter((c) => c.id === f.conceptoId || (c.activo && !usados.has(c.id)))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </select>
                  <input
                    className={`${inputCelda} mt-1 min-w-44`}
                    placeholder="Texto del tarifario (opcional)"
                    aria-label="Texto de la línea"
                    value={f.descripcion ?? ""}
                    maxLength={200}
                    onChange={(e) => cambiar(f.clave, { descripcion: e.target.value || null })}
                  />
                  <span className="mt-0.5 block text-[11px] text-slate-400">{etiqueta(conceptos?.find((c) => c.id === f.conceptoId)?.tipo ?? "")}</span>
                </td>
                <td className="px-2 py-2">
                  <select className={`${inputCelda} min-w-28`} value={f.tipoCalculo} onChange={(e) => cambiarCalculo(f, e.target.value as TipoCalculo)}>
                    <option value="FIJO">Fijo</option>
                    <option value="POR_UNIDAD">Por unidad</option>
                    <option value="PORCENTAJE">Porcentaje</option>
                    <option value="TRAMOS">Por tramos</option>
                  </select>
                  {f.tipoCalculo === "POR_UNIDAD" && (
                    <select className={`${inputCelda} mt-1 min-w-28`} value={f.unidad} onChange={(e) => cambiar(f.clave, { unidad: e.target.value as Fila["unidad"] })}>
                      {UNIDADES.filter((u) => u !== "OPERACION").map((u) => (
                        <option key={u} value={u}>
                          por {etiqueta(u).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-2 py-2">
                  {f.tipoCalculo === "TRAMOS" ? (
                    <EditorTramos fila={f} onCambiar={(c) => cambiar(f.clave, c)} />
                  ) : f.tipoCalculo === "PORCENTAJE" ? (
                    <div className="flex gap-1">
                      <input
                        type="number" step="0.01" min={0} className={`${inputCelda} w-20!`} aria-label="Porcentaje"
                        value={f.porcentaje ?? ""} onChange={(e) => cambiar(f.clave, { porcentaje: numeroONulo(e.target.value) })}
                      />
                      <select className={`${inputCelda} w-24!`} value={f.basePorcentaje ?? "FOB"} onChange={(e) => cambiar(f.clave, { basePorcentaje: e.target.value as "FOB" | "CIF" })}>
                        <option value="FOB">% FOB</option>
                        <option value="CIF">% CIF</option>
                      </select>
                    </div>
                  ) : (
                    <input
                      type="number" step="0.01" min={0} className={`${inputCelda} w-28!`} aria-label="Importe"
                      value={f.importe ?? ""} onChange={(e) => cambiar(f.clave, { importe: numeroONulo(e.target.value) })}
                    />
                  )}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number" step="0.01" min={0} className={`${inputCelda} w-24!`} aria-label="Mínimo" placeholder="—"
                    value={f.montoMinimo ?? ""} onChange={(e) => cambiar(f.clave, { montoMinimo: numeroONulo(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number" step="0.01" min={0} className={`${inputCelda} w-24!`} aria-label="Máximo" placeholder="—"
                    value={f.montoMaximo ?? ""} onChange={(e) => cambiar(f.clave, { montoMaximo: numeroONulo(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number" step="0.01" min={0} className={`${inputCelda} w-24!`} aria-label="Costo proveedor" placeholder="Al costo"
                    value={f.costoUnitario ?? ""} onChange={(e) => cambiar(f.clave, { costoUnitario: numeroONulo(e.target.value) })}
                  />
                  {/* Quién lo cobra: al pagar este ítem de la proforma, el proveedor se llena solo */}
                  <select
                    className={`${inputCelda} mt-1 w-40!`} aria-label="Proveedor" title="Proveedor que cobra este concepto"
                    value={f.proveedorId ?? ""} onChange={(e) => cambiar(f.clave, { proveedorId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Proveedor…</option>
                    {proveedores
                      ?.filter((p) => p.activo || p.id === f.proveedorId)
                      .map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select className={`${inputCelda} w-24!`} value={f.moneda ?? ""} onChange={(e) => cambiar(f.clave, { moneda: (e.target.value || null) as Fila["moneda"] })}>
                    <option value="">{tarifa.moneda}</option>
                    <option value={tarifa.moneda === "USD" ? "PEN" : "USD"}>{tarifa.moneda === "USD" ? "PEN" : "USD"}</option>
                  </select>
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Quitar concepto"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <button type="button" onClick={agregar} className={btnSecundario} disabled={!conceptos?.some((c) => c.activo && !usados.has(c.id))}>
          <Plus size={16} /> Agregar concepto
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onTerminar} className={btnSecundario}>
            <X size={16} /> Cancelar
          </button>
          <button type="button" onClick={enviar} disabled={guardando} className={btnPrimario}>
            <Save size={16} /> {guardando ? "Guardando..." : "Guardar conceptos"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tabla de tramos sobre el FOB o CIF: hasta cada límite se cobra un porcentaje o un importe fijo.
 * El último tramo queda sin límite ("en adelante").
 */
function EditorTramos({ fila: f, onCambiar }: { fila: Fila; onCambiar: (c: Partial<Fila>) => void }) {
  const tramos = f.tramos ?? [];
  const poner = (lista: Tramo[]) => onCambiar({ tramos: lista });
  const cambiarTramo = (i: number, c: Partial<Tramo>) => poner(tramos.map((t, j) => (j === i ? { ...t, ...c } : t)));
  return (
    <div className="space-y-1">
      <select className={`${inputCelda} w-32!`} value={f.basePorcentaje ?? "CIF"} onChange={(e) => onCambiar({ basePorcentaje: e.target.value as "FOB" | "CIF" })}>
        <option value="CIF">sobre el CIF</option>
        <option value="FOB">sobre el FOB</option>
      </select>
      {tramos.map((t, i) => {
        const ultimo = i === tramos.length - 1;
        const esPorcentaje = t.porcentaje != null;
        return (
          <div key={i} className="flex items-center gap-1">
            <span className="w-10 text-[11px] text-slate-500">{ultimo ? "resto" : "hasta"}</span>
            {ultimo ? (
              <span className="w-24 text-[11px] text-slate-400">en adelante</span>
            ) : (
              <input
                type="number" min={0} step="1" className={`${inputCelda} w-24!`} aria-label={`Límite del tramo ${i + 1}`}
                value={t.hasta ?? ""} onChange={(e) => cambiarTramo(i, { hasta: numeroONulo(e.target.value) })}
              />
            )}
            <input
              type="number" min={0} step="0.01" className={`${inputCelda} w-20!`} aria-label={`Valor del tramo ${i + 1}`}
              value={(esPorcentaje ? t.porcentaje : t.importe) ?? ""}
              onChange={(e) => cambiarTramo(i, esPorcentaje ? { porcentaje: numeroONulo(e.target.value) } : { importe: numeroONulo(e.target.value) })}
            />
            <select
              className={`${inputCelda} w-16!`} value={esPorcentaje ? "%" : "$"} aria-label={`Tipo del tramo ${i + 1}`}
              onChange={(e) => cambiarTramo(i, e.target.value === "%" ? { porcentaje: t.importe ?? 0, importe: null } : { importe: t.porcentaje ?? 0, porcentaje: null })}
            >
              <option value="%">%</option>
              <option value="$">fijo</option>
            </select>
            {tramos.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const lista = tramos.filter((_, j) => j !== i);
                  // El último siempre queda abierto
                  poner(lista.map((x, j) => (j === lista.length - 1 ? { ...x, hasta: null } : x)));
                }}
                className="rounded p-1 text-slate-400 hover:text-red-600"
                aria-label={`Quitar tramo ${i + 1}`}
              >
                <X size={13} />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          // El nuevo tramo entra antes del último (que sigue siendo "en adelante")
          const previo = tramos[tramos.length - 2]?.hasta ?? 0;
          const nuevo: Tramo = { hasta: previo + 10000, porcentaje: tramos[tramos.length - 1]?.porcentaje ?? 0.5 };
          const ultimoTramo = tramos[tramos.length - 1];
          poner(ultimoTramo ? [...tramos.slice(0, -1), nuevo, ultimoTramo] : [{ hasta: null, porcentaje: 0.5 }]);
        }}
        className="text-[11px] font-medium text-slate-600 hover:underline"
      >
        + Agregar tramo
      </button>
    </div>
  );
}
