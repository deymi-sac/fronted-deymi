import { useState } from "react";
import { NavLink } from "react-router-dom";
import { getCurrentUser, PERMISOS_ENTRADA_COMERCIAL, ROLES, tieneAlgunPermiso } from "../../modules/auth/auth.utils";
import { useLogout } from "../../modules/auth/useLogout";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Truck,
  UserRound,
  Building2,
  FileText,
  Users,
  ScrollText,
  ShieldCheck,
  Warehouse,
  ArrowLeftRight,
  Package,
  MapPin,
  Receipt,
  Briefcase,
  Database,
  Tag,
  FileSpreadsheet,
  Ship,
  Wallet,
  Calculator,
  Banknote,
  BarChart3,
  Gauge,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Asignación Unidades", path: "/asignacion-unidades", icon: ClipboardList },
  { label: "Unidades", path: "/unidades", icon: Truck },
  { label: "Conductores", path: "/conductores", icon: UserRound },
  { label: "Transportistas", path: "/transportistas", icon: Building2 },
  { label: "Documentos", path: "/documentos", icon: FileText },
];

const menuAlmacen = [
  { label: "Dashboard", path: "/almacen/dashboard", icon: LayoutDashboard },
  { label: "Movimientos", path: "/almacen/movimientos", icon: ArrowLeftRight },
  { label: "Clientes", path: "/almacen/clientes", icon: Building2 },
  { label: "Productos", path: "/almacen/productos", icon: Package },
  { label: "Ubicaciones", path: "/almacen/ubicaciones", icon: MapPin },
  { label: "Facturación", path: "/almacen/facturacion", icon: Receipt },
];

type ItemComercial = { label: string; path: string; icon: typeof Gauge; permisos: string[] };

/** El módulo comercial se separa en bloques que se pueden plegar (desacoplar) y volver a abrir (acoplar). */
const inicioComercial: ItemComercial = { label: "Inicio", path: "/comercial/panel", icon: Gauge, permisos: ["panel_comercial"] };
const gruposComercial: { id: string; titulo: string; items: ItemComercial[] }[] = [
  {
    id: "operacion",
    titulo: "Operación",
    items: [
      { label: "Proformas", path: "/comercial/proformas", icon: FileSpreadsheet, permisos: ["proformas_ver"] },
      { label: "Operaciones", path: "/comercial/operaciones", icon: Ship, permisos: ["operaciones_ver"] },
      { label: "Pagos", path: "/comercial/pagos", icon: Wallet, permisos: ["pagos_ver"] },
      { label: "Liquidaciones", path: "/comercial/liquidaciones", icon: Calculator, permisos: ["liquidaciones_ver"] },
    ],
  },
  {
    id: "finanzas",
    titulo: "Finanzas",
    items: [
      { label: "Facturación", path: "/comercial/facturas", icon: FileText, permisos: ["facturas_ver"] },
      { label: "Cobranza", path: "/comercial/cobranza", icon: Banknote, permisos: ["cobros_ver"] },
      { label: "Reportes", path: "/comercial/reportes", icon: BarChart3, permisos: ["reportes_comercial"] },
    ],
  },
  {
    id: "configuracion",
    titulo: "Configuración",
    items: [
      { label: "Maestros", path: "/comercial/maestros", icon: Database, permisos: ["maestros_ver"] },
      { label: "Tarifas", path: "/comercial/tarifas", icon: Tag, permisos: ["tarifas_ver"] },
    ],
  },
];

/** Administración: usuarios, roles y permisos, y la auditoría (cada acceso con su permiso). */
const menuAdministracion = [
  { label: "Usuarios", path: "/usuarios", icon: Users, permisos: ["usuarios_roles"], soloAdministracion: true },
  { label: "Roles y permisos", path: "/roles", icon: ShieldCheck, permisos: ["usuarios_roles"], soloAdministracion: false },
  { label: "Auditoría", path: "/auditoria", icon: ScrollText, permisos: ["auditoria_ver"], soloAdministracion: false },
];

const CLAVE_PLEGADOS = "sidebar-plegados";

/** Qué módulos y bloques están plegados ("transporte", "almacen", "comercial" y los bloques de Comercial); se recuerda en el navegador. */
function leerPlegados(): string[] {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_PLEGADOS) ?? "[]") as unknown;
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}


interface SidebarProps {
  colapsado: boolean;
  onToggle: () => void;
  abiertoMobile: boolean;
  onCerrarMobile: () => void;
}

