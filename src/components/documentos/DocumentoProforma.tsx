import { Fragment, type ReactNode } from "react";
import { useEmpresa } from "../../modules/maestros/useMaestros";
import { useCuentasBancarias } from "../../modules/cobranza/cobranza.api";
import type { Cliente } from "../../modules/maestros/maestros.api";
import type { Proforma } from "../../modules/proformas/proformas.api";
import { etiqueta, num } from "../../lib/formato";
import { formatearFecha } from "../../modules/almacen/almacen.utils";

const UNIDAD_DOC: Record<string, string> = { OPERACION: "UND", CONTENEDOR: "CONT", CONT_ADICIONAL: "CONT", KG: "KG", TONELADA: "TN", BL: "BL", DAM: "DAM" };
const SIMBOLO = { USD: "US$", PEN: "S/" } as const;
const AZUL = "text-[#18193B]";
const BORDE_AZUL = "border-[#18193B]";

/** Etiqueta y valor de la columna de datos de la proforma */
function Dato({ a, b, fuerte }: { a: string; b: ReactNode; fuerte?: boolean }) {
  return (
    <div className={`grid grid-cols-[1fr_auto] gap-3 ${fuerte ? "font-bold" : ""}`}>
      <span>{a}</span>
      <span className="text-right">{b || "—"}</span>
    </div>
  );
}

/**
 * Las líneas de la proforma por moneda de cobro, con su importe en esa moneda. La API guarda los montos
 * convertidos a la moneda de la proforma: las que venían en otra moneda vuelven a la original.
 */
function gruposPorMoneda(p: Proforma) {
  const enOrigen = (l: Proforma["lineas"][number]) => {
    const origen = l.monedaOrigen && l.monedaOrigen !== p.moneda ? l.monedaOrigen : null;
    if (!origen) return { moneda: p.moneda, total: l.total };
    // Fijo o por unidad: el importe original exacto; si no, se vuelve con el tipo de cambio
    const total =
      l.importeOrigen != null && (l.tipoCalculo === "FIJO" || l.tipoCalculo === "POR_UNIDAD") && !l.igv
        ? l.importeOrigen * l.cantidad
        : p.tipoCambio
          ? origen === "PEN"
            ? l.total * p.tipoCambio
            : l.total / p.tipoCambio
          : l.total;
    return { moneda: origen, total: Math.round(total * 100) / 100 };
  };
  // Las líneas en 0.00 (conceptos del tarifario sin importe) no se imprimen
  const conMoneda = p.lineas.map((linea) => ({ linea, ...enOrigen(linea) })).filter((l) => l.total !== 0);
  const monedas = [...new Set(conMoneda.map((l) => l.moneda))].sort((a) => (a === "PEN" ? -1 : 1)); // soles primero
  return monedas.map((moneda) => {
    const lineas = conMoneda.filter((l) => l.moneda === moneda);
    return { moneda, lineas, total: Math.round(lineas.reduce((s, l) => s + l.total, 0) * 100) / 100 };
  });
}

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/**
 * Documento de la proforma: datos de la empresa y del cliente, datos del despacho a la derecha, un renglón por
 * concepto con su valor unitario e importe (los marcados con * incluyen IGV) y el total resaltado.
 * `cliente` (del maestro) agrega la condición de pago.
 */
