import { useState } from "react";
import { Campo, Modal } from "./FormularioModal";
import { inputClass } from "../../lib/estilos";
import { hoyISO } from "../../lib/formato";

/** Corregir una sola fecha de un documento ya registrado (factura, cobro, pago). El cambio queda en el historial. */
export function CorregirFechaModal({
  titulo,
  label,
  valor,
  min,
  ayuda,
  guardando,
  error,
  onGuardar,
  onCerrar,
}: {
  titulo: string;
  label: string;
  valor: string;
  /** Fecha mínima permitida (ej. la apertura de la operación) */
  min?: string;
  ayuda?: string;
  guardando: boolean;
  error: string | null;
  onGuardar: (fecha: string) => void;
  onCerrar: () => void;
}) {
  const [fecha, setFecha] = useState(valor);
  return (
    <Modal
      titulo={titulo}
      onCerrar={onCerrar}
      onGuardar={() => (fecha === valor ? onCerrar() : onGuardar(fecha))}
      guardando={guardando}
      error={error}
      textoGuardar="Guardar fecha"
      ancho="max-w-md"
    >
      <Campo label={label} className="sm:col-span-2" ayuda={ayuda ?? "No puede ser futura. El cambio queda en el historial con la fecha anterior."}>
        <input type="date" min={min} max={hoyISO()} value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className={inputClass} />
      </Campo>
    </Modal>
  );
}
