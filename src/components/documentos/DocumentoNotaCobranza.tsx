import { Fragment } from "react";
import type { Nota } from "../../modules/cobranza/cobranza.api";
import { dinero, etiqueta, montoEnLetras, num } from "../../lib/formato";
import { formatearFecha } from "../../modules/almacen/almacen.utils";

const AZUL = "text-[#18193B]";
const BORDE_AZUL = "border-[#18193B]";
const SIMBOLO = { USD: "US$", PEN: "S/" } as const;
const VIA_REFERENCIA = { MARITIMA: "MARÍTIMA", AEREA: "AÉREA", TERRESTRE: "TERRESTRE" } as const;

/**
 * Referencia de la nota: el régimen manda cuando no es una importación o exportación común
 * ("SOLICITUD DE TRASLADO A ZED PAITA"); si no, el tipo de operación ("IMPORTACIÓN MARÍTIMA POR LA ADUANA DE PAITA").
 */
function textoReferencia(op: { tipoOperacion: string; via: string; aduana: string | null; regimen?: string | null; almacen?: string | null }) {
  const via = VIA_REFERENCIA[op.via as keyof typeof VIA_REFERENCIA] ?? op.via.toUpperCase();
  const regimen = op.regimen?.trim();
  const porAduana = op.aduana && `POR LA ADUANA DE ${op.aduana}`;
  const partes =
    regimen && /traslado/i.test(regimen)
      ? [regimen, op.almacen ? `A ${op.almacen}` : porAduana]
      : regimen && !/importaci|exportaci/i.test(regimen.normalize("NFD").replace(/[̀-ͯ]/g, ""))
        ? [`${regimen} ${via}`, porAduana]
        : [`${etiqueta(op.tipoOperacion)} ${via}`, porAduana];
  return partes.filter(Boolean).join(" ").toUpperCase();
}

/** "Lesly Lizbeth Mena Pazos" → "LLMP", como se firma en los documentos */
const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/** "FFF2-4340" → "FFF2-004340": los comprobantes van con el número a 6 dígitos */
const comprobante = (doc: string | null) => doc?.replace(/^([A-Z0-9]{4})-(\d{1,6})$/, (_, s: string, n: string) => `${s}-${n.padStart(6, "0")}`) ?? "";

/**
 * Documento de la nota de cobranza que recibe el cliente: un renglón por servicio o gasto con su proveedor y comprobante,
 * lo pagado a cuenta, el saldo en letras y las cuentas donde se puede pagar. No lleva costos internos ni lo proformado.
 */
