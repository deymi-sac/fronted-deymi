import { useState } from "react";
import { isAxiosError } from "axios";
import { useCrearConductor } from "./useCrearConductor";

interface CrearConductorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CrearConductorModal({ isOpen, onClose }: CrearConductorModalProps) {
  const [formData, setFormData] = useState({
    in_name: "",
    in_apellido: "",
    in_dni: "",
    in_type_brevete: "",
    in_brevete_num: "",
    in_telefono: "",
    in_email: "",
    in_observaciones: "",
  });

  const { mutate, isPending, error, reset } = useCrearConductor();

  if (!isOpen) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(formData, {
      onSuccess: () => {
        setFormData({
          in_name: "",
          in_apellido: "",
          in_dni: "",
          in_type_brevete: "",
          in_brevete_num: "",
          in_telefono: "",
          in_email: "",
          in_observaciones: "",
        });
        onClose();
      },
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  interface ErrorDetalle {
  campo: string;
  mensaje: string;
    }

interface ErrorResponse {
  error: string;
  detalles?: ErrorDetalle[];
    }   

// dentro del componente, antes del return:
const mensajeError = isAxiosError<ErrorResponse>(error)
  ? error.response?.data.detalles?.map((d) => d.mensaje).join(", ") || error.response?.data.error
  : error
  ? "Error al crear conductor"
  : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo conductor</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
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
              name="in_dni"
              value={formData.in_dni}
              onChange={handleChange}
              required
              maxLength={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de licencia</label>
              <input
                name="in_type_brevete"
                value={formData.in_type_brevete}
                onChange={handleChange}
                placeholder="Ej. A-IIIb"
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
              {isPending ? "Guardando..." : "Guardar conductor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}