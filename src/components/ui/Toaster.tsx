import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cerrarToast, useToasts } from "../../lib/toast";

const ICONO = { exito: CheckCircle2, error: XCircle, info: Info };
const COLOR = { exito: "text-emerald-500", error: "text-red-500", info: "text-sky-400" };

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-80 flex-col gap-2 print:hidden">
      {toasts.map((t) => {
        const Icono = ICONO[t.tono];
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm text-white shadow-xl">
            <Icono size={18} className={`mt-0.5 shrink-0 ${COLOR[t.tono]}`} />
            <span className="min-w-0 flex-1">
              {t.titulo && <b className="block">{t.titulo}</b>}
              {t.mensaje}
              {t.enlace && (
                <Link
                  to={t.enlace.ruta}
                  onClick={() => cerrarToast(t.id)}
                  className="brillo mt-2 block w-fit rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950 hover:bg-amber-300"
                >
                  {t.enlace.texto} →
                </Link>
              )}
            </span>
            {(t.titulo || t.enlace) && (
              <button onClick={() => cerrarToast(t.id)} className="shrink-0 text-slate-400 hover:text-white" aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
