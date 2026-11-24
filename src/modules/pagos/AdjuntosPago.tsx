import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { FormularioMotivo } from "../operaciones/FormulariosOperacion";
import { btnSecundario, inputClass } from "../../lib/estilos";
import { etiqueta } from "../../lib/formato";
import { mensajeDeError } from "../../lib/useEnviar";
import { enlaceAdjuntoPago, quitarAdjuntoPago, subirAdjuntoPago, TIPOS_DOCUMENTO_PAGO, type AdjuntoPago, type TipoDocumentoPago } from "./pagos.api";

const MAXIMO_MB = 10;
const tamano = (bytes: number | null) => (bytes == null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

/**
 * Comprobantes de un pago: varios por pago (factura, voucher, transferencia...), cada uno con su tipo.
 * Agregar los puede quien registra pagos; quitarlos, con motivo, quien corrige pagos y mientras el pago no esté liquidado.
 */
export function AdjuntosPago({
  pagoId,
  adjuntos,
  puedeAgregar,
  puedeQuitar,
  alCambiar,
}: {
  pagoId: number;
  adjuntos: AdjuntoPago[];
  puedeAgregar: boolean;
  puedeQuitar: boolean;
  alCambiar: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoDocumentoPago>("FACTURA");
  const [aviso, setAviso] = useState<string | null>(null);
  const [aQuitar, setAQuitar] = useState<AdjuntoPago | null>(null);

  const subir = useMutation({
    mutationFn: (archivo: File) => subirAdjuntoPago(pagoId, archivo, tipo),
    onSuccess: () => {
      setAviso(null);
      alCambiar();
    },
    onError: (e) => setAviso(mensajeDeError(e)),
  });
  const quitar = useMutation({
    mutationFn: (motivo: string) => quitarAdjuntoPago(pagoId, aQuitar!.id, motivo),
    onSuccess: () => {
      setAQuitar(null);
      setAviso(null);
      alCambiar();
    },
  });

  async function ver(a: AdjuntoPago) {
    try {
      const { url } = await enlaceAdjuntoPago(pagoId, a.id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setAviso(mensajeDeError(e));
    }
  }

  function elegido(archivo: File | undefined) {
    if (!archivo) return;
    if (archivo.size > MAXIMO_MB * 1024 * 1024) return setAviso(`El archivo pesa más de ${MAXIMO_MB} MB`);
    subir.mutate(archivo);
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-800">Comprobantes adjuntos ({adjuntos.length})</p>
      {aviso && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{aviso}</p>}
      {adjuntos.length === 0 ? (
        <p className="text-sm text-slate-400">Sin comprobantes adjuntos</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {adjuntos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="mr-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{etiqueta(a.tipoDocumento)}</span>
                <button type="button" onClick={() => ver(a)} className="inline-flex items-center gap-1 font-medium text-slate-700 underline">
                  <Paperclip size={13} /> {a.nombreArchivo}
                </button>
                <span className="ml-2 text-xs text-slate-400">
                  {tamano(a.tamanoBytes)} · {a.subidoPor} · {fechaHora(a.subidoEn)}
                </span>
              </span>
              {puedeQuitar && (
                <button type="button" onClick={() => setAQuitar(a)} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline">
                  <Trash2 size={14} /> Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {puedeAgregar && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumentoPago)} className={`${inputClass} w-auto`} aria-label="Tipo de documento">
            {TIPOS_DOCUMENTO_PAGO.map((t) => (
              <option key={t} value={t}>
                {etiqueta(t)}
              </option>
            ))}
          </select>
          <input ref={entrada} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => (elegido(e.target.files?.[0]), (e.target.value = ""))} />
          <button type="button" onClick={() => entrada.current?.click()} disabled={subir.isPending} className={btnSecundario}>
            <Upload size={15} /> {subir.isPending ? "Subiendo..." : "Adjuntar PDF o foto"}
          </button>
          <span className="text-xs text-slate-400">PDF, JPG, PNG o WEBP de hasta {MAXIMO_MB} MB.</span>
        </div>
      )}
      {aQuitar && (
        <FormularioMotivo
          titulo={`Quitar «${aQuitar.nombreArchivo}»`}
          textoGuardar="Quitar adjunto"
          ayuda="Queda en el historial del pago con tu nombre"
          onCerrar={() => setAQuitar(null)}
          onGuardar={(m) => quitar.mutate(m)}
          guardando={quitar.isPending}
          error={quitar.isError ? mensajeDeError(quitar.error) : null}
        />
      )}
    </div>
  );
}