export function DocumentoNotaCobranza({ nota: n }: { nota: Nota }) {
  const op = n.operacion;
  const e = n.empresa;
  const simbolo = SIMBOLO[n.moneda];
  const referencia = textoReferencia(op);
  const nombreEmpresa = e?.razonSocial ?? "";
  // Los servicios van primero; sin las líneas en 0.00
  const renglones = n.liquidacion.lineas.filter((l) => l.importe + l.igv !== 0).sort((a, b) => (a.origen === b.origen ? 0 : a.origen === "SERVICIO" ? -1 : 1));
  // Pago a cuenta = lo que el cliente depositó; si supera la nota, la diferencia es saldo a favor del cliente
  const pagoACuenta = Math.round(n.depositos.reduce((s, d) => s + d.importe, 0) * 100) / 100;
  const porPagar = Math.round((n.total - pagoACuenta) * 100) / 100;
  const aFavorDe = porPagar < 0 ? n.cliente.razonSocial.split(/\s+/)[0]! : (nombreEmpresa.split(/\s+/)[0] ?? "");
  const cuentas = n.cuentaBancaria ? [n.cuentaBancaria] : n.cuentasBancarias.filter((c) => c.moneda === n.moneda);

  return (
    <div className="area-impresion mx-auto max-w-[820px] bg-white p-8 text-[13px] text-gray-900 shadow-sm">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <img src={e?.logoUrl || "/logdeyre.webp"} alt="" className="h-24 w-auto object-contain" />
        <div className={`text-center text-xs font-semibold leading-relaxed ${AZUL}`}>
          <p className="text-sm font-bold">{e ? e.razonSocial : "DeymiTool — faltan los datos de la empresa (Maestros → Empresa)"}</p>
          {e?.direccion && <p>{e.direccion}</p>}
          {e?.correo && <p>Email: {e.correo}</p>}
          {e?.telefono && <p>Telf {e.telefono}</p>}
          {e?.web && <p>{e.web}</p>}
        </div>
        <div className={`rounded-2xl border-2 ${BORDE_AZUL} px-6 py-3 text-center`}>
          {e && <p className={`text-base font-bold ${AZUL}`}>R.U.C. {e.ruc}</p>}
          <p className={`text-base font-bold ${AZUL}`}>NOTA DE COBRANZA</p>
          <p className="mt-2 text-base font-bold text-red-600">{n.numero}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[6rem_1fr_auto] gap-x-3 gap-y-0.5 text-xs">
        <span className="font-bold">SEÑORES</span>
        <span className="col-span-2">{n.cliente.razonSocial}</span>
        <span className="font-bold">{n.cliente.tipoDocumento === "RUC" ? "RUC" : "TAX ID"}</span>
        <span className="col-span-2">{n.cliente.numeroDocumento}</span>
        <span className="font-bold">DIRECCION</span>
        <span>{n.cliente.direccion}</span>
        <span className="whitespace-nowrap">
          <b>FECHA :</b> {formatearFecha(n.fechaEmision)}
        </span>
      </div>

      <div className={`mt-3 rounded-2xl border-2 ${BORDE_AZUL} px-5 py-4 text-xs`}>
        <div className="grid grid-cols-[3.5rem_1fr_4rem_1fr_5rem_auto] items-baseline gap-x-2 border-b border-[#18193B]/30 pb-2 font-bold">
          <span>DAM</span>
          <span>{op.dam}</span>
          <span>AWB/BL</span>
          <span className="font-normal">{op.blAwb}</span>
          <span>ORD/SERV</span>
          <span>{op.ordenServicio}</span>
        </div>
        {op.contenedores.length > 0 && <p className="mt-1">CONTENEDOR: {op.contenedores.join(" / ")}</p>}
        <p className="mt-3">
          <b className="mr-3">REFERENCIA</b>
          {referencia}
        </p>

        <table className="mt-4 w-full">
          <tbody>
            {renglones.map((l, i) => (
              <tr key={i} className="align-top">
                {/* Los servicios llevan el texto del tarifario; los gastos, el concepto (su detalle está en el comprobante) */}
                <td className="py-0.5 pr-2 uppercase">{l.descripcion || l.concepto}</td>
                <td className="py-0.5 pr-2 uppercase">{l.origen === "SERVICIO" ? nombreEmpresa : l.proveedor}</td>
                <td className="py-0.5 pr-2">{comprobante(l.documento)}</td>
                <td className="py-0.5 text-right tabular-nums">
                  {num(l.importe + l.igv)}
                  {l.monedaOrigen !== n.moneda && (
                    <span className="block text-[10px] text-gray-500">
                      ({dinero(l.importeOrigen, l.monedaOrigen)}
                      {l.tipoCambio ? ` · TC ${l.tipoCambio}` : ""})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 space-y-3 font-bold">
          <p>
            PROFORMA <span className="ml-2">{op.proforma}</span>
          </p>
          <p className="grid grid-cols-[14rem_1fr]">
            <span>FECHA DE VENCIMIENTO</span>
            <span>{formatearFecha(n.fechaVencimiento)}</span>
          </p>
        </div>

        <div className="ml-auto mt-4 grid w-80 grid-cols-[1fr_auto_6rem] gap-x-3 font-bold tabular-nums">
          <span>SUB TOTAL</span>
          <span>{simbolo}</span>
          <span className="text-right">{num(n.total)}</span>
          {n.depositos.map((d) => (
            <Fragment key={d.cobro}>
              <span>
                DEPOSITO {formatearFecha(d.fecha)} {d.banco.split(" - ")[0]}
              </span>
              <span>{simbolo}</span>
              <span className="text-right">{num(d.importe)}</span>
            </Fragment>
          ))}
          {n.depositos.length === 0 && (
            <>
              <span>PAGO A CTA</span>
              <span />
              <span className="text-right">{num(0)}</span>
            </>
          )}
          <span className="bg-yellow-300">POR PAGAR A {aFavorDe.toUpperCase()}</span>
          <span className="bg-yellow-300">{simbolo}</span>
          <span className="bg-yellow-300 text-right">{num(porPagar)}</span>
        </div>

        <p className="mt-5 font-bold">
          <span className="mr-8">SON:</span>
          {montoEnLetras(porPagar, n.moneda)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 font-bold">
          <p>ELABORADO POR : {iniciales(n.creadoPor)}</p>
          <p>
            TOTAL HOJAS FOLIADAS <span className="ml-6 inline-block w-16 border-b border-gray-900 text-center">{n.hojasFoliadas ?? " "}</span>
          </p>
        </div>

        {cuentas.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
            {cuentas.map((c) => (
              <div key={c.id}>
                <p className="font-bold uppercase">
                  {c.banco} · {c.moneda === "USD" ? "DÓLARES" : "SOLES"}
                </p>
                <p>{c.numeroCuenta}</p>
                {c.cci && <p>CCI {c.cci}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {n.condicionesPago && (
        <p className="mt-3 text-[11px] text-gray-700">
          <b>Condiciones de pago:</b> <span className="whitespace-pre-line">{n.condicionesPago}</span>
        </p>
      )}
      {n.empresa?.pieNotaCobranza && n.empresa.pieNotaCobranza !== n.condicionesPago && (
        <p className="mt-3 whitespace-pre-line text-[11px] text-gray-500">{n.empresa.pieNotaCobranza}</p>
      )}
      <div className="mt-6 text-center text-xs font-bold">
        <p>CANCELADO</p>
        <div className={`mx-auto mt-12 w-56 border-b-2 ${BORDE_AZUL}`} />
      </div>
    </div>
  );
}
