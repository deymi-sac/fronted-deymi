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
}

export function Sidebar({ colapsado, onToggle }: SidebarProps) {
  const usuario = getCurrentUser();
  const esAdministrador = usuario?.id_rol === ROLES.ADMIN;
  const { cerrarSesion } = useLogout();

  const linkClass = (isActive: boolean) =>
    `group relative flex items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors ${
      colapsado ? "justify-center px-0" : "px-4"
    } ${
      isActive
        ? "bg-white/10 text-white"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <aside
      className={`relative flex h-screen flex-col bg-[#18193B] text-white transition-all duration-300 ${
        colapsado ? "w-20" : "w-64"
      }`}
    >
      {/* Botón de colapsar */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full bg-[#18193B] text-white shadow-md ring-1 ring-white/10 transition hover:bg-[#252659]"
      >
        {colapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className="flex h-20 items-center px-7">
        {!colapsado && <h1 className="text-xl font-bold tracking-tight">DeymiTool</h1>}
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
                title={colapsado ? item.label : undefined}
                className={({ isActive }) => linkClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />
                    )}
                    <Icon size={18} className="flex-shrink-0" />
                    {!colapsado && <span>{item.label}</span>}
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
              title={colapsado ? "Usuarios" : undefined}
              className={({ isActive }) => linkClass(isActive)}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />
                  )}
                  <Users size={18} className="flex-shrink-0" />
                  {!colapsado && <span>Usuarios</span>}
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
          title={colapsado ? "Cerrar sesión" : undefined}
          className={`flex w-full items-center gap-3 rounded-lg py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
            colapsado ? "justify-center px-0" : "px-4"
          }`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!colapsado && "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}