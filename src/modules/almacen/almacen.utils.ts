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

// Fecha de hoy según el reloj de quien usa la pantalla (YYYY-MM-DD), no la fecha UTC: en Perú, desde
// las 19:00 la fecha UTC ya es la del día siguiente.
export function fechaLocalHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
