import { useState } from "react";
import { isAxiosError } from "axios";
import { useActualizarUsuario } from "./UseUsuarios";
import type { Usuario } from "./usuarios.api";

interface EditarUsuarioModalProps {
  usuario: Usuario;
  onClose: () => void;
}

export function EditarUsuarioModal({ usuario, onClose }: EditarUsuarioModalProps) {
  const [formData, setFormData] = useState({
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  correo: usuario.correo,
  id_rol: usuario.roles.id_rol,
});

  const { mutate, isPending, error } = useActualizarUsuario();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "id_rol" ? Number(value) : value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ id: usuario.user_id, payload: formData }, { onSuccess: () => onClose() });
  }

  const mensajeError = isAxiosError(error)
    ? error.response?.data?.error
    : error
    ? "Error al actualizar usuario"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Editar usuario</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              placeholder="Nombres"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
              placeholder="Apellidos"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <input
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            required
            placeholder="Correo"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <select
            name="id_rol"
            value={formData.id_rol}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value={1}>Administrador</option>
            <option value={2}>Coordinador de transporte</option>
          </select>

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