export function DocumentoProforma({ proforma: p, cliente }: { proforma: Proforma; cliente?: Cliente | undefined }) {
  const { data: empresa } = useEmpresa();
  const { data: cuentas } = useCuentasBancarias();
  // Cada línea en la moneda en que se cobra: una tabla en soles y otra en dólares si hay de ambas
  const grupos = gruposPorMoneda(p);
  const condicion = cliente && (cliente.condicionCredito === "CREDITO" ? `CREDITO ${String(cliente.diasCredito).padStart(2, "0")} DIAS` : "CONTADO");
  const despacho = [
    ["LINEA", p.lineaNaviera],
    ["TERMINAL", p.terminal],
    ["ALMACEN", p.almacen],
    ["PUERTO", p.puerto],
    ["CARGA", [p.tipoCarga, p.cantidadContenedores ? `${p.cantidadContenedores} x ${p.tipoContenedor ?? "cont."}` : p.tipoContenedor].filter(Boolean).join(" · ")],
    ["PESO", p.pesoKg ? `${p.pesoKg.toLocaleString("es-PE")} kg` : null],
  ].filter(([, v]) => v);

  return (
    <div className="area-impresion mx-auto max-w-[820px] bg-white p-8 text-[13px] text-gray-900 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div className={`text-sm font-bold leading-relaxed ${AZUL}`}>
          <p>{empresa ? `${empresa.razonSocial} / RUC ${empresa.ruc}` : "DeymiTool — faltan los datos de la empresa (Maestros → Empresa)"}</p>
          <p>{[empresa?.telefono && `Telf ${empresa.telefono}`, empresa?.correo && `Email : ${empresa.correo}`].filter(Boolean).join(" / ")}</p>
          {empresa?.direccion && <p className="font-semibold">{empresa.direccion}</p>}
        </div>
        <img src={empresa?.logoUrl || "/logdeyre.webp"} alt="" className="h-24 w-auto shrink-0 object-contain" />
      </div>

      <div className="mt-4 grid max-w-[30rem] grid-cols-[5.5rem_1fr] gap-y-1 text-xs">
        <span>Cliente</span>
        <span className="border-b border-gray-900 text-center font-bold">{p.cliente.razonSocial}</span>
        <span>{p.cliente.tipoDocumento === "RUC" ? "RUC" : "Tax ID"}</span>
        <span className="border-b border-gray-900 text-center font-bold">{p.cliente.numeroDocumento}</span>
        <span>Dirección</span>
        <span className="text-center font-bold">{p.cliente.direccion}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 items-end gap-8 text-xs">
        <div className="grid grid-cols-[5.5rem_1fr] gap-y-0.5 font-bold">
          {despacho.map(([a, b]) => (
            <Fragment key={a}>
              <span>{a}:</span>
              <span>{b}</span>
            </Fragment>
          ))}
        </div>
        <div className="space-y-0.5">
          <p className="text-center text-sm font-bold">PROFORMA</p>
          <div className={`grid grid-cols-[1fr_auto] border-b-4 ${BORDE_AZUL} pb-0.5 text-base font-bold`}>
            <span>Número de Proforma</span>
            <span>{p.numero}</span>
          </div>
          <Dato a="Fecha de emisión" b={<b>{formatearFecha(p.fecha)}</b>} />
          <Dato a="Régimen" b={[etiqueta(p.tipoOperacion).toUpperCase(), p.regimen].filter(Boolean).join(" · ")} />
          <Dato a="Aduana" b={p.aduana} />
          <Dato a="Orden de Servicio" b={p.ordenServicio} />
          {p.dam && <Dato a="DAM" b={p.dam} />}
          {p.valorFob != null && <Dato a="Valor FOB US$" b={num(p.valorFob)} />}
          {p.valorFlete != null && <Dato a="Flete US$" b={num(p.valorFlete)} />}
          {p.valorSeguro != null && <Dato a="Seguro US$" b={num(p.valorSeguro)} />}
          {p.valorCif != null && <Dato a="VALOR C.I.F. US$" b={`$${num(p.valorCif)}`} fuerte />}
          {p.tipoCambio != null && <Dato a="Tipo de cambio" b={p.tipoCambio} />}
          {condicion && <Dato a="CONDICIONES DE PAGO" b={condicion} fuerte />}
          {grupos.map((g) => (
            <div key={g.moneda} className="grid grid-cols-[1fr_auto] gap-3 bg-yellow-300 font-bold">
              <span>Total a pagar ({SIMBOLO[g.moneda]})</span>
              <span>
                {SIMBOLO[g.moneda]} {num(g.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {grupos.map((g) => (
        <Fragment key={g.moneda}>
          <table className="mt-5 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-gray-500 px-2 py-1 text-left">Concepto / Descripción</th>
                <th className="w-16 border border-gray-500 px-2 py-1">Cantidad</th>
                <th className="w-16 border border-gray-500 px-2 py-1">Unidad</th>
                <th className="w-24 border border-gray-500 px-2 py-1">Valor Unitario</th>
                <th className="w-28 border border-gray-500 px-2 py-1">Importe</th>
              </tr>
            </thead>
            <tbody>
              {g.lineas.map(({ linea: l, total }) => (
                <tr key={l.id}>
                  <td className="border border-gray-500 px-2 py-0.5">{l.descripcion}</td>
                  <td className="border border-gray-500 px-2 py-0.5 text-center">{l.cantidad.toLocaleString("es-PE")}</td>
                  <td className="border border-gray-500 px-2 py-0.5 text-center">{UNIDAD_DOC[l.unidad] ?? l.unidad}</td>
                  <td className="border border-gray-500 px-2 py-0.5 text-right tabular-nums">{num(total / l.cantidad)}</td>
                  <td className="relative border border-gray-500 px-2 py-0.5 text-right tabular-nums">
                    {num(total)}
                    {l.igv > 0 && <span className="absolute -right-3 top-0 font-bold text-red-600">*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 grid grid-cols-[1fr_auto] items-start gap-4 text-xs font-bold">
            <p>Elaborado por: &nbsp; {iniciales(p.creadoPor)}</p>
            <div className={`grid w-72 grid-cols-[1fr_auto] gap-3 border-t-2 ${BORDE_AZUL} bg-yellow-300`}>
              <span>Total Proforma ( {SIMBOLO[g.moneda]} )</span>
              <span>{num(g.total)}</span>
            </div>
          </div>
        </Fragment>
      ))}

      <div className="mt-6 space-y-1 text-xs font-bold">
        <p className={`border-b ${BORDE_AZUL} text-red-600`}>Nota: Todos los montos con (*) incluyen IGV</p>
        <p className="bg-yellow-300 text-red-600">Proforma sujeta a modificaciones</p>
        {p.condiciones && <p className="whitespace-pre-line pt-2">{p.condiciones}</p>}
        <p className="pt-1 font-normal">
          Validez de la proforma: {p.validezDias} días (hasta el {formatearFecha(p.fechaVencimiento)}).
        </p>
      </div>

      {cuentas && cuentas.some((c) => c.activo !== false) && (
        <div className="mt-5 text-xs">
          <p className="font-bold">Sírvase depositar en nuestras cuentas corrientes</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
            {cuentas
              .filter((c) => c.activo !== false)
              .map((c) => (
                <div key={c.id}>
                  <p className={`font-bold uppercase ${AZUL}`}>
                    {c.banco} · {c.moneda === "USD" ? "DÓLARES" : "SOLES"}
                  </p>
                  <p>{c.numeroCuenta}</p>
                  {c.cci && <p>CCI {c.cci}</p>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
