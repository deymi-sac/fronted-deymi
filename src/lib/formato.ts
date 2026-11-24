/** "ENTIDAD_PUBLICA" → "Entidad publica" para mostrar valores de lista en pantalla. */
export const etiqueta = (valor: string) => valor.charAt(0) + valor.slice(1).toLowerCase().replace(/_/g, " ");

/** 1234.5 → "US$ 1,234.50" / "S/ 1,234.50" */
export const dinero = (valor: number, moneda: string) =>
  `${moneda === "PEN" ? "S/" : "US$"} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 1234.5 → "1,234.50" (sin símbolo, para las columnas de un documento) */
export const num = (valor: number) => valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Redondeo a 2 decimales (evita 0.1 + 0.2 = 0.30000000000000004). */
export const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

/** Hoy, en hora local, como AAAA-MM-DD */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Suma días a una fecha AAAA-MM-DD */
export function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE",
  "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDOS", "VEINTITRES", "VEINTICUATRO", "VEINTICINCO",
  "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

/** 0–999 en letras */
function centenasEnLetras(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const resto = r < 30 ? UNIDADES[r] : `${DECENAS[Math.floor(r / 10)]}${r % 10 ? ` Y ${UNIDADES[r % 10]}` : ""}`;
  return [CENTENAS[c], resto].filter(Boolean).join(" ");
}

/** "UNO" se apocopa delante de MIL / MILLONES: "VEINTIUN MIL", "UN MILLON" */
const apocope = (t: string) => t.replace(/UNO$/, "UN");

function enteroEnLetras(n: number): string {
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  return [
    millones ? (millones === 1 ? "UN MILLON" : `${apocope(enteroEnLetras(millones))} MILLONES`) : "",
    miles ? (miles === 1 ? "MIL" : `${apocope(centenasEnLetras(miles))} MIL`) : "",
    centenasEnLetras(resto),
  ]
    .filter(Boolean)
    .join(" ");
}

/** 885.27 → "OCHOCIENTOS OCHENTA Y CINCO CON 27/100 DOLARES" */
export function montoEnLetras(monto: number, moneda: "PEN" | "USD") {
  const centimos = Math.round(Math.abs(monto) * 100);
  const entero = Math.floor(centimos / 100);
  return `${enteroEnLetras(entero)} CON ${String(centimos % 100).padStart(2, "0")}/100 ${moneda === "USD" ? "DOLARES" : "SOLES"}`;
}
