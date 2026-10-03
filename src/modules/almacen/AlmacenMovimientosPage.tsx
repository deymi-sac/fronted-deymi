import { useState } from "react";
import { isAxiosError } from "axios";
import { Plus, XCircle, ClipboardList, Eye, Pencil, Trash2, FileDown, Boxes, Package } from "lucide-react";
import { useMovimientos, useClientesAlmacen, useDivisiones, useEliminarMovimiento } from "./useAlmacen";
import { RegistrarMovimientoModal } from "./RegistrarMovimientoModal";
import { VerMovimientoModal } from "./VerMovimientoModal";
import { Pill, KpiCard } from "./AlmacenUI";
import { formatearFecha, inputClassGenerico, descargarBlob, totalBultosMovimiento } from "./almacen.utils";
import { exportarKardex } from "./almacen.api";
import { getCurrentUser, puedeOperarAlmacen } from "../auth/auth.utils";
import type { MovimientoAlmacen } from "./almacen.api";

const POR_PAGINA = 15;

export default function AlmacenMovimientosPage() {
  const puedeOperar = puedeOperarAlmacen(getCurrentUser());
  const [mostrarModal, setMostrarModal] = useState(false);
  const [movimientoVer, setMovimientoVer] = useState<MovimientoAlmacen | null>(null);
  const [movimientoEditar, setMovimientoEditar] = useState<MovimientoAlmacen | null>(null);
  const [exportando, setExportando] = useState(false);
  const eliminarMovimiento = useEliminarMovimiento();
  const [cliente, setCliente] = useState<number | "">("");
  const [division, setDivision] = useState<number | "">("");
  const [tipo, setTipo] = useState<string>("");
  // La página se reinicia sola al cambiar un filtro: se guarda junto a los filtros con los que se eligió.
  const claveFiltros = `${cliente}|${division}|${tipo}`;
  const [paginaElegida, setPaginaElegida] = useState({ clave: "", pagina: 1 });
  const pagina = paginaElegida.clave === claveFiltros ? paginaElegida.pagina : 1;
  const setPagina = (n: number) => setPaginaElegida({ clave: claveFiltros, pagina: n });

  async function handleExportarKardex() {
    setExportando(true);
    try {
      const blob = await exportarKardex();
      descargarBlob(blob, "kardex-almacen.xlsx");
    } catch {
      alert("No se pudo generar el Kardex en Excel.");
    } finally {
      setExportando(false);
    }
  }

  function handleEliminar(m: MovimientoAlmacen) {
    const confirmar = window.confirm(
      `¿Eliminar este movimiento de ${m.tipo.toLowerCase()} de ${m.clientes.razon_social} (${m.cantidad} ${m.unidad_medida})? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;
    eliminarMovimiento.mutate(m.id_movimiento, {
      onError: (err) => {
        alert(isAxiosError(err) ? err.response?.data?.error ?? "No se pudo eliminar el movimiento" : "No se pudo eliminar el movimiento");
      },
    });
  }

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

  const clienteSeleccionado = cliente === "" ? null : clientes?.find((c) => c.id_cliente_almacen === cliente) ?? null;

  const totalPaginas = Math.max(1, Math.ceil((movimientos?.length ?? 0) / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const movimientosPagina = (movimientos ?? []).slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Movimientos</h1>
          <p className="mt-1 text-sm text-slate-500">Historial de ingresos y salidas de mercadería.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportarKardex}
            disabled={exportando}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown size={16} /> {exportando ? "Generando..." : "Exportar Kardex"}
          </button>
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

      {clienteSeleccionado && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard icon={<Boxes size={20} />} title="Stock real" value={clienteSeleccionado.stock_real ?? 0} description={clienteSeleccionado.razon_social} />
          <KpiCard icon={<Package size={20} />} title="Pallets" value={clienteSeleccionado.stock_actual ?? 0} description="Pallets en almacén" />
          {Object.entries(clienteSeleccionado.unidades ?? {}).map(([unidad, cantidad]) => (
            <KpiCard key={unidad} icon={<Package size={20} />} title={unidad} value={cantidad} description={`${unidad.toLowerCase()} en almacén`} />
          ))}
        </div>
      )}

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
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Pallets</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bultos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Declaración</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">División</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Registrado por</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientosPagina.map((m) => (
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
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums text-slate-600">
                      {m.pallets_impacto !== undefined ? (m.pallets_impacto > 0 ? `+${m.pallets_impacto}` : m.pallets_impacto) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {(() => {
                        const bultos = totalBultosMovimiento(m);
                        if (!bultos) return "—";
                        return `${bultos.total}${bultos.unidad ? " " + bultos.unidad : ""} bultos`;
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.num_declaracion ?? "—"}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.divisiones.nombre}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {m.registrado_por.nombre} {m.registrado_por.apellido}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Ver detalle"
                          onClick={() => setMovimientoVer(m)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Eye size={16} />
                        </button>
                        {puedeOperar && (
                          <>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => setMovimientoEditar(m)}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              title="Eliminar"
                              onClick={() => handleEliminar(m)}
                              disabled={eliminarMovimiento.isPending}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <span className="text-xs text-slate-500">
                  {(paginaActual - 1) * POR_PAGINA + 1}–{Math.min(paginaActual * POR_PAGINA, movimientos.length)} de {movimientos.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPagina(paginaActual - 1)}
                    disabled={paginaActual === 1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="px-2 text-xs text-slate-500">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {mostrarModal && <RegistrarMovimientoModal onClose={() => setMostrarModal(false)} />}
      {movimientoVer && <VerMovimientoModal movimiento={movimientoVer} onClose={() => setMovimientoVer(null)} />}
      {movimientoEditar && (
        <RegistrarMovimientoModal
          key={movimientoEditar.id_movimiento}
          movimientoEditar={movimientoEditar}
          onClose={() => setMovimientoEditar(null)}
        />
      )}
    </div>
  );
}
