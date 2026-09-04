import { useState } from "react";
import { isAxiosError } from "axios";
import { useTiposDocumento, useCrearDocumentoConductor, useCrearDocumentoUnidad } from "./useDocumentos";
import { useConductores } from "../conductores/useConductores";
import { useUnidades } from "../unidades/useUnidades";
import { subirArchivo } from "./documentos.api";
import { Upload } from "lucide-react";

interface CrearDocumentoModalProps {
  isOpen: boolean;
  tipo: "conductor" | "unidad";
  onClose: () => void;
}

export function CrearDocumentoModal({ isOpen, tipo, onClose }: CrearDocumentoModalProps) {
  const [formData, setFormData] = useState({
    entidad_id: "",
    id_tipo_documento: "",
    fecha_vencimiento: "",
    dias_anticipacion: "",
    observaciones: "",
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");

  const { data: tipos } = useTiposDocumento();
  const { data: conductores } = useConductores({ page: 1, limit: 1000 });
  const { data: unidades } = useUnidades({ page: 1, limit: 1000 });

  const crearConductor = useCrearDocumentoConductor();
  const crearUnidad = useCrearDocumentoUnidad();

  const mutation = tipo === "conductor" ? crearConductor : crearUnidad;

  if (!isOpen) return null;

  const tiposFiltrados = tipos?.filter((t) =>
    tipo === "conductor" ? t.aplica_a === "Conductor" : t.aplica_a === "Unidad"
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleArchivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setErrorArchivo("");

    if (!file) {
      setArchivo(null);
      return;
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!tiposPermitidos.includes(file.type)) {
      setErrorArchivo("Solo se permiten imágenes (JPG, PNG, WEBP) o archivos PDF");
      setArchivo(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorArchivo("El archivo no debe superar los 10 MB");
      setArchivo(null);
      return;
    }

    setArchivo(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let archivoUrl: string | undefined;

    if (archivo) {
      try {
        setSubiendoArchivo(true);
        const resultado = await subirArchivo(archivo);
        archivoUrl = resultado.url;
      } catch {
        setErrorArchivo("Error al subir el archivo. Intenta de nuevo.");
        setSubiendoArchivo(false);
        return;
      }
      setSubiendoArchivo(false);
    }

    const base = {
      id_tipo_documento: Number(formData.id_tipo_documento),
      fecha_vencimiento: formData.fecha_vencimiento,
      dias_anticipacion: formData.dias_anticipacion ? Number(formData.dias_anticipacion) : undefined,
      observaciones: formData.observaciones || undefined,
      archivo_url: archivoUrl,
    };

    if (tipo === "conductor") {
      crearConductor.mutate(
        { ...base, in_id_conductor: Number(formData.entidad_id) },
        { onSuccess: () => { limpiar(); onClose(); } }
      );
    } else {
      crearUnidad.mutate(
        { ...base, id_unidad: Number(formData.entidad_id) },
        { onSuccess: () => { limpiar(); onClose(); } }
      );
    }
  }

  function limpiar() {
    setFormData({ entidad_id: "", id_tipo_documento: "", fecha_vencimiento: "", dias_anticipacion: "", observaciones: "" });
    setArchivo(null);
  }

  function handleClose() {
    mutation.reset();
    limpiar();
    onClose();
  }

  const mensajeError = isAxiosError(mutation.error)
    ? mutation.error.response?.data?.error
    : mutation.error
    ? "Error al crear documento"
    : null;

  const procesando = mutation.isPending || subiendoArchivo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Nuevo documento de {tipo === "conductor" ? "conductor" : "unidad"}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {tipo === "conductor" ? "Conductor" : "Unidad"}
            </label>
            <select
              name="entidad_id"
              value={formData.entidad_id}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona {tipo === "conductor" ? "un conductor" : "una unidad"}</option>
              {tipo === "conductor"
                ? conductores?.data.map((c) => (
                    <option key={c.in_id_conductor} value={c.in_id_conductor}>
                      {c.in_name} {c.in_apellido}
                    </option>
                  ))
                : unidades?.data.map((u) => (
                    <option key={u.id_unidad} value={u.id_unidad}>
                      {u.uni_placa}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de documento</label>
            <select
              name="id_tipo_documento"
              value={formData.id_tipo_documento}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un tipo</option>
              {tiposFiltrados?.map((t) => (
                <option key={t.id_tipo_documento} value={t.id_tipo_documento}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de vencimiento</label>
              <input
                type="date"
                name="fecha_vencimiento"
                value={formData.fecha_vencimiento}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Días de anticipación</label>
              <input
                type="number"
                name="dias_anticipacion"
                value={formData.dias_anticipacion}
                onChange={handleChange}
                placeholder="30 (por defecto)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Archivo (foto o PDF)</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 hover:border-gray-400">
              <Upload size={18} />
              {archivo ? archivo.name : "Selecciona un archivo (opcional)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleArchivoChange}
                className="hidden"
              />
            </label>
            {errorArchivo && <p className="mt-1 text-xs text-red-500">{errorArchivo}</p>}
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
              disabled={procesando}
              className="rounded-md bg-[#18193B] px-4 py-2 text-sm font-medium text-white hover:bg-[#18193B]/90 disabled:opacity-50"
            >
              {subiendoArchivo ? "Subiendo archivo..." : mutation.isPending ? "Guardando..." : "Guardar documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}