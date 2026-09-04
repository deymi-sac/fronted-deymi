
import { NavLink } from "react-router-dom";
import { getCurrentUser, ROLES } from "../../modules/auth/auth.utils";
import { useLogout } from "../../modules/auth/useLogout";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Asignación Unidades", path: "/asignacion-unidades" },
  { label: "Unidades", path: "/unidades" },
  { label: "Conductores", path: "/conductores" },
  { label: "Transportistas", path: "/transportistas" },
  { label: "Documentos", path: "/documentos" },
];

interface SidebarProps {
  colapsado: boolean;
  onToggle: () => void;
}

export function Sidebar({ colapsado, onToggle }: SidebarProps) {
  const usuario = getCurrentUser();
  const esAdministrador = usuario?.id_rol === ROLES.ADMIN;
  const { cerrarSesion } = useLogout();

  return (
    <aside
      className={`relative flex h-screen flex-col bg-[#18193B] text-white transition-all duration-300 ${
        colapsado ? "w-20" : "w-64"
      }`}
    >
      {/* Botón de colapsar */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full bg-[#18193B] text-white shadow-md hover:bg-[#252659]"
      >
        {colapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className="flex h-20 items-center px-7">
        <h1 className={`text-xl font-bold tracking-tight transition-opacity ${colapsado ? "opacity-0" : "opacity-100"}`}>
          {colapsado ? "" : "DeymiTool"}
        </h1>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={colapsado ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-4 py-3 text-sm font-medium transition ${
                  colapsado ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {colapsado ? item.label.charAt(0) : item.label}
            </NavLink>
          ))}
        </div>

        {esAdministrador && (
          <NavLink
            to="/usuarios"
            title={colapsado ? "Usuarios" : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg px-4 py-3 text-sm font-medium transition ${
                colapsado ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {colapsado ? "U" : "Usuarios"}
          </NavLink>
        )}
      </nav>

      {/* Cerrar sesión */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={cerrarSesion}
          title={colapsado ? "Cerrar sesión" : undefined}
          className={`flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white ${
            colapsado ? "justify-center" : ""
          }`}
        >
          <LogOut size={16} />
          {!colapsado && "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}