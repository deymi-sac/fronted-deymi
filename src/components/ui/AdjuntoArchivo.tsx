import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { btnSecundario } from "../../lib/estilos";
import { mensajeDeError } from "../../lib/useEnviar";

const MAXIMO_MB = 10;

/**
 * Foto o PDF de un documento (comprobante de un pago, constancia de un cobro): se ve, se reemplaza o se quita.
 * Acepta PDF, JPG, PNG y WEBP de hasta 10 MB; el servidor vuelve a comprobarlo.
 */
export function AdjuntoArchivo({
  titulo,
  url,
  editable,
  onSubir,
  onQuitar,
  alCambiar,
}: {
  titulo: string;
  url: string | null;
  editable: boolean;
  onSubir: (archivo: File) => Promise<unknown>;
  onQuitar: () => Promise<unknown>;
  alCambiar: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const subir = useMutation({
    mutationFn: onSubir,
    onSuccess: () => {
      setAviso(null);
      alCambiar();
    },
    onError: (e) => setAviso(mensajeDeError(e)),
  });
  const quitar = useMutation({
    mutationFn: onQuitar,
    onSuccess: () => {
      setAviso(null);
      alCambiar();
    },
    onError: (e) => setAviso(mensajeDeError(e)),
  });

  function elegido(archivo: File | undefined) {
    if (!archivo) return;
    if (archivo.size > MAXIMO_MB * 1024 * 1024) return setAviso(`El archivo pesa más de ${MAXIMO_MB} MB`);
    subir.mutate(archivo);
  }

  const ocupado = subir.isPending || quitar.isPending;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-800">{titulo}</p>
      {aviso && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{aviso}</p>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-slate-700 underline">
            <Paperclip size={15} /> Ver archivo adjunto
          </a>
        ) : (
          <span className="text-slate-400">Sin archivo adjunto</span>
        )}
        {editable && (
          <>
            <input ref={entrada} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => (elegido(e.target.files?.[0]), (e.target.value = ""))} />
            <button type="button" onClick={() => entrada.current?.click()} disabled={ocupado} className={btnSecundario}>
              <Upload size={15} /> {subir.isPending ? "Subiendo..." : url ? "Reemplazar" : "Adjuntar PDF o foto"}
            </button>
            {url && (
              <button type="button" onClick={() => quitar.mutate()} disabled={ocupado} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
                <Trash2 size={14} /> Quitar
              </button>
            )}
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">PDF, JPG, PNG o WEBP de hasta {MAXIMO_MB} MB.</p>
    </div>
  );
}
