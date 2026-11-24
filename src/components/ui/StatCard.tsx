import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

const TONOS = {
  base: "bg-slate-100 text-slate-700",
  verde: "bg-emerald-100 text-emerald-700",
  ambar: "bg-amber-100 text-amber-700",
  rojo: "bg-red-100 text-red-700",
  violeta: "bg-violet-100 text-violet-700",
  cielo: "bg-sky-100 text-sky-700",
};

/** Resumen de una cifra con su ícono: lo que se ve primero en una pantalla (con `to`, lleva a otra). */
export function StatCard({
  label,
  valor,
  detalle,
  icono: Icono,
  tono = "base",
  to,
}: {
  label: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono: LucideIcon;
  tono?: keyof typeof TONOS;
  to?: string;
}) {
  const contenido = (
    <>
      <div className={`rounded-lg p-2.5 ${TONOS[tono]}`}>
        <Icono size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-slate-900">{valor}</p>
        {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
      </div>
    </>
  );
  const clase = "flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
  return to ? (
    <Link to={to} className={`${clase} transition hover:border-slate-400 hover:shadow`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
