/** Búsqueda tolerante: sin tildes ni mayúsculas, palabras en cualquier orden y errores de tipeo ("estiva" encuentra "estiba"). */

export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();

/** Pares de letras de una palabra, para comparar palabras parecidas. */
function pares(palabra: string) {
  const r: string[] = [];
  for (let i = 0; i < palabra.length - 1; i++) r.push(palabra.slice(i, i + 2));
  return r;
}

/** 0 a 1: qué tanto se parecen dos palabras (coeficiente de Dice sobre pares de letras). */
function parecido(a: string, b: string) {
  if (a === b) return 1;
  const pa = pares(a);
  const pb = pares(b);
  if (!pa.length || !pb.length) return 0;
  let comunes = 0;
  const resto = [...pb];
  for (const p of pa) {
    const i = resto.indexOf(p);
    if (i >= 0) {
      comunes++;
      resto.splice(i, 1);
    }
  }
  return (2 * comunes) / (pa.length + pb.length);
}

/** Puntaje de qué tan parecido es `texto` a lo escrito (0 = no se parece). */
export function puntaje(escrito: string, texto: string) {
  const q = normalizar(escrito);
  const t = normalizar(texto);
  if (!q) return 0;
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2.5;
  const palabras = t.split(" ");
  const buscadas = q.split(" ");
  let suma = 0;
  for (const b of buscadas) {
    // La palabra está (o empieza una palabra del texto); si no, la más parecida
    const mejor = palabras.some((p) => p.startsWith(b)) || t.includes(b) ? 1 : Math.max(...palabras.map((p) => parecido(b, p)));
    if (mejor < 0.5) return 0;
    suma += mejor;
  }
  return (2 * suma) / buscadas.length;
}

/** Los elementos ordenados de más a menos parecido a lo escrito. */
export function buscarParecidos<T>(escrito: string, items: T[], texto: (item: T) => string, limite = 8) {
  return items
    .map((item) => ({ item, p: puntaje(escrito, texto(item)) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || texto(a.item).length - texto(b.item).length)
    .slice(0, limite)
    .map((x) => x.item);
}
