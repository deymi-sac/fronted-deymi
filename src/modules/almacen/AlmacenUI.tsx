import { useState } from "react";
import type { ReactNode } from "react";
import type { MovimientoAlmacen } from "./almacen.api";

export const inputClassGenerico =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}

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

// Devuelve el total de bultos de un movimiento, ya sumado (no el detalle por pallet).
// En un Ingreso, "cantidad_bultos" es bultos POR pallet (salvo que haya detalle distinto
// por pallet, que ya viene desglosado); en una Salida es directamente el total retirado.
export function totalBultosMovimiento(m: MovimientoAlmacen): { total: number; unidad: string | null } | null {
  if (m.detalle_bultos_pallets.length > 0) {
    return { total: m.detalle_bultos_pallets.reduce((acc, v) => acc + v, 0), unidad: m.unidad_bultos };
  }
  if (m.cantidad_bultos == null) return null;
  const total = m.tipo === "Ingreso" ? m.cantidad_bultos * Number(m.cantidad) : m.cantidad_bultos;
  return { total, unidad: m.unidad_bultos };
}

// Capacidad de bultos de un Ingreso, en palabras: "20 pallets de 20 bultos c/u" cuando todos
// son iguales, o "10 pallets de 50 + 5 pallets de 30" cuando cambian. Las salidas no tienen.
export function capacidadBultosMovimiento(m: MovimientoAlmacen): string | null {
  if (m.tipo !== "Ingreso") return null;
  const plural = (n: number) => (n === 1 ? "pallet" : "pallets");

  if (m.detalle_bultos_pallets.length > 0) {
    const grupos = new Map<number, number>();
    for (const b of m.detalle_bultos_pallets) grupos.set(b, (grupos.get(b) ?? 0) + 1);
    if (grupos.size === 1) {
      const [[bultos, pallets]] = [...grupos.entries()] as [[number, number]];
      return `${pallets} ${plural(pallets)} de ${bultos} bultos c/u`;
    }
    return [...grupos.entries()].map(([bultos, pallets]) => `${pallets} ${plural(pallets)} de ${bultos}`).join(" + ");
  }
  if (m.cantidad_bultos != null) {
    const pallets = m.pallets_ocupados ?? Number(m.cantidad);
    return `${pallets} ${plural(pallets)} de ${m.cantidad_bultos} bultos c/u`;
  }
  return null;
}

// Desglose de lo que tiene un cliente: "12 pallets · 100 cajas · 15 rollos".
export function desgloseStock(pallets: number, unidades: Record<string, number> = {}): string {
  const partes: string[] = [];
  if (pallets > 0) partes.push(`${pallets} ${pallets === 1 ? "pallet" : "pallets"}`);
  for (const [unidad, cantidad] of Object.entries(unidades)) partes.push(`${cantidad} ${unidad.toLowerCase()}`);
  return partes.length > 0 ? partes.join(" · ") : "Sin stock";
}

export const UNIDADES_ESTANDAR = ["Pallet", "Cajas", "Und", "Saco"];
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

export function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
