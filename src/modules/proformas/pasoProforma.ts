import { notificar } from "../../lib/toast";
import type { SiguientePaso } from "../operaciones/operaciones.api";
import type { EstadoProforma } from "./proformas.api";
import { avisarSiguientePaso } from "../operaciones/avisoSiguientePaso";

const ETAPAS = ["Proforma", "Enviada al cliente", "Aprobada", "Operación"] as const;

interface ProformaPaso {
  id: number;
  numero: string;
  estado: EstadoProforma;
  operacion: { id: number; numero: string } | null;
}

/**
 * Siguiente paso de la proforma, antes de que exista la operación:
 * enviarla al cliente → registrar su aprobación → convertirla en operación. Después sigue el flujo de la operación.
 */
export function pasoDeProforma(p: ProformaPaso): SiguientePaso {
  const etapa = (nombre: (typeof ETAPAS)[number] | null, paso: SiguientePaso["paso"]): SiguientePaso => {
    const hasta = nombre ? ETAPAS.indexOf(nombre) : ETAPAS.length;
    return { etapa: nombre, etapas: ETAPAS.map((n, i) => ({ nombre: n, hecha: i < hasta })), paso };
  };
  const aqui = (clave: string) => `/comercial/proformas/${p.id}?aqui=${clave}`;
  switch (p.estado) {
    case "BORRADOR":
      return etapa("Enviada al cliente", {
        titulo: "Enviar la proforma al cliente",
        detalle: "Revísala, descárgala en PDF, envíasela al cliente y márcala como enviada.",
        ruta: aqui("enviar"),
        boton: "Marcar como enviada",
      });
    case "ENVIADA":
      return etapa("Aprobada", {
        titulo: "Registrar la respuesta del cliente",
        detalle: "Cuando el cliente la apruebe, márcala como aprobada (o como rechazada si no la acepta).",
        ruta: aqui("aprobar"),
        boton: "Aprobada por el cliente",
      });
    case "APROBADA":
      return etapa("Operación", {
        titulo: "Convertir en operación",
        detalle: "El cliente la aprobó: conviértela en operación para registrar sus pagos, facturarla y liquidarla.",
        ruta: aqui("convertir"),
        boton: "Convertir en operación",
      });
    case "CONVERTIDA":
      return etapa(null, p.operacion && {
        titulo: `Continuar en la operación ${p.operacion.numero}`,
        detalle: "La proforma ya es una operación: desde ahí sigue el flujo (pagos, factura, liquidación, nota y cobro).",
        ruta: `/comercial/operaciones/${p.operacion.id}`,
        boton: "Ir a la operación",
      });
    default:
      // Rechazada o anulada: no hay pasos
      return { etapa: null, etapas: [], paso: null };
  }
}

/** Aviso "Siguiente paso" después de guardar la proforma o cambiar su estado. */
export function avisarPasoProforma(p: ProformaPaso) {
  if (p.estado === "CONVERTIDA" && p.operacion) return avisarSiguientePaso(p.operacion.id);
  const { paso } = pasoDeProforma(p);
  if (!paso) return;
  setTimeout(
    () =>
      notificar(`${paso.titulo}. ${paso.detalle}`, "info", {
        titulo: "Siguiente paso",
        enlace: { texto: paso.boton, ruta: paso.ruta },
        duracion: 12000,
      }),
    700
  );
}
