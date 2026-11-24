import { Campo } from "./FormularioModal";
import { inputClass } from "../../lib/estilos";

/**
 * Motivo obligatorio al corregir algo que ya está liquidado o facturado (por una equivocación).
 * `razon` es lo que devuelve el backend, ej. "la operación OP-2026-000616 ya está liquidada y tiene la factura FF01-1760".
 */
export function CampoMotivoCambio({
  razon,
  valor,
  onCambiar,
  ayuda,
  className = "sm:col-span-2",
}: {
  razon: string;
  valor: string;
  onCambiar: (v: string) => void;
  ayuda?: string;
  className?: string;
}) {
  return (
    <Campo
      label="Motivo del cambio"
      requerido
      className={className}
      ayuda={ayuda ?? `Se pide porque ${razon}. Queda en el historial junto con lo que se cambió.`}
    >
      <textarea
        rows={2}
        value={valor}
        maxLength={500}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Ej.: se registró mal la DAM / el valor FOB"
        className={inputClass}
      />
    </Campo>
  );
}
