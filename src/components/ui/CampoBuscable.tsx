import { useState } from "react";
import { Plus } from "lucide-react";
import { inputClass } from "../../lib/estilos";
import { buscarParecidos, normalizar } from "../../lib/busqueda";

export interface OpcionBuscable {
  id: number;
  texto: string;
  /** Segunda línea, más pequeña (no cuenta para la búsqueda) */
  detalle?: string;
}

/**
 * Lista que se filtra escribiendo (sin tildes y con errores de tipeo) y, con `onCrear`,
 * permite crear lo que no exista sin salir de la pantalla.
 */
export function CampoBuscable({
  valor,
  opciones,
  onCambiar,
  onCrear,
  disabled = false,
  placeholder = "—",
  ariaLabel,
  quitable = true,
}: {
  valor: number | null;
  opciones: OpcionBuscable[];
  onCambiar: (id: number | null) => void;
  onCrear?: (texto: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  quitable?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [marcado, setMarcado] = useState(0);

  const elegida = opciones.find((o) => o.id === valor);
  const escrito = texto.trim();
  const visibles = escrito ? buscarParecidos(escrito, opciones, (o) => o.texto, 50) : opciones;
  const existe = opciones.some((o) => normalizar(o.texto) === normalizar(escrito));
  const puedeCrear = !!onCrear && !!escrito && !existe;
  const quitar = quitable && valor !== null && !escrito;

  function cerrar() {
    setTexto("");
    setMarcado(0);
    setAbierto(false);
  }
  function elegir(id: number | null) {
    onCambiar(id);
    cerrar();
  }
  function crear() {
    onCrear!(escrito);
    cerrar();
  }

  // En orden: quitar y opciones. El teclado las recorre igual que se ven; "Crear" queda fuera
  // a propósito: con Enter se creaba sin querer lo que se estaba escribiendo. Se crea con clic.
  const filas: (() => void)[] = [...(quitar ? [() => elegir(null)] : []), ...visibles.map((o) => () => elegir(o.id))];
  const desde = quitar ? 1 : 0;

  function tecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setMarcado((m) => Math.min(m + 1, filas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarcado((m) => Math.max(m - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (abierto && filas[marcado]) filas[marcado]!();
    } else if (e.key === "Escape") {
      cerrar();
    }
  }

  const clase = (i: number) => `cursor-pointer px-3 py-1.5 ${i === marcado ? "bg-slate-100 text-slate-800" : "text-slate-700"}`;
  // onMouseDown para elegir antes de que el campo pierda el foco
  const alClic = (accion: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    accion();
  };

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={abierto}
        disabled={disabled}
        // Abierto se escribe para filtrar; lo elegido queda como guía
        value={abierto ? texto : (elegida?.texto ?? "")}
        placeholder={abierto ? (elegida?.texto ?? "Escribe para buscar…") : placeholder}
        className={inputClass}
        onChange={(e) => {
          setTexto(e.target.value);
          setMarcado(0);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onClick={() => setAbierto(true)}
        onBlur={cerrar}
        onKeyDown={tecla}
      />
      {abierto && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full min-w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {quitar && (
            <li role="option" aria-selected={marcado === 0} onMouseDown={alClic(() => elegir(null))} onMouseEnter={() => setMarcado(0)} className={`${clase(0)} text-slate-400`}>
              — Sin elegir
            </li>
          )}
          {visibles.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i + desde === marcado}
              onMouseDown={alClic(() => elegir(o.id))}
              onMouseEnter={() => setMarcado(i + desde)}
              className={`${clase(i + desde)} ${o.id === valor ? "font-medium" : ""}`}
            >
              {o.texto}
              {o.detalle && <span className="block text-xs text-slate-500">{o.detalle}</span>}
            </li>
          ))}
          {visibles.length === 0 && !puedeCrear && <li className="px-3 py-2 text-slate-400">{escrito ? "No hay nada parecido" : "La lista está vacía"}</li>}
          {puedeCrear && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={alClic(crear)}
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
