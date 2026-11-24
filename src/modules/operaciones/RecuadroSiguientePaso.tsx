import { ArrowRight, CheckCircle2, Circle, CircleDot } from "lucide-react";
import { Link } from "react-router-dom";
import { btnPrimario } from "../../lib/estilos";
import type { SiguientePaso } from "./operaciones.api";

/** Recuadro del detalle de la operación: en qué etapa va y qué falta, con un botón a esa pantalla. */
export function RecuadroSiguientePaso({ siguiente }: { siguiente?: SiguientePaso }) {
  // Sin datos (ej. backend anterior todavía publicándose): no se muestra
  if (!siguiente?.etapas?.length) return null;
  const { paso } = siguiente;
  return (
    <section className="mb-6 rounded-xl border border-marca-200 bg-marca-100/40 p-4">
      <ol className="mb-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
        {siguiente.etapas.map((e, i) => {
          const actual = e.nombre === siguiente.etapa;
          const Icono = e.hecha ? CheckCircle2 : actual ? CircleDot : Circle;
          return (
            <li key={e.nombre} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1 h-px w-4 bg-slate-300" />}
              <Icono size={14} className={e.hecha ? "text-emerald-600" : actual ? "text-marca-700" : "text-slate-300"} />
              <span className={e.hecha ? "text-slate-600" : actual ? "font-semibold text-marca-800" : "text-slate-400"}>{e.nombre}</span>
            </li>
          );
        })}
      </ol>
      {paso ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">
              Siguiente paso{siguiente.etapa && ` · etapa ${siguiente.etapas.findIndex((e) => e.nombre === siguiente.etapa) + 1} de ${siguiente.etapas.length}`}
            </p>
            <p className="font-semibold text-slate-900">{paso.titulo}</p>
            <p className="text-sm text-slate-600">{paso.detalle}</p>
          </div>
          <Link to={paso.ruta} className={`${btnPrimario} brillo`}>
            {paso.boton} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={16} /> Operación completa: no quedan pasos pendientes.
        </p>
      )}
    </section>
  );
}
