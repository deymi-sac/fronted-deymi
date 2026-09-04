import { useState } from "react";
import { Menu } from "lucide-react";

interface Usuario {
  user_id: number;
  nombre: string;
  apellido: string;
  correo: string;
  id_rol: number;
}

const NOMBRES_ROLES: Record<number, string> = {
  1: "Administrador",
  2: "Coordinador de transporte",
};

function obtenerUsuario(): Usuario | null {
  const usuarioGuardado = localStorage.getItem("usuario");

  if (!usuarioGuardado) {
    return null;
  }

  try {
    return JSON.parse(usuarioGuardado) as Usuario;
  } catch {
    return null;
  }
}

interface HeaderProps {
  onAbrirMenuMobile: () => void;
}

export function Header({ onAbrirMenuMobile }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const usuario = obtenerUsuario();

  const nombreCompleto = usuario
    ? `${usuario.nombre} ${usuario.apellido}`
    : "Usuario";

  const rol = usuario
    ? NOMBRES_ROLES[usuario.id_rol] ?? "Usuario"
    : "Usuario";

  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-8">
      {/* Botón menú mobile + Título */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAbrirMenuMobile}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1 className="text-xl font-semibold text-[#18193B]">

          </h1>

          <p className="mt-1 text-sm text-gray-500">

          </p>
        </div>
      </div>

      {/* Usuario */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-gray-50"
        >
          {/* Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18193B] text-sm font-semibold text-white">
            {usuario?.nombre?.charAt(0).toUpperCase() ?? "U"}
          </div>

          {/* Información */}
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-[#18193B]">
              {nombreCompleto}
            </p>

            <p className="text-xs text-gray-500">
              {rol}
            </p>
          </div>

          {/* Flecha */}
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Menú usuario */}
        {menuOpen && (
          <div className="absolute right-0 top-14 z-50 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
            <div className="border-b border-gray-100 px-3 py-3">
              <p className="text-sm font-semibold text-[#18193B]">
                {nombreCompleto}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {usuario?.correo ?? ""}
              </p>
            </div>

            <div className="px-3 py-2">
              <p className="text-xs font-medium text-gray-400">
                ROL
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {rol}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}