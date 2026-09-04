import { useState } from "react";
import {
  useEstadosUnidad,
  useCrearEstadoUnidad,
  useActualizarEstadoUnidad,
  useEliminarEstadoUnidad,
} from "./useEstadosUnidad";

interface GestionEstadosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GestionEstadosModal({ isOpen, onClose }: GestionEstadosModalProps) {
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditando, setNombreEditando] = useState("");

  const { data: estados, isLoading } = useEstadosUnidad();
  const crear = useCrearEstadoUnidad();
  const actualizar = useActualizarEstadoUnidad();
  const eliminar = useEliminarEstadoUnidad();

  if (!isOpen) return null;

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoEstado.trim()) return;
    crear.mutate(nuevoEstado, { onSuccess: () => setNuevoEstado("") });
  }

  function iniciarEdicion(id: number, nombreActual: string) {
    setEditandoId(id);
    setNombreEditando(nombreActual);
  }

  function guardarEdicion(id: number) {
    if (!nombreEditando.trim()) return;
    actualizar.mutate({ id, nombre_estado: nombreEditando }, { onSuccess: () => setEditandoId(null) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Estados de unidad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleCrear} className="mb-4 flex gap-2">
          <input
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
            placeholder="Nuevo estado..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={crear.isPending}
            className="rounded-md bg-[#18193B] px-3 py-2 text-sm font-medium text-white hover:bg-[#18193B]/90"
          >
            Agregar
          </button>
        </form>

        {isLoading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : (
          <ul className="space-y-2">
            {estados?.map((estado) => (
              <li key={estado.id_estado} className="flex items-center justify-between rounded-md border p-2">
                {editandoId === estado.id_estado ? (
                  <input
                    value={nombreEditando}
                    onChange={(e) => setNombreEditando(e.target.value)}
                    onBlur={() => guardarEdicion(estado.id_estado)}
                    onKeyDown={(e) => e.key === "Enter" && guardarEdicion(estado.id_estado)}
                    autoFocus
                    className="flex-1 rounded-md border border-blue-400 px-2 py-1 text-sm"
                  />
                ) : (
                  <span className="text-sm">{estado.nombre_estado}</span>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => iniciarEdicion(estado.id_estado, estado.nombre_estado)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminar.mutate(estado.id_estado)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}