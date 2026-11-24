import { etiqueta } from "../../lib/formato";

const COLORES: Record<string, string> = {
  // Proforma
  BORRADOR: "border-slate-200 bg-slate-100 text-slate-600",
  ENVIADA: "border-blue-200 bg-blue-50 text-blue-700",
  APROBADA: "border-green-200 bg-green-50 text-green-700",
  RECHAZADA: "border-red-200 bg-red-50 text-red-700",
  CONVERTIDA: "border-violet-200 bg-violet-50 text-violet-700",
  VENCIDA: "border-amber-200 bg-amber-50 text-amber-700",
  // Operación
  ABIERTA: "border-blue-200 bg-blue-50 text-blue-700",
  FINALIZADA: "border-green-200 bg-green-50 text-green-700",
  EN_LIQUIDACION: "border-amber-200 bg-amber-50 text-amber-700",
  LIQUIDADA: "border-violet-200 bg-violet-50 text-violet-700",
  FACTURADA: "border-teal-200 bg-teal-50 text-teal-700",
  CERRADA: "border-slate-300 bg-slate-800 text-white",
  // Nota de cobranza y factura
  EMITIDA: "border-slate-200 bg-slate-100 text-slate-600",
  COBRADA_PARCIAL: "border-amber-200 bg-amber-50 text-amber-700",
  COBRADA: "border-green-200 bg-green-50 text-green-700",
  // Pago
  REGISTRADO: "border-slate-200 bg-slate-100 text-slate-600",
  REVISADO: "border-blue-200 bg-blue-50 text-blue-700",
  LIQUIDADO: "border-violet-200 bg-violet-50 text-violet-700",
  FACTURADO: "border-teal-200 bg-teal-50 text-teal-700",
  ANULADO: "border-slate-300 bg-slate-200 text-slate-500",
  // Liquidación
  ELABORADA: "border-slate-200 bg-slate-100 text-slate-600",
  REVISADA: "border-blue-200 bg-blue-50 text-blue-700",
  REABIERTA: "border-orange-200 bg-orange-50 text-orange-700",
  ANULADA: "border-slate-300 bg-slate-200 text-slate-500",
};

const TEXTOS: Record<string, string> = { EN_LIQUIDACION: "En liquidación", COBRADA_PARCIAL: "Cobrada en parte" };

/** Estado de una proforma, operación, pago o liquidación; `texto` cambia lo que se lee. */
export function EstadoBadge({ estado, texto }: { estado: string; texto?: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES[estado] ?? "bg-slate-100 text-slate-700"}`}>
      {texto ?? TEXTOS[estado] ?? (estado === "VENCIDA" ? "Vencida" : etiqueta(estado))}
    </span>
  );
}
