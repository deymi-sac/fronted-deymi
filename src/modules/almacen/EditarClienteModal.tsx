import { useState } from "react";
import { isAxiosError } from "axios";
import { Plus, Trash2 } from "lucide-react";
import {
  useActualizarClienteAlmacen,
  useActualizarProductoAlmacen,
  useCrearProductoAlmacen,
  useEliminarProductoAlmacen,
  useProductosDeCliente,
} from "./useAlmacen";
import { inputClass } from "./CrearClienteModal";
import { UnidadSelect } from "./AlmacenUI";
import type { ClienteAlmacen } from "./almacen.api";

export function EditarClienteModal({ cliente, onClose }: { cliente: ClienteAlmacen; onClose: () => void }) {
  const actualizarCliente = useActualizarClienteAlmacen();
  const { data: productos } = useProductosDeCliente(cliente.id_cliente_almacen);
  const crearProducto = useCrearProductoAlmacen();
  const eliminarProducto = useEliminarProductoAlmacen();

  const [razonSocial, setRazonSocial] = useState(cliente.razon_social);
  const [ruc, setRuc] = useState(cliente.ruc ?? "");
  const [tarifa, setTarifa] = useState(cliente.tarifa_mensual_m2 ?? "");
  const [vencimiento, setVencimiento] = useState(cliente.fecha_vencimiento_contrato?.slice(0, 10) ?? "");
  const [observaciones, setObservaciones] = useState(cliente.observaciones ?? "");
  const [error, setError] = useState<string | null>(null);

  const [nuevoProducto, setNuevoProducto] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("Pallet");
  const [nuevaTarifa, setNuevaTarifa] = useState("");
  const [errorProducto, setErrorProducto] = useState<string | null>(null);
  const actualizarProducto = useActualizarProductoAlmacen();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    actualizarCliente.mutate(
      {
        id: cliente.id_cliente_almacen,
        payload: {
          razon_social: razonSocial.trim(),
          ruc: ruc.trim() || undefined,
          tarifa_mensual_m2: tarifa ? Number(tarifa) : undefined,
          fecha_vencimiento_contrato: vencimiento || undefined,
          observaciones: observaciones.trim() || undefined,
        },
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          setError(isAxiosError(err) ? err.response?.data?.error ?? "No se pudo actualizar el cliente" : "No se pudo actualizar el cliente");
        },
      }
    );
  }

  function handleAgregarProducto() {
    if (!nuevoProducto.trim()) return;
    setErrorProducto(null);
    crearProducto.mutate(
      {
        id_cliente_almacen: cliente.id_cliente_almacen,
        nombre: nuevoProducto.trim(),
        unidad_medida: nuevaUnidad.trim(),
        tarifa_diaria: nuevaUnidad !== "Pallet" && nuevaTarifa ? Number(nuevaTarifa) : null,
      },
      {
        onSuccess: () => {
          setNuevoProducto("");
          setNuevaTarifa("");
        },
        onError: (err) => {
          setErrorProducto(
            isAxiosError(err) ? err.response?.data?.error ?? "No se pudo agregar el producto" : "No se pudo agregar el producto"
          );
        },
      }
    );
  }

  function handleEliminarProducto(idProducto: number, nombre: string) {
    const confirmar = window.confirm(`¿Eliminar "${nombre}"? Si ya tiene movimientos registrados, se marcará como inactivo en vez de borrarse.`);
    if (!confirmar) return;
    setErrorProducto(null);
    eliminarProducto.mutate(idProducto, {
      onError: (err) => {
        setErrorProducto(
          isAxiosError(err) ? err.response?.data?.error ?? "No se pudo eliminar el producto" : "No se pudo eliminar el producto"
        );
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-800">Editar cliente</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <Campo label="Razón social *">
            <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="RUC">
            <input value={ruc} onChange={(e) => setRuc(e.target.value)} className={inputClass} />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Tarifa US$/m² mensual">
              <input type="number" step="0.01" min="0" value={tarifa} onChange={(e) => setTarifa(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="Vencimiento de contrato">
              <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className={inputClass} />
            </Campo>
          </div>
          <Campo label="Observaciones">
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={`${inputClass} h-20 resize-none`} />
          </Campo>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actualizarCliente.isPending}
              className="rounded-lg bg-[#18193B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#242550] disabled:opacity-50"
            >
              {actualizarCliente.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        <div className="border-t border-slate-200 p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Productos de {cliente.razon_social}</h3>
          <ul className="mb-3 flex flex-col gap-1.5">
            {(productos ?? []).map((p) => (
              <li key={p.id_producto} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span className="flex-1">{p.nombre}</span>
                <span className="text-xs text-slate-400">
                  {p.stock_actual ?? 0} {p.unidad_medida.toLowerCase()}
                </span>
                {p.unidad_medida !== "Pallet" && (
                  <TarifaProducto
                    key={`${p.id_producto}-${p.tarifa_diaria ?? ""}`}
                    inicial={p.tarifa_diaria ?? ""}
                    unidad={p.unidad_medida}
                    onGuardar={(valor) => actualizarProducto.mutate({ id: p.id_producto, payload: { tarifa_diaria: valor } })}
                  />
                )}
                <button
                  type="button"
                  title="Eliminar producto"
                  onClick={() => handleEliminarProducto(p.id_producto, p.nombre)}
                  disabled={eliminarProducto.isPending}
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {productos?.length === 0 && <p className="text-sm text-slate-400">Sin productos registrados aún.</p>}
          </ul>
          {errorProducto && <p className="mb-2 text-sm text-red-600">{errorProducto}</p>}
          <div className="flex flex-col gap-2">
            <input
              value={nuevoProducto}
              onChange={(e) => setNuevoProducto(e.target.value)}
              placeholder="Nombre del producto nuevo"
              className={`${inputClass} w-full`}
            />
            <div className="flex gap-2">
              <UnidadSelect value={nuevaUnidad} onChange={setNuevaUnidad} className={`${inputClass} flex-1`} />
              {nuevaUnidad !== "Pallet" && nuevaUnidad.trim() !== "" && (
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={nuevaTarifa}
                  onChange={(e) => setNuevaTarifa(e.target.value)}
                  placeholder={`US$/${nuevaUnidad.toLowerCase()}/día`}
                  className={`${inputClass} w-36`}
                />
              )}
              <button
                type="button"
                onClick={handleAgregarProducto}
                disabled={crearProducto.isPending || !nuevoProducto.trim()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus size={15} /> Agregar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tarifa diaria por unidad (US$) de un producto que no se cobra por pallet; se guarda al salir del campo.
function TarifaProducto({
  inicial,
  unidad,
  onGuardar,
}: {
  inicial: string;
  unidad: string;
  onGuardar: (valor: number | null) => void;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <input
      type="number"
      min="0"
      step="0.0001"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        const nuevo = valor === "" ? null : Number(valor);
        if (nuevo !== (inicial === "" ? null : Number(inicial))) onGuardar(nuevo);
      }}
      placeholder={`US$/${unidad.toLowerCase()}/día`}
      title={`Tarifa diaria por ${unidad.toLowerCase()} (US$)`}
      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-xs outline-none focus:border-slate-500"
    />
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
