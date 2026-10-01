import { Pill, formatearFecha } from "./AlmacenUI";
import type { MovimientoAlmacen } from "./almacen.api";

export function VerMovimientoModal({ movimiento, onClose }: { movimiento: MovimientoAlmacen; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Detalle del movimiento</h2>
            <p className="mt-1 text-sm text-slate-500">#{movimiento.id_movimiento}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-6">
          <Campo label="Tipo">
            <Pill tone={movimiento.tipo === "Ingreso" ? "green" : "blue"}>{movimiento.tipo}</Pill>
          </Campo>
          <Campo label="Motivo">{movimiento.motivo}</Campo>
          <Campo label="Cliente">{movimiento.clientes.razon_social}</Campo>
          <Campo label="Producto">{movimiento.productos?.nombre ?? "—"}</Campo>
          <Campo label="Modo">{movimiento.modo}</Campo>
          <Campo label="División">{movimiento.divisiones.nombre}</Campo>
          <Campo label="N° de contenedor">{movimiento.num_contenedor ?? "—"}</Campo>
          <Campo label="N° Declaración / Traspaso">{movimiento.num_declaracion ?? "—"}</Campo>
          <Campo label="Cantidad">
            {movimiento.cantidad} {movimiento.unidad_medida}
          </Campo>
          <Campo label="Pallets (ocupados/liberados)">
            {movimiento.pallets_impacto !== undefined
              ? movimiento.pallets_impacto > 0
                ? `+${movimiento.pallets_impacto}`
                : movimiento.pallets_impacto
              : "—"}
          </Campo>
          <Campo label={movimiento.tipo === "Ingreso" ? "Bultos por pallet" : "Bultos retirados"}>
            {movimiento.detalle_bultos_pallets.length > 0
              ? `${movimiento.detalle_bultos_pallets.join(" + ")}${movimiento.unidad_bultos ? " " + movimiento.unidad_bultos : ""} (distinto por pallet)`
              : movimiento.cantidad_bultos != null
                ? `${movimiento.cantidad_bultos}${movimiento.unidad_bultos ? " " + movimiento.unidad_bultos : ""}`
                : "—"}
          </Campo>
          {movimiento.tipo === "Salida" && (
            <Campo label="Tipo de retiro">
              {movimiento.cantidad_bultos && movimiento.cantidad_bultos > 0
                ? "Bultos sueltos (parcial)"
                : movimiento.libera_pallet
                  ? "Pallet completo"
                  : "No afecta ocupación"}
            </Campo>
          )}
          <Campo label="Fecha">{formatearFecha(movimiento.fecha)}</Campo>
          <div className="col-span-2">
            <Campo label="Observaciones">{movimiento.observaciones ?? "—"}</Campo>
          </div>
          <Campo label="Registrado por">
            {movimiento.registrado_por.nombre} {movimiento.registrado_por.apellido}
          </Campo>
          <Campo label="Aprobado por">
            {movimiento.aprobador ? `${movimiento.aprobador.nombre} ${movimiento.aprobador.apellido}` : "—"}
          </Campo>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{children}</span>
    </div>
  );
}
