import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Campo } from "../../components/ui/FormularioModal";
import { PieTabla } from "../../components/ui/PieTabla";
import { Tabla } from "../../components/ui/Tabla";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { inputClass } from "../../lib/estilos";
import { etiqueta } from "../../lib/formato";
import { useDiferido } from "../../lib/useDiferido";
import { mensajeDeError } from "../../lib/useEnviar";
import { tienePermiso } from "../auth/auth.utils";
import { useUsuarios } from "../usuarios/UseUsuarios";
import { useAccesos, useActividad, type OrigenActividad } from "./administracion.api";

type Vista = "movimientos" | "ingresos";

const ORIGENES: { valor: OrigenActividad; texto: string }[] = [
  { valor: "ADMIN", texto: "Administración (usuarios y roles)" },
  { valor: "OPERACION", texto: "Operaciones, documentos y cobranza" },
  { valor: "PAGO", texto: "Pagos" },
];

const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "medium" });

/** Etiqueta redondeada, como las de estado del resto del módulo. */
const Pastilla = ({ clase, children }: { clase: string; children: ReactNode }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${clase}`}>{children}</span>
);

/** Auditoría: quién hizo qué y cuándo, y los ingresos al sistema (exitosos y fallidos). */
export default function AuditoriaPage() {
  const [vista, setVista] = useState<Vista>("movimientos");
  const tabs: { clave: Vista; label: string }[] = [
    { clave: "movimientos", label: "Movimientos" },
    { clave: "ingresos", label: "Ingresos al sistema" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Auditoría</h1>
        <p className="mt-1 text-sm text-slate-500">Quién hizo qué y cuándo. No se puede modificar ni borrar</p>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.clave}
            type="button"
            onClick={() => setVista(t.clave)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${vista === t.clave ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {vista === "movimientos" ? <Movimientos /> : <Ingresos />}
    </div>
  );
}

/** Lista de usuarios para filtrar: solo se consulta si quien mira puede administrar usuarios. */
function FiltroUsuario({ valor, onCambiar }: { valor: number; onCambiar: (id: number) => void }) {
  const usuarios = useUsuarios();
  const lista = Array.isArray(usuarios.data) ? usuarios.data : (usuarios.data?.data ?? []);
  return (
    <Campo label="Usuario">
      <select value={valor} onChange={(e) => onCambiar(Number(e.target.value))} className={inputClass}>
        <option value={0}>Todos</option>
        {lista.map((u) => (
          <option key={u.user_id} value={u.user_id}>
            {u.nombre} {u.apellido}
          </option>
        ))}
      </select>
    </Campo>
  );
}

function Movimientos() {
  const verUsuarios = tienePermiso("usuarios_roles");
  const [pagina, setPagina] = useState(1);
  const [origen, setOrigen] = useState<OrigenActividad | "">("");
  const [usuarioId, setUsuarioId] = useState(0);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [texto, setTexto] = useState("");
  const buscar = useDiferido(texto.trim(), 350);
  const rangoInvalido = !!desde && !!hasta && desde > hasta;

  const { data, isLoading, error } = useActividad({
    pagina,
    usuarioId: usuarioId || undefined,
    origen: origen || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    buscar: buscar || undefined,
  });
  /** Cambiar un filtro vuelve a la primera página */
  const cambiar = <T,>(poner: (v: T) => void) => (v: T) => {
    poner(v);
    setPagina(1);
  };

  return (
    <>
      {rangoInvalido && (
        <div className="mb-4">
          <Aviso tono="advertencia" titulo="La fecha inicial es posterior a la final" />
        </div>
      )}
      {error && !rangoInvalido && (
        <div className="mb-4">
          <Aviso tono="error" titulo="No se pudo cargar">
            {mensajeDeError(error)}
          </Aviso>
        </div>
      )}
      <Tarjeta sinPadding>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={texto} onChange={(e) => cambiar(setTexto)(e.target.value)} placeholder="Buscar en descripción o motivo" className={`${inputClass} pl-9`} />
          </div>
          {verUsuarios && (
            <FiltroUsuario valor={usuarioId} onCambiar={cambiar(setUsuarioId)} />
          )}
          <Campo label="Origen">
            <select value={origen} onChange={(e) => cambiar(setOrigen)(e.target.value as OrigenActividad | "")} className={inputClass}>
              <option value="">Todos</option>
              {ORIGENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Desde">
            <input type="date" value={desde} onChange={(e) => cambiar(setDesde)(e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={hasta} onChange={(e) => cambiar(setHasta)(e.target.value)} className={inputClass} />
          </Campo>
        </div>
        <Tabla
          paginar={false}
          cargando={isLoading}
          filas={data?.items}
          claveFila={(m) => m.clave}
          vacio="Sin movimientos para estos filtros"
          columnas={[
            { titulo: "Fecha y hora", celda: (m) => <span className="whitespace-nowrap text-xs">{fechaHora(m.fechaHora)}</span> },
            { titulo: "Usuario", celda: (m) => m.usuario },
            { titulo: "Acción", celda: (m) => <Pastilla clase="border-slate-200 bg-slate-100 text-slate-700">{etiqueta(m.accion)}</Pastilla> },
            {
              titulo: "Detalle",
              celda: (m) => (
                <span className="block max-w-xl">
                  {m.descripcion}
                  {m.motivo && <span className="block text-xs italic text-slate-500">Motivo: {m.motivo}</span>}
                </span>
              ),
            },
            { titulo: "Sobre", celda: (m) => <span className="whitespace-nowrap">{m.referencia}</span> },
          ]}
        />
        {data && (
          <PieTabla pagina={data.pagina} paginas={data.paginas} onPagina={setPagina}>
            {data.total} {data.total === 1 ? "registro" : "registros"}
          </PieTabla>
        )}
      </Tarjeta>
    </>
  );
}

function Ingresos() {
  const [pagina, setPagina] = useState(1);
  const [exitoso, setExitoso] = useState<boolean | undefined>(undefined);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [texto, setTexto] = useState("");
  const buscar = useDiferido(texto.trim(), 350);
  const rangoInvalido = !!desde && !!hasta && desde > hasta;
  const { data, isLoading, error } = useAccesos({ pagina, exitoso, desde: desde || undefined, hasta: hasta || undefined, buscar: buscar || undefined }, true);
  const cambiar = <T,>(poner: (v: T) => void) => (v: T) => {
    poner(v);
    setPagina(1);
  };

  return (
    <>
      {rangoInvalido && (
        <div className="mb-4">
          <Aviso tono="advertencia" titulo="La fecha inicial es posterior a la final" />
        </div>
      )}
      {error && !rangoInvalido && (
        <div className="mb-4">
          <Aviso tono="error" titulo="No se pudo cargar">
            {mensajeDeError(error)}
          </Aviso>
        </div>
      )}
      <Tarjeta sinPadding>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={texto} onChange={(e) => cambiar(setTexto)(e.target.value)} placeholder="Correo con el que se intentó" className={`${inputClass} pl-9`} />
          </div>
          <Campo label="Resultado">
            <select
              value={exitoso === undefined ? "" : String(exitoso)}
              onChange={(e) => cambiar(setExitoso)(e.target.value === "" ? undefined : e.target.value === "true")}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="true">Ingresos</option>
              <option value="false">Fallidos</option>
            </select>
          </Campo>
          <Campo label="Desde">
            <input type="date" value={desde} onChange={(e) => cambiar(setDesde)(e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={hasta} onChange={(e) => cambiar(setHasta)(e.target.value)} className={inputClass} />
          </Campo>
        </div>
        <Tabla
          paginar={false}
          cargando={isLoading}
          filas={data?.items}
          claveFila={(a) => a.id}
          vacio="Sin ingresos registrados"
          columnas={[
            { titulo: "Fecha y hora", celda: (a) => <span className="whitespace-nowrap text-xs">{fechaHora(a.fechaHora)}</span> },
            { titulo: "Usuario", celda: (a) => <code className="text-xs">{a.usuarioIntentado}</code> },
            {
              titulo: "Resultado",
              celda: (a) =>
                a.exitoso ? (
                  <Pastilla clase="border-green-200 bg-green-50 text-green-700">Ingreso</Pastilla>
                ) : (
                  <Pastilla clase="border-red-200 bg-red-50 text-red-700">Fallido{a.motivoFallo ? ` · ${a.motivoFallo}` : ""}</Pastilla>
                ),
            },
            { titulo: "IP", celda: (a) => <span className="text-xs text-slate-500">{a.ip ?? "—"}</span> },
          ]}
        />
        {data && (
          <PieTabla pagina={data.pagina} paginas={data.paginas} onPagina={setPagina}>
            {data.total} {data.total === 1 ? "registro" : "registros"}
          </PieTabla>
        )}
      </Tarjeta>
    </>
  );
}