export function Sidebar({ colapsado, onToggle, abiertoMobile, onCerrarMobile }: SidebarProps) {
  const usuario = getCurrentUser();
  const esAdministrador = usuario?.id_rol === ROLES.ADMIN || usuario?.id_rol === ROLES.SISTEMAS;
  const accedeTransporte = esAdministrador || usuario?.id_rol === ROLES.COORDINADOR_DE_TRANSPORTE;
  const accedeAlmacen =
    esAdministrador || usuario?.id_rol === ROLES.COORDINADOR_DE_ALMACEN || usuario?.id_rol === ROLES.FACTURACION;
  // La facturación de Almacén (cierre mensual) solo la ven Facturación, Administrador y Sistemas
  const veFacturacionAlmacen = esAdministrador || usuario?.id_rol === ROLES.FACTURACION;
  const accedeComercial = tieneAlgunPermiso(PERMISOS_ENTRADA_COMERCIAL);
  // "Usuarios" sigue siendo de Administrador y Sistemas (la pantalla se abre por rol); lo demás, por permiso
  const itemsAdministracion = menuAdministracion.filter((i) => tieneAlgunPermiso(i.permisos) && (!i.soloAdministracion || esAdministrador));
  const veInicioComercial = tieneAlgunPermiso(inicioComercial.permisos);
  const gruposVisibles = gruposComercial
    .map((g) => ({ ...g, items: g.items.filter((i) => tieneAlgunPermiso(i.permisos)) }))
    .filter((g) => g.items.length > 0);
  const [plegados, setPlegados] = useState<string[]>(leerPlegados);
  const alternar = (id: string) =>
    setPlegados((actuales) => {
      const siguientes = actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id];
      try {
        localStorage.setItem(CLAVE_PLEGADOS, JSON.stringify(siguientes));
      } catch {
        // sin almacenamiento: el pliegue vale solo en esta sesión
      }
      return siguientes;
    });
  const { cerrarSesion } = useLogout();

  // En mobile el sidebar siempre se muestra expandido (es un drawer), el
  // colapsado solo aplica al ancho fijo de escritorio.
  const mostrarTexto = !colapsado || abiertoMobile;

  const linkClass = (isActive: boolean) =>
    `group relative flex items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors ${
      mostrarTexto ? "px-4" : "lg:justify-center lg:px-0"
    } ${
      isActive
        ? "bg-white/10 text-white"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    }`;

  const enlace = (item: { label: string; path: string; icon: typeof Gauge }) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        title={!mostrarTexto ? item.label : undefined}
        onClick={onCerrarMobile}
        className={({ isActive }) => linkClass(isActive)}
      >
        {({ isActive }) => (
          <>
            {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />}
            <Icon size={18} className="flex-shrink-0" />
            {mostrarTexto && <span>{item.label}</span>}
          </>
        )}
      </NavLink>
    );
  };

  /** Título de un módulo que se pliega y se abre; con la barra angosta no se muestra. */
  const encabezadoModulo = (id: string, titulo: string, Icono: typeof Gauge) =>
    mostrarTexto ? (
      <button
        type="button"
        onClick={() => alternar(id)}
        aria-expanded={!plegados.includes(id)}
        className="flex w-full items-center gap-2 px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300"
      >
        <Icono size={14} />
        <span className="flex-1 text-left">{titulo}</span>
        <ChevronDown size={14} className={`transition-transform ${plegados.includes(id) ? "-rotate-90" : ""}`} />
      </button>
    ) : null;
  /** ¿Se muestran los accesos del módulo? Con la barra angosta siempre, porque no hay títulos que plegar. */
  const abierto = (id: string) => !mostrarTexto || !plegados.includes(id);

  return (
    <>
      {/* Fondo oscuro detrás del sidebar en mobile */}
      {abiertoMobile && (
        <div
          onClick={onCerrarMobile}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col bg-[#18193B] text-white transition-all duration-300 lg:relative lg:translate-x-0 ${
          colapsado ? "lg:w-20" : "lg:w-64"
        } w-64 ${abiertoMobile ? "translate-x-0" : "-translate-x-full"}`}
      >
      {/* Botón de colapsar (solo escritorio) */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 hidden h-6 w-6 items-center justify-center rounded-full bg-[#18193B] text-white shadow-md ring-1 ring-white/10 transition hover:bg-[#252659] lg:flex"
      >
        {colapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className="flex h-20 items-center px-7">
        {mostrarTexto && <h1 className="text-xl font-bold tracking-tight">DeymiTool</h1>}
      </div>

      {/* Navegación */}
      <nav className="flex-1 sin-barra overflow-y-auto px-3">
        {accedeTransporte && (
          <div>
            {encabezadoModulo("transporte", "Transporte", Truck)}
            {abierto("transporte") && <div className="space-y-1">{menuItems.map(enlace)}</div>}
          </div>
        )}

        {accedeAlmacen && (
          <div className={accedeTransporte ? "mt-4 border-t border-white/10 pt-4" : ""}>
            {encabezadoModulo("almacen", "Almacén", Warehouse)}
            {abierto("almacen") && <div className="space-y-1">{menuAlmacen.filter((i) => i.path !== "/almacen/facturacion" || veFacturacionAlmacen).map(enlace)}</div>}
          </div>
        )}

        {accedeComercial && (
          <div className="mt-4 border-t border-white/10 pt-4">
            {encabezadoModulo("comercial", "Comercial", Briefcase)}
            {/* Con la barra angosta (solo íconos) no hay títulos que plegar: se ven todos los accesos */}
            {abierto("comercial") && (
              <div className="space-y-1">
                {veInicioComercial && enlace(inicioComercial)}
                {gruposVisibles.map((grupo) => {
                  const plegado = plegados.includes(grupo.id);
                  return (
                    <div key={grupo.id} className="space-y-1">
                      {mostrarTexto && (
                        <button
                          type="button"
                          onClick={() => alternar(grupo.id)}
                          aria-expanded={!plegado}
                          className="mt-3 flex w-full items-center gap-2 px-4 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
                        >
                          <span className="flex-1 text-left">{grupo.titulo}</span>
                          <ChevronDown size={12} className={`transition-transform ${plegado ? "-rotate-90" : ""}`} />
                        </button>
                      )}
                      {(!mostrarTexto || !plegado) && grupo.items.map(enlace)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {itemsAdministracion.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-4">
            {encabezadoModulo("administracion", "Administración", ShieldCheck)}
            {abierto("administracion") && <div className="space-y-1">{itemsAdministracion.map(enlace)}</div>}
          </div>
        )}
      </nav>

      {/* Cerrar sesión */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={cerrarSesion}
          title={!mostrarTexto ? "Cerrar sesión" : undefined}
          className={`flex w-full items-center gap-3 rounded-lg bg-red-500/10 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 ${
            mostrarTexto ? "px-4" : "lg:justify-center lg:px-0"
          }`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {mostrarTexto && "Cerrar sesión"}
        </button>
      </div>
    </aside>
    </>
  );
}