import { XCircle, Package } from "lucide-react";
import { useClientesAlmacen } from "./useAlmacen";

export default function AlmacenProductosPage() {
  const { data: clientes, isLoading, isError, refetch } = useClientesAlmacen(false);

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <p className="text-sm text-slate-500">Cargando productos...</p>
      </div>
    );
  }

  if (isError || !clientes) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3">
        <XCircle size={32} className="text-red-500" />
        <p className="text-sm text-slate-600">No se pudieron cargar los productos.</p>
        <button type="button" onClick={() => refetch()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Productos por cliente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Catálogo reportado por almacén. Se agregan productos nuevos desde la edición de cada cliente.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {clientes.map((cliente, i) => (
          <div key={cliente.id_cliente_almacen} className={`p-5 ${i > 0 ? "border-t border-slate-100" : ""}`}>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">{cliente.razon_social}</h2>
            {cliente.productos.length === 0 ? (
              <p className="flex items-center gap-2 text-sm italic text-slate-400">
                <Package size={14} /> Sin productos registrados aún.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {cliente.productos.map((p) => (
                  <li key={p.id_producto} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-700">{p.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
