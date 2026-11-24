import { useQuery } from "@tanstack/react-query";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { dinero } from "../../lib/formato";
import { obtenerGastosProforma, type GastoProforma } from "./pagos.api";

const claseFila = "flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2";
const claseGrupo = "mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500";

/**
 * Lo que trae la proforma de la operación: los gastos de terceros con su pago y los servicios propios,
 * que no requieren pago. Con `onElegir`, un gasto pendiente se elige para registrar su pago.
 */
export function GastosProforma({ operacionId, elegido, onElegir }: { operacionId: number; elegido?: number | null; onElegir?: (g: GastoProforma) => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["pagos", "gastos-proforma", operacionId], queryFn: () => obtenerGastosProforma(operacionId) });
  if (isLoading) return <p className="text-sm text-slate-400">Buscando los ítems de la proforma…</p>;
  if (error) return <p className="text-sm text-red-700">No se pudieron cargar los ítems de la proforma.</p>;
  if (!data?.length) return <p className="text-sm text-slate-500">La operación no tiene ítems de proforma.</p>;

  const gastos = data.filter((g) => g.tipo === "GASTO_TERCERO");
  const servicios = data.filter((g) => g.tipo === "SERVICIO_PROPIO");
  const pendientes = gastos.filter((g) => !g.pago).length;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        {gastos.length === 0
          ? "La proforma no trae gastos de terceros: no hay pagos pendientes."
          : pendientes === 0
            ? "Todos los gastos de terceros tienen pago."
            : `${pendientes === 1 ? "Falta" : "Faltan"} ${pendientes} de ${gastos.length} por pagar.`}
        {onElegir && pendientes > 0 && " Elige uno para registrar su pago, o usa otro concepto más abajo si no estaba en la proforma."}
      </p>

      {gastos.length > 0 && (
        <div>
          <p className={claseGrupo}>Gastos de terceros</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {gastos.map((g) => {
              const contenido = (
                <>
                  <span className="min-w-0 flex-1 text-left font-medium text-slate-800">{g.descripcion}</span>
                  <span className="whitespace-nowrap text-slate-500">Proformado {dinero(g.proformado, g.moneda)}</span>
                  {g.pago && (
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {g.pago.serieNumero ?? "Sin comprobante"} · {dinero(g.pago.total, g.pago.moneda)}
                    </span>
                  )}
                  <EstadoBadge estado={g.pago ? "APROBADA" : "BORRADOR"} texto={g.pago ? "Pagado" : "Pendiente"} />
                </>
              );
              return (
                <li key={g.id} className={elegido === g.id ? "bg-slate-100" : ""}>
                  {onElegir && !g.pago ? (
                    <button type="button" onClick={() => onElegir(g)} className={`${claseFila} hover:bg-slate-50`}>
                      {contenido}
                    </button>
                  ) : (
                    <div className={claseFila}>{contenido}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {servicios.length > 0 && (
        <div>
          <p className={claseGrupo}>Servicios propios</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {servicios.map((g) => (
              <li key={g.id} className={claseFila}>
                <span className="min-w-0 flex-1 font-medium text-slate-800">{g.descripcion}</span>
                <span className="whitespace-nowrap text-slate-500">Proformado {dinero(g.proformado, g.moneda)}</span>
                <span className="whitespace-nowrap text-xs text-slate-500">Se le cobra al cliente en la liquidación</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
