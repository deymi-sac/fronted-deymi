import { inputClass } from "../../lib/estilos";
import { dinero, redondear } from "../../lib/formato";
import type { Moneda, Proveedor } from "../maestros/maestros.api";
import type { GastoProforma } from "./pagos.api";

/** Lo que se llena de cada ítem marcado: el resto del pago (fecha, medio, evidencia…) es común. */
export interface ItemMarcado {
  proveedorId: number;
  serieNumero: string;
  importe: number | null;
  igv: number | null;
}

const numeroONulo = (v: string) => (v === "" ? null : Number(v));

const celda = `${inputClass} px-2! py-1.5! text-sm!`;

/**
 * Los gastos de terceros de la proforma como checklist (igual que al facturar): se marcan los que se pagan y cada uno
 * trae su proveedor de la tarifa. Un pago por ítem marcado.
 */
export function ChecklistGastos({
  gastos,
  marcados,
  onCambiar,
  proveedores,
  moneda,
  tasaIgv,
  onNuevoProveedor,
}: {
  gastos: GastoProforma[];
  marcados: Record<number, ItemMarcado>;
  onCambiar: (m: Record<number, ItemMarcado>) => void;
  proveedores: Proveedor[];
  moneda: Moneda;
  tasaIgv: number;
  /** Si se puede registrar proveedores: abre el formulario para el ítem (id del gasto) */
  onNuevoProveedor?: (gastoId: number) => void;
}) {
  const pendientes = gastos.filter((g) => g.tipo === "GASTO_TERCERO" && !g.pago);
  const pagados = gastos.filter((g) => g.tipo === "GASTO_TERCERO" && g.pago);

  function marcar(g: GastoProforma, si: boolean) {
    const siguiente = { ...marcados };
    if (!si) {
      delete siguiente[g.id];
      return onCambiar(siguiente);
    }
    // Cada ítem empieza sin N.° de comprobante: no se copia el de otro ítem
    siguiente[g.id] = { proveedorId: g.proveedorId ?? 0, serieNumero: "", importe: null, igv: 0 };
    onCambiar(siguiente);
  }

  function cambiar(id: number, c: Partial<ItemMarcado>) {
    onCambiar({ ...marcados, [id]: { ...marcados[id], ...c } });
  }

  if (pendientes.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {pagados.length ? "Todos los gastos de la proforma ya tienen pago." : "La proforma no trae gastos de terceros."} Si pagaste algo que no estaba en la
        proforma, llena el formulario de abajo.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-600">
        Marca lo que pagas: cada ítem trae su proveedor de la tarifa y se registra como un pago. Si algo no estaba en la proforma, no marques nada y llena
        el formulario de abajo.
      </p>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {pendientes.map((g) => {
          const m = marcados[g.id];
          const total = m ? redondear((m.importe ?? 0) + (m.igv ?? 0)) : 0;
          return (
            <li key={g.id} className={m ? "bg-slate-100" : ""}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
                <input type="checkbox" checked={!!m} onChange={(e) => marcar(g, e.target.checked)} className="size-4" />
                <span className="min-w-0 flex-1 font-medium text-slate-800">{g.descripcion}</span>
                <span className="whitespace-nowrap text-xs text-slate-500">Proformado {dinero(g.proformado, g.moneda)}</span>
              </label>
              {m && (
                <div className="grid gap-2 px-3 pb-3 pl-10 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <label className="text-xs text-slate-500">
                    Proveedor
                    <select
                      value={m.proveedorId}
                      onChange={(e) => {
                        const valor = Number(e.target.value);
                        if (valor === -1) return onNuevoProveedor?.(g.id);
                        cambiar(g.id, { proveedorId: valor });
                      }}
                      className={`${celda} mt-0.5 ${m.proveedorId ? "" : "border-amber-400!"}`}
                    >
                      <option value={0}>Elige el proveedor…</option>
                      {proveedores
                        .filter((p) => p.activo || p.id === m.proveedorId)
                        .map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                      {onNuevoProveedor && <option value={-1}>+ Registrar proveedor nuevo…</option>}
                    </select>
                  </label>
                  <label className="text-xs text-slate-500">
                    N.° comprobante
                    <input
                      value={m.serieNumero} maxLength={30}
                      onChange={(e) => cambiar(g.id, { serieNumero: e.target.value.toUpperCase() })}
                      className={`${celda} mt-0.5`}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Importe (base)
                    <input
                      type="number" min={0} step="0.01" value={m.importe ?? ""}
                      onChange={(e) => cambiar(g.id, { importe: numeroONulo(e.target.value) })}
                      className={`${celda} mt-0.5 ${m.importe ? "" : "border-amber-400!"}`}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    <span className="flex justify-between">
                      IGV
                      <button
                        type="button"
                        onClick={() => cambiar(g.id, { igv: redondear((m.importe ?? 0) * tasaIgv) })}
                        className="font-medium text-slate-700 hover:underline"
                      >
                        {Math.round(tasaIgv * 100)}%
                      </button>
                    </span>
                    <input
                      type="number" min={0} step="0.01" value={m.igv ?? ""}
                      onChange={(e) => cambiar(g.id, { igv: numeroONulo(e.target.value) })}
                      className={`${celda} mt-0.5`}
                    />
                  </label>
                  <span className="self-end whitespace-nowrap pb-2 text-right text-sm font-semibold text-slate-800">{dinero(total, moneda)}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {pagados.length > 0 && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">Ya pagados ({pagados.length})</summary>
          <ul className="mt-1 space-y-1 pl-4">
            {pagados.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-2">
                <span>{g.descripcion}</span>
                <span>· {g.pago!.serieNumero ?? "Sin comprobante"} · {dinero(g.pago!.total, g.pago!.moneda)}</span>
                <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 font-semibold text-green-700">Pagado</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
