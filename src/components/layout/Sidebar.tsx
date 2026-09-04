import { NavLink } from "react-router-dom";
import { getCurrentUser, ROLES } from "../../modules/auth/auth.utils";
import { useLogout } from "../../modules/auth/useLogout";


const menuItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
  },
  {
    label: "Asignación Unidades",
    path: "/asignacion-unidades",
  },
  {
    label: "Unidades",
    path: "/unidades",
  },
  { label: "Conductores", path: "/conductores" },
  {
    label: "Transportistas",
    path: "/transportistas",
  },
  { label: "Documentos", path: "/documentos" },
];



export function Sidebar() {

    const usuario = getCurrentUser();

    const esAdministrador = usuario?.id_rol === ROLES.ADMIN;
    const { cerrarSesion } = useLogout();

    
  return (
    <aside className="flex h-screen w-64 flex-col bg-[#18193B] text-white">
      
      {/* Logo */}
      <div className="flex h-20 items-center px-7">
        <h1 className="text-xl font-bold tracking-tight">
          DeymiTool
        </h1>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Transportistas */}
        {/* Usuarios - solo administrador */}
        {esAdministrador && (
        <NavLink
            to="/usuarios"
            className={({ isActive }) =>
            `flex items-center rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
                ? "bg-white/10 text-white"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            }`
            }
        >
            Usuarios
        </NavLink>
        )}

      </nav>

      {/* Cerrar sesión */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={cerrarSesion}
          className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}