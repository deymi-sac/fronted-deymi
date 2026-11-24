import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileWarning, Search } from "lucide-react";
import { useOperaciones, type EstadoOperacion, type FiltroOperaciones } from "./operaciones.api";
import { EstadoBadge } from "../proformas/EstadoBadge";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { PieTabla } from "../../components/ui/PieTabla";
import { Tabla } from "../../components/ui/Tabla";
import { Tarjeta } from "../../components/ui/Tarjeta";
import { inputClass } from "../../lib/estilos";
import { etiqueta } from "../../lib/formato";
import { formatearFecha } from "../almacen/almacen.utils";

type Filtro = "ACTIVAS" | "TODAS" | EstadoOperacion;

const TABS: { clave: Filtro; label: string }[] = [
  { clave: "ACTIVAS", label: "En curso" },
  { clave: "ABIERTA", label: "Abiertas" },
  { clave: "FINALIZADA", label: "Por liquidar" },
  { clave: "EN_LIQUIDACION", label: "En liquidación" },
  { clave: "LIQUIDADA", label: "Liquidadas" },
  { clave: "FACTURADA", label: "Facturadas" },
  { clave: "CERRADA", label: "Cerradas" },
  { clave: "ANULADA", label: "Anuladas" },
  { clave: "TODAS", label: "Todas" },
];

const aFiltro = (f: Filtro): Omit<FiltroOperaciones, "pagina"> => (f === "ACTIVAS" ? { enCurso: true } : f === "TODAS" ? {} : { estado: f });

export default function OperacionesPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("ACTIVAS");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useOperaciones({ pagina, ...aFiltro(filtro), ...(texto.trim() && { buscar: texto.trim() }) });

  // Al cambiar el filtro o la búsqueda se vuelve a la primera página
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
      <EncabezadoPagina titulo="Operaciones" subtitulo="Se crean al convertir una proforma aprobada" />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.clave}
            type="button"
            onClick={() => filtrar(t.clave)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${filtro === t.clave ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Tarjeta sinPadding>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={texto} onChange={(e) => buscar(e.target.value)} placeholder="Buscar por N.° operación, cliente, DAM o BL" className={`${inputClass} pl-9`} />
          </div>
        </div>
        <Tabla
          cargando={isLoading}
          filas={data?.items}
          claveFila={(o) => o.id}
          onFila={(o) => navigate(`/comercial/operaciones/${o.id}`)}
          vacio={texto || filtro !== "ACTIVAS" ? "Ninguna operación coincide" : "No hay operaciones en curso"}
          columnas={[
            { titulo: "Operación", celda: (o) => <span className="font-semibold text-slate-800">{o.numero}</span> },
            { titulo: "Apertura", celda: (o) => formatearFecha(o.fechaApertura) },
            { titulo: "Cliente", celda: (o) => o.cliente },
            { titulo: "Tipo", celda: (o) => `${etiqueta(o.tipoOperacion)} ${etiqueta(o.via).toLowerCase()}` },
            { titulo: "DAM", celda: (o) => o.dam || <span className="text-slate-400">pendiente</span> },
            {
              titulo: "Pagos",
              alinear: "centro",
              celda: (o) => (
                <span className="inline-flex items-center gap-1.5">
                  {o.cantidadPagos}
                  {o.pagosSinSustento > 0 && (
                    <span title={`${o.pagosSinSustento} sin comprobante`} className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 text-xs text-red-600">
                      <FileWarning size={12} /> {o.pagosSinSustento}
                    </span>
                  )}
                </span>
              ),
            },
            { titulo: "Estado", celda: (o) => <EstadoBadge estado={o.estado} /> },
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
