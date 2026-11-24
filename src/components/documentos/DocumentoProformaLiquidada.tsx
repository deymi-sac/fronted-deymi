import { Fragment, type ReactNode } from "react";
import type { Nota } from "../../modules/cobranza/cobranza.api";
import { num } from "../../lib/formato";
import { formatearFecha } from "../../modules/almacen/almacen.utils";

const UNIDAD_DOC: Record<string, string> = { OPERACION: "UND", CONTENEDOR: "CONT", CONT_ADICIONAL: "CONT", KG: "KG", TONELADA: "TN", BL: "BL", DAM: "DAM" };
const SIMBOLO = { USD: "US$", PEN: "S/" } as const;
const AZUL = "text-[#18193B]";
const BORDE_AZUL = "border-[#18193B]";

function Dato({ a, b, fuerte }: { a: string; b: ReactNode; fuerte?: boolean }) {
  return (
    <div className={`grid grid-cols-[1fr_auto] gap-3 ${fuerte ? "font-bold" : ""}`}>
      <span>{a}</span>
      <span className="text-right">{b || "—"}</span>
    </div>
  );
}

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/**
 * Proforma liquidada: el formato de la proforma con lo que realmente se cobra en la nota (servicios y gastos
 * de la liquidación), con el número de la nota, la DAM y las facturas.
 */
export function DocumentoProformaLiquidada({ nota: n }: { nota: Nota }) {
  const e = n.empresa;
  const op = n.operacion;
  const pl = n.proformaLiquidada;
  const simbolo = SIMBOLO[n.moneda];
  // Servicios primero; sin las líneas en 0.00
  const renglones = n.liquidacion.lineas
    .filter((l) => l.importe + l.igv !== 0)
    .sort((a, b) => (a.origen === b.origen ? 0 : a.origen === "SERVICIO" ? -1 : 1));
  const total = Math.round(renglones.reduce((s, l) => s + l.importe + l.igv, 0) * 100) / 100;
  // Lo depositado por el cliente se descuenta y queda el saldo (negativo = a favor del cliente)
  const depositado = Math.round(n.depositos.reduce((s, d) => s + d.importe, 0) * 100) / 100;
  const saldo = Math.round((total - depositado) * 100) / 100;
  return (
    <div className="area-impresion mx-auto max-w-[820px] bg-white p-8 text-[13px] text-gray-900 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div className={`text-sm font-bold leading-relaxed ${AZUL}`}>
          <p>{e ? `${e.razonSocial} / RUC ${e.ruc}` : "DeymiTool — faltan los datos de la empresa (Maestros → Empresa)"}</p>
          <p>{[e?.telefono && `Telf ${e.telefono}`, e?.correo && `Email : ${e.correo}`].filter(Boolean).join(" / ")}</p>
          {e?.direccion && <p className="font-semibold">{e.direccion}</p>}
        </div>
        <img src={e?.logoUrl || "/logdeyre.webp"} alt="" className="h-24 w-auto shrink-0 object-contain" />
      </div>

      <div className="mt-4 grid max-w-[30rem] grid-cols-[5.5rem_1fr] gap-y-1 text-xs">
        <span>Cliente</span>
        <span className="border-b border-gray-900 text-center font-bold">{n.cliente.razonSocial}</span>
        <span>{n.cliente.tipoDocumento === "RUC" ? "RUC" : "Tax ID"}</span>
        <span className="border-b border-gray-900 text-center font-bold">{n.cliente.numeroDocumento}</span>
        <span>Dirección</span>
        <span className="text-center font-bold">{n.cliente.direccion}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 items-end gap-8 text-xs">
        <div />
        <div className="space-y-0.5">
          <p className="text-center text-sm font-bold">PROFORMA LIQUIDADA</p>
          <p className="text-center text-sm font-bold">NOTA COBRANZA {n.numero}</p>
          <div className={`grid grid-cols-[1fr_auto] border-b-4 ${BORDE_AZUL} pb-0.5 text-base font-bold`}>
            <span>Número de Proforma</span>
            <span>{op.proforma}</span>
          </div>
          <Dato a="Fecha de emisión" b={<b>{formatearFecha(n.fechaEmision)}</b>} />
          <Dato a="Aduana" b={op.aduana} />
          <Dato a="Orden de Servicio" b={op.ordenServicio} />
          <Dato a="D.A.M." b={op.dam} />
          <Dato a={pl.facturas.length > 1 ? "Facturas" : "Factura"} b={pl.facturas.join(" / ")} />
          {pl.valorFob != null && <Dato a="Valor FOB US$" b={num(pl.valorFob)} />}
          {pl.valorFlete != null && <Dato a="Flete US$" b={num(pl.valorFlete)} />}
          {pl.valorSeguro != null && <Dato a="Seguro US$" b={num(pl.valorSeguro)} />}
          {pl.valorCif != null && <Dato a="VALOR C.I.F. US$" b={`$${num(pl.valorCif)}`} fuerte />}
          <Dato a="Condiciones de pago" b={pl.condicionPago} />
          <div className="grid grid-cols-[1fr_auto] gap-3 bg-yellow-300 font-bold">
            <span>Total a pagar ({simbolo})</span>
            <span>
              {simbolo} {num(total)}
            </span>
          </div>
        </div>
      </div>

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
          {renglones.map((l, i) => {
            const importe = l.importe + l.igv;
            return (
              <tr key={i}>
                <td className="border border-gray-500 px-2 py-0.5 uppercase">
                  {l.descripcion || l.concepto}
                </td>
                <td className="border border-gray-500 px-2 py-0.5 text-center">{l.cantidad.toLocaleString("es-PE")}</td>
                <td className="border border-gray-500 px-2 py-0.5 text-center">{UNIDAD_DOC[l.unidad] ?? l.unidad}</td>
                <td className="border border-gray-500 px-2 py-0.5 text-right tabular-nums">{num(importe / l.cantidad)}</td>
                <td className="relative border border-gray-500 px-2 py-0.5 text-right tabular-nums">
                  {num(importe)}
                  {l.igv > 0 && <span className="absolute -right-3 top-0 font-bold text-red-600">*</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-1 grid grid-cols-[1fr_auto] items-start gap-4 text-xs font-bold">
        <div>
          <p>I.G.V ( Impuesto General a las Ventas )</p>
          <p>Elaborado por: &nbsp; {iniciales(n.creadoPor)}</p>
        </div>
        <div className="grid w-80 grid-cols-[1fr_auto] gap-x-3">
          <span className={`border-t-2 ${BORDE_AZUL} bg-yellow-300`}>Total proforma por pagar {simbolo}</span>
          <span className={`border-t-2 ${BORDE_AZUL} bg-yellow-300 text-right`}>{num(total)}</span>
          {n.depositos.map((d) => (
            <Fragment key={d.cobro}>
              <span>
                Depósito {formatearFecha(d.fecha)} {d.banco.split(" - ")[0]}
              </span>
              <span className="text-right">{num(d.importe)}</span>
            </Fragment>
          ))}
          {n.depositos.length > 0 && (
            <>
              <span className="bg-yellow-300">
                {saldo < 0 ? "Saldo a favor del cliente" : "Saldo por pagar"} {simbolo}
              </span>
              <span className="bg-yellow-300 text-right">{num(Math.abs(saldo))}</span>
            </>
          )}
        </div>
      </div>
      <p className={`mt-4 border-b ${BORDE_AZUL} text-xs font-bold text-red-600`}>Nota: Todos los montos con (*) incluyen IGV</p>
    </div>
  );
}
