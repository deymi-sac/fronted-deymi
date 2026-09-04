// Formatea una fecha ISO (ej. "2026-01-09T00:00:00.000Z") a DD/MM/YYYY
// SIN aplicar conversión de zona horaria (evita el bug de "se corre un día")
export function formatearFecha(fechaISO: string): string {
  const soloFecha = fechaISO.split("T")[0]; // "2026-01-09"
  const [year, month, day] = soloFecha.split("-");
  return `${day}/${month}/${year}`;
}