import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Banknote, Calculator, CalendarDays, FileClock, FileSignature, FileWarning, FolderOpen, GitCompare, Receipt, TrendingUp, Wallet } from "lucide-react";
import { usePanelComercial, type PanelComercial, type PorMoneda } from "./panel.api";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { StatCard } from "../../components/ui/StatCard";
import { Tabla } from "../../components/ui/Tabla";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { dinero, etiqueta, redondear } from "../../lib/formato";
import { formatearFecha } from "../almacen/almacen.utils";
import { getCurrentUser } from "../auth/auth.utils";
import { Paginado } from "../../components/ui/Paginado";

/** "S/ 1,200.00 + USD 300.00", o "—" si no hay nada. */
const enMonedas = (xs: PorMoneda) => (xs.length ? xs.map((x) => dinero(x.total, x.moneda)).join(" + ") : "—");

type Alerta = PanelComercial["alertas"][number];

const COLOR_ALERTA: Record<Alerta["tipo"], string> = {
  sin_cobrar: "bg-red-50 text-red-800",
  duplicado: "bg-red-50 text-red-800",
  documentos: "bg-red-50 text-red-800",
  diferencia: "bg-amber-50 text-amber-900",
  vencida: "bg-orange-50 text-orange-900",
};

const TITULO_ALERTA: Partial<Record<Alerta["tipo"], string>> = {
  sin_cobrar: "con ítems sin cobrar",
  documentos: "con gastos sin comprobante",
  diferencia: "con diferencias vs. proforma",
};

const enlaceAlerta = (a: Alerta) =>
  a.tipo === "vencida" && a.notaCobranzaId
    ? `/comercial/notas/${a.notaCobranzaId}`
    : a.tipo === "diferencia" || a.tipo === "sin_cobrar"
      ? `/comercial/liquidaciones/${a.operacionId}`
      : `/comercial/operaciones/${a.operacionId}`;

