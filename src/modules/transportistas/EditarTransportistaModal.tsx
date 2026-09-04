import { useState } from "react";
import { isAxiosError } from "axios";
import { useActualizarTransportista } from "./useTransportistas";
import type { Transportista } from "./transportistas.api";

interface EditarTransportistaModalProps {
  transportista: Transportista;
  onClose: () => void;
}

export function EditarTransportistaModal({ transportista, onClose }: EditarTransportistaModalProps) {
  const [formData, setFormData] = useState({
    tex_razon_social: transportista.tex_razon_social,
    tex_ruc: transportista.tex_ruc,
    tex_nombre_comercial: transportista.tex_nombre_comercial ?? "",
    tex_telefono: transportista.tex_telefono ?? "",
    tex_email: transportista.tex_email ?? "",
    tex_status_homolo: transportista.tex_status_homolo,
    tex_observaciones: transportista.tex_observaciones ?? "",
  });

  const { mutate, isPending, error } = useActualizarTransportista();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { id: transportista.id_transportista, payload: formData },
      { onSuccess: () => onClose() }
    );
  }

  const mensajeError = isAxiosError(error)
    ? error.response?.data?.error
    : error
    ? "Error al actualizar transportista"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Editar transportista</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Razón social</label>
            <input
              name="tex_razon_social"
              value={formData.tex_razon_social}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">RUC</label>
              <input
                name="tex_ruc"
                value={formData.tex_ruc}
                onChange={handleChange}
                maxLength={11}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre comercial</label>
              <input
                name="tex_nombre_comercial"
                value={formData.tex_nombre_comercial}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                name="tex_telefono"
                value={formData.tex_telefono}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
              <input
                type="email"
                name="tex_email"
                value={formData.tex_email}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">¿Homologado?</label>
            <select
              name="tex_status_homolo"
              value={formData.tex_status_homolo ? "true" : "false"}
              onChange={(e) => setFormData((prev) => ({ ...prev, tex_status_homolo: e.target.value === "true" }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              name="tex_observaciones"
              value={formData.tex_observaciones}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {mensajeError && <p className="text-sm text-red-500">{mensajeError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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