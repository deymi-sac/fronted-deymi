import { useState } from "react";
import { isAxiosError } from "axios";
import { useActualizarUnidad } from "./useActualizarUnidad";
import { useEstadosUnidad } from "../catalogos/useEstadosUnidad";
import { GestionEstadosModal } from "../catalogos/GestionEstadosModal";
import type { Unidad } from "./unidades.api";

interface ErrorResponse {
  error: string;
  detalles?: { campo: string; mensaje: string }[];
}

interface EditarUnidadModalProps {
  unidad: Unidad;
  onClose: () => void;
}

export function EditarUnidadModal({ unidad, onClose }: EditarUnidadModalProps) {
  const [formData, setFormData] = useState({
    uni_placa: unidad.uni_placa,
    uni_placa_secundaria: unidad.uni_placa_secundaria ?? "",
    uni_type_vehiculo: unidad.uni_type_vehiculo,
    id_estado: String(unidad.id_estado),
    uni_observaciones: unidad.uni_observaciones ?? "",
  });
  const [gestionEstadosAbierto, setGestionEstadosAbierto] = useState(false);

  const { mutate, isPending, error, reset } = useActualizarUnidad();
  const { data: estados } = useEstadosUnidad();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { id: unidad.id_unidad, payload: { ...formData, id_estado: Number(formData.id_estado) } },
      { onSuccess: () => onClose() }
    );
  }

  function handleClose() {
    reset();
    onClose();
  }

  const mensajeError = isAxiosError<ErrorResponse>(error)
    ? error.response?.data.detalles?.map((d) => d.mensaje).join(", ") || error.response?.data.error
    : error
    ? "Error al actualizar unidad"
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Editar unidad</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Placa</label>
                <input
                  name="uni_placa"
                  value={formData.uni_placa}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Placa secundaria</label>
                <input
                  name="uni_placa_secundaria"
                  value={formData.uni_placa_secundaria}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de vehículo</label>
              <input
                name="uni_type_vehiculo"
                value={formData.uni_type_vehiculo}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <button
                  type="button"
                  onClick={() => setGestionEstadosAbierto(true)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Gestionar estados
                </button>
              </div>
              <select
                name="id_estado"
                value={formData.id_estado}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {estados?.map((estado) => (
                  <option key={estado.id_estado} value={estado.id_estado}>
                    {estado.nombre_estado}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
              <textarea
                name="uni_observaciones"
                value={formData.uni_observaciones}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {mensajeError && <p className="text-sm text-red-500">{mensajeError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-[#18193B] px-4 py-2 text-sm font-medium text-white hover:bg-[#18193B]/90 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <GestionEstadosModal isOpen={gestionEstadosAbierto} onClose={() => setGestionEstadosAbierto(false)} />
    </>
  );
}