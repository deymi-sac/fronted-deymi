import { useState } from "react";
import { isAxiosError } from "axios";
import { useActualizarConductor } from "./useActualizarConductor";
import type { Conductor } from "./conductores.api";

interface ErrorDetalle {
  campo: string;
  mensaje: string;
}

interface ErrorResponse {
  error: string;
  detalles?: ErrorDetalle[];
}

interface EditarConductorModalProps {
  conductor: Conductor;
  onClose: () => void;
}

export function EditarConductorModal({ conductor, onClose }: EditarConductorModalProps) {
  const [formData, setFormData] = useState({
    in_name: conductor.in_name,
    in_apellido: conductor.in_apellido,
    in_type_brevete: conductor.in_type_brevete ?? "",
    in_brevete_num: conductor.in_brevete_num ?? "",
    in_telefono: conductor.in_telefono ?? "",
    in_email: conductor.in_email ?? "",
    in_observaciones: conductor.in_observaciones ?? "",
    in_status: conductor.in_status,
  });

  const { mutate, isPending, error, reset } = useActualizarConductor();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { id: conductor.in_id_conductor, payload: formData },
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
    ? "Error al actualizar conductor"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Editar conductor</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombres</label>
              <input
                name="in_name"
                value={formData.in_name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Apellidos</label>
              <input
                name="in_apellido"
                value={formData.in_apellido}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">DNI</label>
            <input
              value={conductor.in_dni}
              disabled
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">El DNI no se puede modificar</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de licencia</label>
              <input
                name="in_type_brevete"
                value={formData.in_type_brevete}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">N° de brevete</label>
              <input
                name="in_brevete_num"
                value={formData.in_brevete_num}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                name="in_telefono"
                value={formData.in_telefono}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
              <input
                type="email"
                name="in_email"
                value={formData.in_email}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
            <select
              name="in_status"
              value={formData.in_status ? "true" : "false"}
              onChange={(e) => setFormData((prev) => ({ ...prev, in_status: e.target.value === "true" }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              name="in_observaciones"
              value={formData.in_observaciones}
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
  );
}