function Barra({ label, valor, maximo, texto, color = "bg-slate-600" }: { label: string; valor: number; maximo: number; texto: string; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs">
        <span className="truncate text-slate-600">{label}</span>
        <span className="shrink-0 font-medium text-slate-800">{texto}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(2, (valor / maximo) * 100)}%` }} />
      </div>
    </div>
  );
}

/** Panel gerencial del módulo comercial: lo pendiente, lo cobrado, las alertas y (con permiso) los márgenes. */
export default function PanelComercialPage() {
  const { data: r, isLoading, error } = usePanelComercial();
  const nombre = getCurrentUser()?.nombre ?? "";
  // Las tarjetas de operaciones con problemas llevan a sus alertas
  const [parametros] = useSearchParams();
  const filtroAlerta = parametros.get("alertas") as Alerta["tipo"] | null;
  useEffect(() => {
    if (filtroAlerta) document.getElementById("alertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filtroAlerta, r]);

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <EncabezadoPagina titulo={`Hola, ${nombre}`} />
        <Aviso tono="error" titulo="No se pudo cargar el panel">
          Vuelve a intentarlo en unos segundos.
        </Aviso>
      </div>
    );
  }
  if (isLoading || !r) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  const o = r.operaciones;
  const maxEstado = Math.max(...o.porEstado.map((e) => e.cantidad), 1);
  // Las barras se comparan dentro de cada moneda
  const monedasGasto = [...new Set(r.gastoPorConcepto.map((g) => g.moneda))];
  const vencido = r.cobranza.porCobrar.filter((x) => x.vencido > 0).map((x) => ({ moneda: x.moneda, total: x.vencido }));
  const porAplicar = (["PEN", "USD"] as const)
    .map((moneda) => ({ moneda, total: redondear(r.cobranza.porAplicar.filter((c) => c.moneda === moneda).reduce((s, c) => s + c.porAplicar, 0)) }))
    .filter((x) => x.total > 0);
  const alertas = filtroAlerta ? r.alertas.filter((a) => a.tipo === filtroAlerta) : r.alertas;
  const base = "/comercial/panel";

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina titulo={`Hola, ${nombre}`} subtitulo={`Panel gerencial al ${formatearFecha(r.fecha)} · importes por moneda`} />

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Operaciones en curso" valor={o.enCurso} icono={FolderOpen} to="/comercial/operaciones" />
        <StatCard label="Pendientes de liquidar" valor={o.pendientesLiquidar} icono={Calculator} tono="ambar" to="/comercial/liquidaciones" />
        <StatCard label="Notas por facturar" valor={r.facturacion.notasPorFacturar} detalle={enMonedas(r.facturacion.porFacturar)} icono={Receipt} tono="violeta" to="/comercial/facturas" />
        <StatCard label="Con gastos sin comprobante" valor={o.conGastosSinComprobante} icono={FileWarning} tono="rojo" to={`${base}?alertas=documentos`} />
        <StatCard label="Con diferencias vs. proforma" valor={o.conDiferencias} icono={GitCompare} tono="cielo" to={`${base}?alertas=diferencia`} />
        <StatCard label="Con ítems sin cobrar" valor={o.conItemsSinCobrar} icono={AlertTriangle} tono="rojo" to={`${base}?alertas=sin_cobrar`} />
      </div>

      <div className="mt-4 grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pagos de hoy" valor={enMonedas(r.pagos.hoy)} icono={Wallet} tono="cielo" to="/comercial/pagos" />
        <StatCard label="Pagos del mes" valor={enMonedas(r.pagos.mes)} icono={CalendarDays} to="/comercial/pagos" />
        <StatCard label="Facturado en el mes" valor={enMonedas(r.facturacion.facturadoMes)} icono={TrendingUp} tono="verde" to="/comercial/facturas" />
        <StatCard
          label="Por cobrar"
          valor={enMonedas(r.cobranza.porCobrar.map((x) => ({ moneda: x.moneda, total: x.saldo })))}
          detalle={r.cobranza.notasVencidas ? `${r.cobranza.notasVencidas} vencida(s): ${enMonedas(vencido)}` : "Nada vencido"}
          icono={FileClock}
          tono={r.cobranza.notasVencidas ? "rojo" : "ambar"}
          to="/comercial/cobranza"
        />
        <StatCard label="Cobrado en el mes" valor={enMonedas(r.cobranza.cobradoMes)} icono={Banknote} tono="verde" to="/comercial/cobranza" />
        <StatCard label="Cobros por aplicar" valor={enMonedas(porAplicar)} detalle={`${r.cobranza.porAplicar.length} cobro(s) con saldo`} icono={Wallet} tono="ambar" to="/comercial/cobranza" />
      </div>

      {(r.proformas.porAprobar > 0 || r.proformas.aprobadasSinConvertir > 0) && (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to="/comercial/proformas" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 hover:border-slate-400">
            <FileSignature size={16} className="text-slate-600" />
            {r.proformas.porAprobar} proforma(s) esperando respuesta del cliente · {r.proformas.aprobadasSinConvertir} aprobada(s) sin convertir
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div id="alertas" className="min-w-0 scroll-mt-20">
          <Tarjeta
            titulo={filtroAlerta ? `Operaciones ${TITULO_ALERTA[filtroAlerta] ?? ""} (${alertas.length})` : `Alertas (${alertas.length})`}
            acciones={
              filtroAlerta ? (
                <Link to={base} className="text-xs font-medium text-slate-600 hover:underline">
                  Ver todas
                </Link>
              ) : undefined
            }
          >
            {alertas.length === 0 ? (
              <p className="text-sm text-slate-400">Sin alertas pendientes.</p>
            ) : (
              <Paginado key={filtroAlerta ?? "todas"} items={alertas}>
                {(pagina) => (
                  <ul className="space-y-2">
                    {pagina.map((a, i) => (
                      <li key={i}>
                        <Link to={enlaceAlerta(a)} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition hover:opacity-80 ${COLOR_ALERTA[a.tipo]}`}>
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                          {a.texto}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Paginado>
            )}
          </Tarjeta>
        </div>

        <Tarjeta titulo="Operaciones por estado">
          <div className="space-y-3">
            {o.porEstado.map((e) => (
              <Barra key={e.estado} label={etiqueta(e.estado)} valor={e.cantidad} maximo={maxEstado} texto={String(e.cantidad)} />
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Pagos del mes por concepto">
          {r.gastoPorConcepto.length === 0 ? (
            <p className="text-sm text-slate-400">Sin pagos este mes.</p>
          ) : (
            <div className="space-y-4">
              {monedasGasto.map((m) => {
                const filas = r.gastoPorConcepto.filter((g) => g.moneda === m).slice(0, 6);
                const maximo = Math.max(...filas.map((g) => g.total), 1);
                return (
                  <div key={m} className="space-y-3">
                    {monedasGasto.length > 1 && <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">En {m}</p>}
                    {filas.map((g, i) => (
                      <Barra key={`${g.concepto}-${g.moneda}-${i}`} label={g.concepto} valor={g.total} maximo={maximo} texto={dinero(g.total, g.moneda)} color="bg-sky-500" />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Tarjeta
          titulo="Últimos pagos registrados"
          className="xl:col-span-2"
          sinPadding
          acciones={
            <Link to="/comercial/pagos" className="text-xs font-medium text-slate-600 hover:underline">
              Ver bandeja
            </Link>
          }
        >
          <Tabla
            filas={r.ultimosPagos}
            claveFila={(p) => p.id}
            vacio="Todavía no hay pagos"
            columnas={[
              { titulo: "Fecha", celda: (p) => formatearFecha(p.fecha) },
              { titulo: "Operación", celda: (p) => <span className="font-medium">{p.operacion}</span> },
              { titulo: "Proveedor", celda: (p) => <span className="block max-w-44 truncate">{p.proveedor}</span> },
              { titulo: "Concepto", celda: (p) => p.concepto },
              { titulo: "Importe", alinear: "derecha", celda: (p) => dinero(p.total, p.moneda) },
              { titulo: "Estado", celda: (p) => <EstadoBadge estado={p.estado} /> },
            ]}
          />
        </Tarjeta>

        {r.rentabilidad && (
          <Tarjeta
            titulo="Margen por operación"
            acciones={
              <Link to="/comercial/reportes" className="text-xs font-medium text-slate-600 hover:underline">
                Reporte
              </Link>
            }
          >
            {r.rentabilidad.length === 0 ? (
              <p className="text-sm text-slate-400">Todavía no hay operaciones liquidadas.</p>
            ) : (
              <div className="space-y-3">
                {r.rentabilidad.map((x) => (
                  <div key={x.operacion} className="rounded-lg p-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-800">{x.operacion}</span>
                      <span className={x.margen >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
                        {dinero(x.margen, x.moneda)} <span className="text-xs font-normal text-slate-500">({x.margenPorcentaje}%)</span>
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{x.cliente}</p>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>
        )}
      </div>
    </div>
  );
}
