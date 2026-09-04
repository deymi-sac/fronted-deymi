import { NavLink } from "react-router-dom";
import { getCurrentUser, ROLES } from "../../modules/auth/auth.utils";
import { useLogout } from "../../modules/auth/useLogout";
import {
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
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Asignación Unidades", path: "/asignacion-unidades", icon: ClipboardList },
  { label: "Unidades", path: "/unidades", icon: Truck },
  { label: "Conductores", path: "/conductores", icon: UserRound },
  { label: "Transportistas", path: "/transportistas", icon: Building2 },
  { label: "Documentos", path: "/documentos", icon: FileText },
];

interface SidebarProps {
  colapsado: boolean;
  onToggle: () => void;
  abiertoMobile: boolean;
  onCerrarMobile: () => void;
}

export function Sidebar({ colapsado, onToggle, abiertoMobile, onCerrarMobile }: SidebarProps) {
  const usuario = getCurrentUser();
  const esAdministrador = usuario?.id_rol === ROLES.ADMIN;
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
      <nav className="flex-1 overflow-y-auto px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
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
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />
                    )}
                    <Icon size={18} className="flex-shrink-0" />
                    {mostrarTexto && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {esAdministrador && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <NavLink
              to="/usuarios"
              title={!mostrarTexto ? "Usuarios" : undefined}
              onClick={onCerrarMobile}
              className={({ isActive }) => linkClass(isActive)}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />
                  )}
                  <Users size={18} className="flex-shrink-0" />
                  {mostrarTexto && <span>Usuarios</span>}
                </>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      {/* Cerrar sesión */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={cerrarSesion}
          title={!mostrarTexto ? "Cerrar sesión" : undefined}
          className={`flex w-full items-center gap-3 rounded-lg py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
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