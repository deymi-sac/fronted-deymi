import type { ReactNode } from "react";

export const inputClassGenerico =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function KpiCard({
  icon,
  title,
  value,
  description,
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">{icon}</div>
        <span className="text-sm font-medium text-slate-500">{title}</span>
      </div>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
  );
}

type PillTone = "green" | "amber" | "red" | "blue" | "slate";

const pillTones: Record<PillTone, string> = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  slate: "bg-slate-100 text-slate-500 border-slate-200",
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${pillTones[tone]}`}>
      {children}
    </span>
  );
}

const alertTones: Record<"red" | "amber" | "neutral", string> = {
  red: "bg-red-50 border-red-200 text-red-700",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  neutral: "bg-slate-50 border-slate-200 text-slate-600",
};

export function AlertaCard({
  nivel,
  titulo,
  detalle,
}: {
  nivel: "red" | "amber" | "neutral";
  titulo: string;
  detalle: string;
}) {
  return (
    <div className={`rounded-xl border p-3.5 ${alertTones[nivel]}`}>
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="mt-1 text-xs leading-relaxed">{detalle}</p>
    </div>
  );
}

export function formatearMoneda(valor: number | null) {
  if (valor === null) return "Pendiente";
  return `US$ ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
