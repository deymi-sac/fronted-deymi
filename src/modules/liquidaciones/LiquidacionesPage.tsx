import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Search } from "lucide-react";
import { useBandejaLiquidaciones, type FiltroBandeja } from "./liquidaciones.api";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { PieTabla } from "../../components/ui/PieTabla";
import { Tabla } from "../../components/ui/Tabla";
import { Tarjeta } from "../../components/ui/Tarjeta";
import { inputClass } from "../../lib/estilos";
import { dinero, etiqueta } from "../../lib/formato";

type Filtro = "TODAS" | NonNullable<FiltroBandeja["estado"]>;

const FILTROS: { clave: Filtro; label: string }[] = [
  { clave: "SIN_LIQUIDAR", label: "Por liquidar" },
  { clave: "ELABORADA", label: "Elaboradas" },
  { clave: "REVISADA", label: "Revisadas" },
  { clave: "APROBADA", label: "Aprobadas" },
  { clave: "ENVIADA", label: "Enviadas" },
  { clave: "REABIERTA", label: "Reabiertas" },
  { clave: "TODAS", label: "Todas" },
];

export default function LiquidacionesPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("SIN_LIQUIDAR");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useBandejaLiquidaciones({
    pagina,
    ...(filtro !== "TODAS" && { estado: filtro }),
    ...(texto.trim() && { buscar: texto.trim() }),
  });

  function filtrar(f: Filtro) {
    setFiltro(f);
    setPagina(1);
  }
  function buscar(t: string) {
    setTexto(t);
    setPagina(1);
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina titulo="Liquidaciones" subtitulo="El sistema jala automáticamente los pagos de cada operación finalizada" />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            type="button"
            onClick={() => filtrar(f.clave)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${filtro === f.clave ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Tarjeta sinPadding>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={texto} onChange={(e) => buscar(e.target.value)} placeholder="Buscar por N.° de operación o cliente" className={`${inputClass} pl-9`} />
          </div>
        </div>
        <Tabla
          cargando={isLoading}
          filas={data?.items}
          claveFila={(x) => x.operacionId}
          onFila={(x) => navigate(`/comercial/liquidaciones/${x.operacionId}`)}
          vacio="No hay operaciones en esta bandeja"
          columnas={[
            { titulo: "Operación", celda: (x) => <span className="font-semibold text-slate-800">{x.operacion}</span> },
            { titulo: "Cliente", celda: (x) => x.cliente },
            { titulo: "Estado", celda: (x) => <EstadoBadge estado={x.estadoOperacion} /> },
            {
              titulo: "Pagos",
              celda: (x) =>
                x.pagosSinRevisar > 0 ? <span className="text-xs font-medium text-amber-700">{x.pagosSinRevisar} sin revisar</span> : <span className="text-xs text-slate-400">Revisados</span>,
            },
            {
              titulo: "Diferencias",
              celda: (x) =>
                !x.liquidacion ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : x.liquidacion.conDiferencias ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                    <AlertTriangle size={13} /> Revisar
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Sin diferencias</span>
                ),
            },
            {
              titulo: "Liquidación",
              celda: (x) =>
                x.liquidacion ? (
                  <EstadoBadge estado={x.liquidacion.estado} texto={`v${x.liquidacion.version} · ${etiqueta(x.liquidacion.estado)}`} />
                ) : (
                  <span className="text-xs text-slate-400">Sin elaborar</span>
                ),
            },
            {
              titulo: "Total",
              alinear: "derecha",
              celda: (x) => (x.liquidacion ? <span className="font-medium">{dinero(x.liquidacion.total, x.moneda)}</span> : "—"),
            },
          ]}
        />
        {data && (
          <PieTabla pagina={data.pagina} paginas={data.paginas} onPagina={setPagina}>
            {data.total} {data.total === 1 ? "operación" : "operaciones"}
          </PieTabla>
        )}
      </Tarjeta>
    </div>
  );
}
