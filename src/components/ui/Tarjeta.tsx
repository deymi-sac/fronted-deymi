import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

/** Bloque con título (y acciones opcionales a la derecha), para agrupar campos o tablas de una pantalla. */
export function Tarjeta({
  titulo,
  acciones,
  sinPadding,
  className,
  children,
}: {
  titulo?: ReactNode;
  acciones?: ReactNode;
  sinPadding?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm ${className ?? ""}`}>
      {(titulo || acciones) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
          {acciones}
        </header>
      )}
      <div className={sinPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

const TONOS = {
  error: { clase: "border-red-200 bg-red-50 text-red-700", icono: XCircle },
  advertencia: { clase: "border-amber-200 bg-amber-50 text-amber-800", icono: AlertTriangle },
  exito: { clase: "border-green-200 bg-green-50 text-green-700", icono: CheckCircle2 },
  info: { clase: "border-slate-200 bg-slate-50 text-slate-600", icono: Info },
} as const;

/** Mensaje destacado: error, advertencia, éxito o información. */
export function Aviso({ tono, titulo, children }: { tono: keyof typeof TONOS; titulo: string; children?: ReactNode }) {
  const { clase, icono: Icono } = TONOS[tono];
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${clase}`}>
      <Icono size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{titulo}</p>
        {children && <div className="mt-0.5">{children}</div>}
      </div>
    </div>
  );
}
