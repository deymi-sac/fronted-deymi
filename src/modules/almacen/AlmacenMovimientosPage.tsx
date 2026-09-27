import { useState } from "react";
import { Plus, XCircle, ClipboardList } from "lucide-react";
import { useMovimientos, useClientesAlmacen, useDivisiones } from "./useAlmacen";
import { RegistrarMovimientoModal } from "./RegistrarMovimientoModal";
import { Pill, formatearFecha, inputClassGenerico } from "./AlmacenUI";
import { getCurrentUser, puedeOperarAlmacen } from "../auth/auth.utils";

export default function AlmacenMovimientosPage() {
  const puedeOperar = puedeOperarAlmacen(getCurrentUser());
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cliente, setCliente] = useState<number | "">("");
  const [division, setDivision] = useState<number | "">("");
  const [tipo, setTipo] = useState<string>("");

  const { data: clientes } = useClientesAlmacen(false);
  const { data: divisiones } = useDivisiones();
  const {
    data: movimientos,
    isLoading,
    isError,
    refetch,
  } = useMovimientos({
    cliente: cliente === "" ? undefined : cliente,
    division: division === "" ? undefined : division,
    tipo: tipo || undefined,
  });

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Movimientos</h1>
          <p className="mt-1 text-sm text-slate-500">Historial de ingresos y salidas de mercadería.</p>
        </div>
        {puedeOperar && (
          <button
            type="button"
            onClick={() => setMostrarModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#18193B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242550]"
          >
            <Plus size={16} /> Registrar movimiento
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <select value={cliente} onChange={(e) => setCliente(e.target.value ? Number(e.target.value) : "")} className={inputClassGenerico}>
          <option value="">Todos los clientes</option>
          {clientes?.map((c) => (
            <option key={c.id_cliente_almacen} value={c.id_cliente_almacen}>
              {c.razon_social}
            </option>
          ))}
        </select>
        <select value={division} onChange={(e) => setDivision(e.target.value ? Number(e.target.value) : "")} className={inputClassGenerico}>
          <option value="">Todas las divisiones</option>
          {divisiones?.map((d) => (
            <option key={d.id_division} value={d.id_division}>
              {d.nombre}
            </option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClassGenerico}>
          <option value="">Ingreso y salida</option>
          <option value="Ingreso">Solo ingresos</option>
          <option value="Salida">Solo salidas</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <p className="text-sm text-slate-500">Cargando movimientos...</p>
          </div>
        ) : isError || !movimientos ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3">
            <XCircle size={32} className="text-red-500" />
            <p className="text-sm text-slate-600">No se pudieron cargar los movimientos.</p>
            <button type="button" onClick={() => refetch()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
              Reintentar
            </button>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-2">
            <ClipboardList size={36} className="text-slate-300" />
            <p className="font-medium text-slate-600">No hay movimientos registrados</p>
            <p className="text-sm text-slate-400">Registra el primer ingreso o salida con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cant.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Declaración</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">División</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id_movimiento} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm text-slate-600">{formatearFecha(m.fecha)}</td>
                    <td className="px-4 py-3.5">
                      <Pill tone={m.tipo === "Ingreso" ? "green" : "blue"}>{m.tipo}</Pill>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700">{m.clientes.razon_social}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.productos?.nombre ?? "—"}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {m.cantidad} {m.unidad_medida}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.num_declaracion ?? "—"}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.divisiones.nombre}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {m.registrado_por.nombre} {m.registrado_por.apellido}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarModal && <RegistrarMovimientoModal onClose={() => setMostrarModal(false)} />}
    </div>
  );
}
