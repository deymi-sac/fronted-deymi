import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listarConductoresDeTransportista } from "../transportistas/transportistas.api";
import { mensajeDeError } from "../../lib/useEnviar";
import { asignarConductorTercero, type Servicio } from "./services.api";

const campo =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

/**
 * Registra o cambia el conductor de un servicio de transportista tercero ya creado
 * (la empresa suele confirmar el conductor a último momento). Se puede elegir uno ya
 * registrado de la misma empresa o registrar uno nuevo.
 */
export function AsignarConductorTerceroModal({
  servicio,
  onClose,
  onGuardado,
}: {
  servicio: Servicio;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const actual = servicio.unidades_terceros?.conductores_terceros ?? null;
  const idTransportista = actual?.id_transportista;

  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [idConductor, setIdConductor] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [brevete, setBrevete] = useState("");
  const [tipoBrevete, setTipoBrevete] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const conductores = useQuery({
    queryKey: ["transportistas", "conductores", idTransportista],
    queryFn: () => listarConductoresDeTransportista(idTransportista as number),
    enabled: idTransportista !== undefined,
  });

  const guardar = useMutation({
    mutationFn: () =>
      asignarConductorTercero(
        servicio.id_service,
        modo === "existente"
          ? { in_id_conductor: Number(idConductor) }
          : {
              conductor: {
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                dni: dni.trim(),
                ...(brevete.trim() ? { brevete_num: brevete.trim() } : {}),
                ...(tipoBrevete.trim() ? { type_brevete: tipoBrevete.trim() } : {}),
              },
            },
      ),
    onSuccess: onGuardado,
    onError: (e) => setAviso(mensajeDeError(e)),
  });

  function confirmar() {
    if (modo === "existente" && !idConductor) return setAviso("Elige un conductor.");
    if (modo === "nuevo" && (!nombre.trim() || !apellido.trim() || !dni.trim())) {
      return setAviso("Nombre, apellido y DNI del conductor son obligatorios.");
    }
    setAviso(null);
    guardar.mutate();
  }

  // El que ya está asignado no se ofrece de nuevo
  const opciones = (conductores.data ?? []).filter((c) => c.in_id_conductor !== actual?.in_id_conductor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm font-medium text-slate-500">Servicio con transportista tercero</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Asignar o cambiar conductor</h2>
        <p className="mt-2 text-sm text-slate-500">
          Servicio <span className="font-semibold text-slate-700">{servicio.referencia}</span>
          {actual && (
            <>
              {" "}· conductor actual:{" "}
              <span className="font-semibold text-slate-700">
                {actual.in_name} {actual.in_apellido}
              </span>
            </>
          )}
        </p>

        {aviso && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{aviso}</p>}

        <div className="mt-5 flex gap-2 text-sm">
          {(["existente", "nuevo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`rounded-full border px-4 py-1.5 font-semibold ${
                modo === m ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m === "existente" ? "Ya registrado" : "Registrar nuevo"}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {modo === "existente" ? (
            <select value={idConductor} onChange={(e) => setIdConductor(e.target.value)} className={campo}>
              <option value="">
                {conductores.isLoading ? "Cargando conductores..." : "Selecciona un conductor de la empresa"}
              </option>
              {opciones.map((c) => (
                <option key={c.in_id_conductor} value={c.in_id_conductor}>
                  {c.in_name} {c.in_apellido} — DNI {c.in_dni}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombres" className={campo} />
                <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellidos" className={campo} />
              </div>
              <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI" className={campo} />
              <div className="grid grid-cols-2 gap-3">
                <input value={brevete} onChange={(e) => setBrevete(e.target.value)} placeholder="N° brevete" className={campo} />
                <input value={tipoBrevete} onChange={(e) => setTipoBrevete(e.target.value)} placeholder="Tipo de brevete" className={campo} />
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          La unidad del servicio se mantiene (misma placa); solo cambia el conductor.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={guardar.isPending}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={guardar.isPending}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {guardar.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
