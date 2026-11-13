import { useState } from "react";

export interface DatosEnvio {
  referencia: string;
  cliente: string;
  placas: string;
  conductor: string;
  brevete: string | null;
}

/**
 * Tarjeta compacta con lo que se envía del servicio (referencia, cliente, placas,
 * conductor y brevete), pensada para tomarle una captura de pantalla o copiar el texto.
 */
export function DatosEnvioModal({
  datos,
  onClose,
}: {
  datos: DatosEnvio;
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const texto = [
    `REFERENCIA: ${datos.referencia}`,
    `CLIENTE: ${datos.cliente}`,
    `PLACAS: ${datos.placas}`,
    `CONDUCTOR: ${datos.conductor}`,
    `BREVETE: ${datos.brevete ?? "—"}`,
  ].join("\n");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  const filas: [string, string][] = [
    ["Referencia de servicio", datos.referencia],
    ["Cliente", datos.cliente],
    ["Placas de la unidad", datos.placas],
    ["Conductor", datos.conductor],
    ["Brevete", datos.brevete ?? "—"],
  ];

  const [estadoImagen, setEstadoImagen] = useState<"" | "ok" | "error">("");

  /** Dibuja la tarjeta en una imagen PNG y la deja en el portapapeles, lista para pegar. */
  async function copiarImagen() {
    try {
      const escala = 2;
      const ancho = 420;
      const margen = 24;
      const altoFila = 58;
      const alto = margen * 2 + altoFila * filas.length - 14;
      const canvas = document.createElement("canvas");
      canvas.width = ancho * escala;
      canvas.height = alto * escala;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("sin canvas");
      ctx.scale(escala, escala);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ancho, alto);
      const fuente = "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
      filas.forEach(([etiqueta, valor], i) => {
        const y = margen + i * altoFila;
        ctx.fillStyle = "#94a3b8";
        ctx.font = `600 11px ${fuente}`;
        ctx.textBaseline = "top";
        ctx.fillText(etiqueta.toUpperCase(), margen, y);
        ctx.fillStyle = "#0f172a";
        ctx.font = `600 17px ${fuente}`;
        let linea = valor;
        while (ctx.measureText(linea).width > ancho - margen * 2 && linea.length > 1) linea = linea.slice(0, -1);
        if (linea !== valor) linea = linea.slice(0, -1) + "…";
        ctx.fillText(linea, margen, y + 18);
      });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("sin imagen");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setEstadoImagen("ok");
    } catch {
      setEstadoImagen("error");
    }
    setTimeout(() => setEstadoImagen(""), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md">
        {/* Esta es la parte que se captura */}
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <dl className="space-y-4">
            {filas.map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {etiqueta}
                </dt>
                <dd className="mt-0.5 text-base font-semibold text-slate-900">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={copiarImagen}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            {estadoImagen === "ok" ? "¡Imagen copiada!" : estadoImagen === "error" ? "No se pudo copiar" : "Copiar imagen"}
          </button>
          <button
            type="button"
            onClick={copiar}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {copiado ? "¡Copiado!" : "Copiar texto"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
