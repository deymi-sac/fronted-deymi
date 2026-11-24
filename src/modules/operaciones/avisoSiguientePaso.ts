import { api } from "../../api/axios";
import { notificar } from "../../lib/toast";
import type { SiguientePaso } from "./operaciones.api";

export const obtenerSiguientePaso = (operacionId: number) =>
  api.get<SiguientePaso>(`/operaciones/${operacionId}/siguiente-paso`).then((r) => r.data);

/**
 * Después de una acción (registrar un pago, una factura, aprobar la liquidación…), avisa qué sigue en la operación.
 * Sale un momento después del aviso de la acción; si no se puede consultar, no muestra nada.
 */
export function avisarSiguientePaso(operacionId: number | null | undefined) {
  if (!operacionId) return;
  setTimeout(() => {
    obtenerSiguientePaso(operacionId)
      .then((s) => {
        if (s.paso) {
          notificar(`${s.paso.titulo}. ${s.paso.detalle}`, "info", {
            titulo: "Siguiente paso",
            enlace: { texto: s.paso.boton, ruta: s.paso.ruta },
            duracion: 12000,
          });
        } else if (s.etapa === null && s.etapas.length) {
          notificar("La operación no tiene pasos pendientes.", "info", { titulo: "Siguiente paso", duracion: 6000 });
        }
      })
      .catch(() => undefined);
  }, 700);
}
