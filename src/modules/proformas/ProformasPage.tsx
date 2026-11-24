import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useProformas, type EstadoProforma } from "./proformas.api";
import { EstadoBadge } from "./EstadoBadge";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { PieTabla } from "../../components/ui/PieTabla";
import { Tabla } from "../../components/ui/Tabla";
import { Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, inputClass } from "../../lib/estilos";
import { tienePermiso } from "../auth/auth.utils";
import { dinero, etiqueta } from "../../lib/formato";
import { formatearFecha } from "../almacen/almacen.utils";

type Filtro = "TODAS" | EstadoProforma;

const FILTROS: { clave: Filtro; label: string }[] = [
  { clave: "TODAS", label: "Todas" },
  { clave: "BORRADOR", label: "Borrador" },
  { clave: "ENVIADA", label: "Enviadas" },
  { clave: "APROBADA", label: "Aprobadas" },
  { clave: "CONVERTIDA", label: "Convertidas" },
  { clave: "RECHAZADA", label: "Rechazadas" },
  { clave: "ANULADA", label: "Anuladas" },
];

export default function ProformasPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useProformas({
    pagina,
    ...(filtro !== "TODAS" && { estado: filtro }),
    ...(texto.trim() && { buscar: texto.trim() }),
  });

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
      <EncabezadoPagina
        titulo="Proformas"
        subtitulo="Cotizaciones al cliente"
        acciones={
          tienePermiso("proformas_crear") && (
            <Link to="/comercial/proformas/nueva" className={btnPrimario}>
              <Plus size={16} /> Nueva proforma
            </Link>
          )
        }
      />

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
            <input value={texto} onChange={(e) => buscar(e.target.value)} placeholder="Buscar por número, cliente u orden de servicio" className={`${inputClass} pl-9`} />
          </div>
        </div>
        <Tabla
          cargando={isLoading}
          filas={data?.items}
          claveFila={(p) => p.id}
          onFila={(p) => navigate(`/comercial/proformas/${p.id}`)}
          vacio={texto || filtro !== "TODAS" ? "Ninguna proforma coincide" : "Todavía no hay proformas"}
          columnas={[
            { titulo: "Número", celda: (p) => <span className="font-semibold text-slate-800">{p.numero}</span> },
            { titulo: "Fecha", celda: (p) => formatearFecha(p.fecha) },
            { titulo: "Cliente", celda: (p) => p.cliente },
            { titulo: "Operación", celda: (p) => `${etiqueta(p.tipoOperacion)} ${etiqueta(p.via).toLowerCase()}` },
            { titulo: "Línea", celda: (p) => p.lineaNaviera || "—" },
            { titulo: "Total", alinear: "derecha", celda: (p) => <span className="font-medium">{dinero(p.total, p.moneda)}</span> },
            {
              titulo: "Estado",
              celda: (p) => (
                <span className="flex flex-wrap items-center gap-1.5">
                  <EstadoBadge estado={p.estado} />
                  {p.vencida && <EstadoBadge estado="VENCIDA" />}
                  {p.operacion && <span className="text-xs text-slate-500">{p.operacion.numero}</span>}
                </span>
              ),
            },
          ]}
        />
        {data && (
          <PieTabla pagina={data.pagina} paginas={data.paginas} onPagina={setPagina}>
            {data.total} {data.total === 1 ? "proforma" : "proformas"}
          </PieTabla>
        )}
      </Tarjeta>
    </div>
  );
}
