import { useState } from "react";
import type { ReactNode } from "react";
import { UNIDADES_ESTANDAR } from "./almacen.utils";

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

const OTRA_UNIDAD = "__otra__";

// Select de unidad con opción de escribir una nueva (ej. "Rollos", "Telas") cuando el cliente
// trabaja con algo que no está en la lista estándar.
export function UnidadSelect({
  value,
  onChange,
  className,
  opciones = UNIDADES_ESTANDAR,
  disabled,
}: {
  value: string;
  onChange: (valor: string) => void;
  className: string;
  opciones?: string[];
  disabled?: boolean;
}) {
  const [modoPersonalizado, setModoPersonalizado] = useState(value !== "" && !opciones.includes(value));

  if (modoPersonalizado) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej: Rollos"
          disabled={disabled}
          className={className}
        />
        <button
          type="button"
          title="Volver a la lista"
          onClick={() => {
            setModoPersonalizado(false);
            onChange(opciones[0]!);
          }}
          className="flex-shrink-0 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === OTRA_UNIDAD) {
          setModoPersonalizado(true);
          onChange("");
          return;
        }
        onChange(e.target.value);
      }}
      className={className}
    >
      {opciones.map((u) => (
        <option key={u}>{u}</option>
      ))}
      <option value={OTRA_UNIDAD}>+ Otra unidad...</option>
    </select>
  );
}
