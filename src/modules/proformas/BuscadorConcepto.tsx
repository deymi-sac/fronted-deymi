import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { inputClass } from "../../lib/estilos";
import { dinero } from "../../lib/formato";
import { buscarParecidos, normalizar } from "../../lib/busqueda";
import type { Concepto } from "../maestros/maestros.api";

/** Campo para agregar un concepto escribiendo: muestra los más parecidos a lo escrito y se elige con clic o Enter. Con `onCrear`, lo que no exista se crea. */
export function BuscadorConcepto({ conceptos, onElegir, onCrear }: { conceptos: Concepto[]; onElegir: (id: number) => void; onCrear?: (texto: string) => void }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [marcado, setMarcado] = useState(0);

  const opciones = texto.trim()
    ? buscarParecidos(texto, conceptos, (c) => c.nombre)
    : [...conceptos].sort((a, b) => a.nombre.localeCompare(b.nombre)).slice(0, 8);

  const escrito = texto.trim();
  const puedeCrear = !!onCrear && !!escrito && !conceptos.some((c) => normalizar(c.nombre) === normalizar(escrito));

  function limpiar() {
    setTexto("");
    setMarcado(0);
    setAbierto(false);
  }
  function crear() {
    onCrear!(escrito);
    limpiar();
  }
  function elegir(c: Concepto) {
    onElegir(c.id);
    limpiar();
  }

  function tecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setMarcado((m) => Math.min(m + 1, opciones.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarcado((m) => Math.max(m - 1, 0));
    } else if (e.key === "Enter") {
      // Enter solo elige un concepto que ya existe; crear uno nuevo es siempre con clic
      e.preventDefault();
      if (abierto && opciones[marcado]) elegir(opciones[marcado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={texto}
        placeholder="Agregar otro concepto… (escribe para buscar)"
        aria-label="Agregar otro concepto"
        role="combobox"
        aria-expanded={abierto}
        className={`${inputClass} pl-9`}
        onChange={(e) => {
          setTexto(e.target.value);
          setMarcado(0);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={tecla}
      />
      {abierto && (
        <ul role="listbox" className="absolute bottom-full z-20 mb-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {opciones.length === 0 && !puedeCrear && <li className="px-3 py-2 text-slate-400">No hay conceptos parecidos</li>}
          {opciones.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === marcado}
              // onMouseDown para elegir antes de que el campo pierda el foco
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(c);
              }}
              onMouseEnter={() => setMarcado(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-1.5 ${i === marcado ? "bg-slate-100 text-slate-800" : "text-slate-700"}`}
            >
              <span>{c.nombre}</span>
              {c.precioSugerido != null && (
                <span className="whitespace-nowrap text-xs text-slate-500">
                  {dinero(c.precioSugerido, c.precioMoneda)}
                  {c.precioIncluyeIgv ? " inc. IGV" : ""}
                </span>
              )}
            </li>
          ))}
          {puedeCrear && (
            <li
              role="option"
              aria-selected={marcado === opciones.length}
              onMouseDown={(e) => {
                e.preventDefault();
                crear();
              }}
              className="flex cursor-pointer items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus size={14} className="shrink-0" /> Crear &quot;{escrito}&quot;
              <span className="ml-auto text-xs font-normal text-slate-400">con clic</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
