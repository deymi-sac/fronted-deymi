import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { inputClass } from "../../lib/estilos";
import { dinero, hoyISO, sumarDias } from "../../lib/formato";
import { useEnviar } from "../../lib/useEnviar";
import type { Moneda } from "../maestros/maestros.api";
import { useClientes } from "../maestros/useMaestros";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";
import { generarNota, useCuentasBancarias } from "./cobranza.api";

/**
 * Genera la nota de cobranza de una liquidación aprobada. Con cobro en soles y en dólares hay una nota por moneda:
 * aquí se elige de cuál. El vencimiento y las condiciones salen del cliente y de la empresa si se dejan vacíos.
 */
export function GenerarNotaModal({
  liquidacionId,
  opciones,
  fechaFacturas,
  clienteId,
  onCerrar,
}: {
  liquidacionId: number;
  /** Monedas que aún no tienen nota vigente, con lo que se cobra en cada una */
  opciones: { moneda: Moneda; total: number }[];
  /** Fecha de la última factura vigente de cada moneda: se sugiere como emisión de la nota */
  fechaFacturas: Partial<Record<Moneda, string>>;
  clienteId: number;
  onCerrar: () => void;
}) {
  const navegar = useNavigate();
  const { data: clientes } = useClientes();
  const cliente = clientes?.find((c) => c.id === clienteId);
  const diasCredito = cliente?.condicionCredito === "CREDITO" ? cliente.diasCredito : 0;
  const { data: cuentas } = useCuentasBancarias();
  const [moneda, setMoneda] = useState<Moneda>(opciones[0]!.moneda);
  const [cuentaId, setCuentaId] = useState("");
  const fechaFactura = (m: Moneda) => {
    const f = fechaFacturas[m];
    return f && f <= hoyISO() ? f : hoyISO();
  };
  const [emision, setEmision] = useState(fechaFactura(opciones[0]!.moneda));
  const [vence, setVence] = useState("");
  // Si no se tocó, el vencimiento sigue a la emisión (contado = mismo día; crédito = + días)
  const venceEn = vence || sumarDias(emision, diasCredito);
  const [condiciones, setCondiciones] = useState("");

  const deMoneda = (cuentas ?? []).filter((c) => c.activo !== false && c.moneda === moneda);
  const { enviar, guardando, error } = useEnviar(
    "notas",
    () =>
      generarNota({
        liquidacionId,
        moneda,
        ...(cuentaId && { cuentaBancariaId: Number(cuentaId) }),
        fechaEmision: emision,
        fechaVencimiento: venceEn,
        ...(condiciones.trim() && { condicionesPago: condiciones.trim() }),
      }),
    (nota) => {
      navegar(`/comercial/notas/${nota.id}`);
      avisarSiguientePaso(nota.operacion.id);
    }
  );

  return (
    <Modal titulo="Generar nota de cobranza" textoGuardar="Generar nota" onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error}>
      {opciones.length > 1 ? (
        <Campo label="Moneda de la nota" requerido className="sm:col-span-2" ayuda="Esta liquidación se cobra en dos monedas: cada una lleva su propia nota.">
          <select
            value={moneda}
            onChange={(e) => {
              setMoneda(e.target.value as Moneda);
              setEmision(fechaFactura(e.target.value as Moneda));
              setCuentaId("");
            }}
            className={inputClass}
          >
            {opciones.map((o) => (
              <option key={o.moneda} value={o.moneda}>
                {o.moneda === "PEN" ? "Soles" : "Dólares"} · {dinero(o.total, o.moneda)}
              </option>
            ))}
          </select>
        </Campo>
      ) : (
        <p className="text-sm text-slate-600 sm:col-span-2">
          Se cobra <b>{dinero(opciones[0]!.total, opciones[0]!.moneda)}</b>.
        </p>
      )}
      <Campo label="Cuenta para el pago" className="sm:col-span-2" ayuda="Vacío = el documento lista todas las cuentas activas en esa moneda.">
        <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputClass}>
          <option value="">Todas las cuentas en {moneda === "PEN" ? "soles" : "dólares"}</option>
          {deMoneda.map((c) => (
            <option key={c.id} value={c.id}>
              {c.banco} · {c.numeroCuenta}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Fecha de emisión" ayuda={fechaFacturas[moneda] ? "La de la factura de esta moneda" : "Hoy, si todavía no hay factura"}>
        <input type="date" max={hoyISO()} value={emision} onChange={(e) => e.target.value && setEmision(e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="Vencimiento" ayuda={diasCredito ? `Crédito ${diasCredito} días` : "Contado"}>
        <input type="date" min={emision} value={venceEn} onChange={(e) => setVence(e.target.value)} className={inputClass} />
      </Campo>
      <Campo label="Condiciones de pago" className="sm:col-span-2" ayuda="Vacío = las de la empresa, o «Contado» / «Crédito N días».">
        <textarea rows={2} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} className={inputClass} />
      </Campo>
    </Modal>
  );
}
