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
  const plural = (n: number) => (n === 1 ? "pallet" : "pallets");
  if (m.tipo === "Salida") {
    const de = m.detalle_pallets_origen;
    // Pallets completos eligiendo cuáles salen: "1 pallet de 40 bultos + 2 pallets de 20 bultos".
    if (m.detalle_bultos_pallets.length === 0 && de.length > 0) {
      const grupos = new Map<number, number>();
      for (const b of de) grupos.set(b, (grupos.get(b) ?? 0) + 1);
      return [...grupos.entries()].map(([bultos, pallets]) => `${pallets} ${plural(pallets)} de ${bultos} bultos`).join(" + ");
    }
    // Retiro de bultos eligiendo el pallet: "1 pallet de 40 bultos: salen 20 + 2 pallets de 20 bultos: salen 10 c/u".
    if (m.detalle_bultos_pallets.length > 0 && de.length === m.detalle_bultos_pallets.length) {
      const grupos = new Map<string, { de: number; sale: number; pallets: number }>();
      m.detalle_bultos_pallets.forEach((sale, i) => {
        const clave = `${de[i]}|${sale}`;
        const g = grupos.get(clave) ?? { de: de[i]!, sale, pallets: 0 };
        g.pallets += 1;
        grupos.set(clave, g);
      });
      return [...grupos.values()]
        .map((g) => `${g.pallets} ${plural(g.pallets)} de ${g.de} bultos: salen ${g.sale}${g.pallets > 1 ? " c/u" : ""}`)
        .join(" + ");
    }
    // Retiro de bultos con detalle por pallet: "3 pallets de 10 + 1 pallet de 50 bultos".
    if (m.detalle_bultos_pallets.length === 0) return null;
    const grupos = new Map<number, number>();
    for (const b of m.detalle_bultos_pallets) grupos.set(b, (grupos.get(b) ?? 0) + 1);
    return `${[...grupos.entries()].map(([bultos, pallets]) => `${pallets} ${plural(pallets)} de ${bultos}`).join(" + ")} bultos`;
  }
  if (m.tipo !== "Ingreso") return null;

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

export interface TamanoDePallet {
  bultos: number;
  pallets: number;
}

interface GrupoDeRetiro {
  cantidadPallets: string;
  bultosPorPallet: string;
  dePallet: string;
}

// Aplica un grupo ("n pallets de d bultos, salen b") a los pallets que quedan: los n pallets de d bultos
// pasan a tener d-b (o desaparecen si salen completos). Devuelve false si no hay n pallets de d bultos.
function aplicarGrupo(tamanos: Map<number, number>, n: number, d: number, b: number): boolean {
  const hay = tamanos.get(d) ?? 0;
  if (hay < n) return false;
  tamanos.set(d, hay - n);
  if (d - b > 0) tamanos.set(d - b, (tamanos.get(d - b) ?? 0) + n);
  return true;
}

const grupoCompleto = (g: GrupoDeRetiro) => /^\d+$/.test(g.cantidadPallets.trim()) && /^\d+$/.test(g.dePallet) && Number(g.cantidadPallets) > 0;

// Pallets que quedan en un ingreso después de aplicar los grupos anteriores de un mismo retiro: un grupo
// puede partir un pallet de 40 en uno de 20 y el siguiente grupo ya puede elegir ese pallet de 20.
// "completos": los pallets salen enteros (no queda resto).
export function tamanosTrasGrupos(tamanos: TamanoDePallet[], grupos: GrupoDeRetiro[], completos: boolean): TamanoDePallet[] {
  const mapa = new Map(tamanos.map((t) => [t.bultos, t.pallets]));
  for (const g of grupos) {
    if (!grupoCompleto(g)) continue;
    const d = Number(g.dePallet);
    const b = completos ? d : Number(g.bultosPorPallet);
    if (!Number.isInteger(b) || b <= 0 || b > d) continue;
    aplicarGrupo(mapa, Number(g.cantidadPallets), d, b);
  }
  return [...mapa.entries()]
    .filter(([, pallets]) => pallets > 0)
    .map(([bultos, pallets]) => ({ bultos, pallets }))
    .sort((a, b) => b.bultos - a.bultos);
}

// Primer grupo que no se puede cumplir con los pallets que quedan después de los anteriores (o null).
export function errorDeSecuencia(tamanos: TamanoDePallet[], grupos: GrupoDeRetiro[], completos: boolean): string | null {
  const mapa = new Map(tamanos.map((t) => [t.bultos, t.pallets]));
  for (const g of grupos) {
    if (!grupoCompleto(g)) continue;
    const d = Number(g.dePallet);
    const b = completos ? d : Number(g.bultosPorPallet);
    if (!Number.isInteger(b) || b <= 0 || b > d) continue;
    const n = Number(g.cantidadPallets);
    if (!aplicarGrupo(mapa, n, d, b)) {
      const quedan = mapa.get(d) ?? 0;
      return `No alcanzan los pallets: piden ${n} de ${d} bultos y en ese punto solo quedan ${quedan}.`;
    }
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

// Suma días a una fecha "YYYY-MM-DD" (sin problemas de zona horaria).
export function fechaMasDias(iso: string, dias: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const fecha = new Date(Date.UTC(y!, m! - 1, d! + dias));
  return fecha.toISOString().slice(0, 10);
}

export function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
