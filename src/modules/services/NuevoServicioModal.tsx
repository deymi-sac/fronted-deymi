import axios from "axios";
import { useState } from "react";

import {
  crearServicioInterno,
  crearServicioTercero,
  enviarCorreoServicio,
  type CrearServicioInternoPayload,
  type CrearServicioTerceroPayload,
} from "./services.api";

import type { Unidad } from "../unidades/unidades.api";
import type { Conductor } from "../conductores/conductores.api";


interface NuevoServicioModalProps {
  abierto: boolean;
  unidades: Unidad[];
  conductores: Conductor[];
  onCerrar: () => void;
  onCreado: () => void;
}


export function NuevoServicioModal({
  abierto,
  unidades,
  conductores,
  onCerrar,
  onCreado,
}: NuevoServicioModalProps) {

  const [tipo, setTipo] = useState<"interno" | "tercero">(
    "interno",
  );

  const [referencia, setReferencia] = useState("");
  
  const [cliente, setCliente] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [idEstado, setIdEstado] = useState(1);

  const [fecha, setFecha] = useState("");


  const [idUnidad, setIdUnidad] = useState("");
  const [idConductor, setIdConductor] = useState("");

  const [correoNotificacion, setCorreoNotificacion] = useState("");
  // ==========================================================
  // DATOS TERCERO
  // ==========================================================

  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [nombreComercial, setNombreComercial] =
    useState("");
  const [homologado, setHomologado] = useState(false);

  const [nombreConductor, setNombreConductor] =
    useState("");
  const [apellidoConductor, setApellidoConductor] =
    useState("");
  const [dniConductor, setDniConductor] =
    useState("");
  const [brevete, setBrevete] = useState("");
  const [tipoBrevete, setTipoBrevete] =
    useState("");

  const [placa, setPlaca] = useState("");
  const [placaSecundaria, setPlacaSecundaria] =
    useState("");
  const [tipoVehiculo, setTipoVehiculo] =
    useState("");


  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] = useState("");


  if (!abierto) {
    return null;
  }


  // ==========================================================
  // SUBMIT
  // ==========================================================

  async function handleSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError("");


    if (!referencia.trim()) {
      setError(
        "La referencia es requerida.",
      );
      return;
    }



    try {
      setGuardando(true);


      // ======================================================
      // INTERNO
      // ======================================================

      if (tipo === "interno") {

        if (!idUnidad) {
          setError(
            "Selecciona una unidad.",
          );
          return;
        }

        if (!idConductor) {
          setError(
            "Selecciona un conductor.",
          );
          return;
        }


        const payload:
          CrearServicioInternoPayload = {
          tipo: "interno",
          referencia: referencia.trim(),
          fecha: fecha || undefined,
          cliente:
            cliente.trim() || undefined,
          observaciones:
            observaciones.trim() ||
            undefined,
          id_estado: idEstado,
          id_unidad: Number(idUnidad),
          in_id_conductor:
            Number(idConductor),
        };


        const servicioCreado = await crearServicioInterno(payload);

            if (correoNotificacion.trim()) {
              await enviarCorreoServicio(servicioCreado.id_service, correoNotificacion.trim());
            }
      }


      // ======================================================
      // TERCERO
      // ======================================================

      else {

        if (!razonSocial.trim()) {
          setError(
            "La razón social es requerida.",
          );
          return;
        }

        if (!ruc.trim()) {
          setError(
            "El RUC es requerido.",
          );
          return;
        }

        if (ruc.length !== 11) {
          setError(
            "El RUC debe tener 11 dígitos.",
          );
          return;
        }

        if (!nombreConductor.trim()) {
          setError(
            "El nombre del conductor es requerido.",
          );
          return;
        }

        if (!apellidoConductor.trim()) {
          setError(
            "El apellido del conductor es requerido.",
          );
          return;
        }

        if (!dniConductor.trim()) {
          setError(
            "El DNI del conductor es requerido.",
          );
          return;
        }

        if (!placa.trim()) {
          setError(
            "La placa es requerida.",
          );
          return;
        }

        if (!tipoVehiculo.trim()) {
          setError(
            "El tipo de vehículo es requerido.",
          );
          return;
        }


        const payload:
          CrearServicioTerceroPayload = {

          tipo: "tercero",

          referencia:
            referencia.trim(),


          cliente:
            cliente.trim() || undefined,

          fecha: fecha || undefined,

          observaciones:
            observaciones.trim() ||
            undefined,

          id_estado: idEstado,

          transportista: {
            razon_social: razonSocial.trim(),
            ruc: ruc.trim(),
            nombre_comercial:
                nombreComercial.trim() || undefined,
            status_homologacion: homologado,
            },
          conductor: {
            nombre:
              nombreConductor.trim(),

            apellido:
              apellidoConductor.trim(),

            dni:
              dniConductor.trim(),

            brevete_num:
              brevete.trim() ||
              undefined,

            type_brevete:
              tipoBrevete.trim() ||
              undefined,
          },

          unidad: {
            placa:
              placa.trim(),

            placa_secundaria:
              placaSecundaria.trim() ||
              undefined,

            tipo_vehiculo:
              tipoVehiculo.trim(),
          },
        };


        const servicioCreado = await crearServicioTercero(payload);

            if (correoNotificacion.trim()) {
              await enviarCorreoServicio(servicioCreado.id_service, correoNotificacion.trim());
            }

      }


      onCreado();

    } catch (error: unknown) {
    console.error("Error creando servicio:", error);

    if (axios.isAxiosError(error)) {
        const mensaje = error.response?.data?.error;

        setError(
        typeof mensaje === "string"
            ? mensaje
            : "No se pudo crear el servicio.",
        );
    } else {
        setError("No se pudo crear el servicio.");
    }
    

    } finally {
      setGuardando(false);
    }
  }


  // ==========================================================
  // INPUT
  // ==========================================================

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Nuevo servicio
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registra un nuevo servicio
              de transporte.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>

        </div>


        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >

          {/* TIPO */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Tipo de servicio
            </label>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setTipo("interno")
                }
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  tipo === "interno"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Unidad propia
              </button>

              <button
                type="button"
                onClick={() =>
                  setTipo("tercero")
                }
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  tipo === "tercero"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Transportista tercero
              </button>

            </div>
          </div>


          {/* DATOS GENERALES */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Referencia *
              </label>

              <input
                value={referencia}
                onChange={(e) =>
                  setReferencia(e.target.value)
                }
                className={inputClass}
                placeholder="BL MAEU261201655"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Cliente
              </label>

              <input
                value={cliente}
                onChange={(e) =>
                  setCliente(e.target.value)
                }
                className={inputClass}
                placeholder="Nombre del cliente"
              />
            </div>

                        <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Fecha (opcional — si la dejas vacía, se usa la fecha y hora actuales)
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </div>


            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Estado
              </label>

              <select
                value={idEstado}
                onChange={(e) =>
                  setIdEstado(
                    Number(e.target.value),
                  )
                }
                className={inputClass}
              >
                <option value={1}>
                  Pendiente
                </option>

                <option value={2}>
                  En proceso
                </option>

                <option value={3}>
                  Completado
                </option>

                <option value={4}>
                  Cancelado
                </option>
              </select>

            </div>

          </div>


          {/* ==================================================
              INTERNO
          ================================================== */}

          {tipo === "interno" && (

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

              <h3 className="mb-4 text-sm font-bold text-slate-900">
                Asignación propia
              </h3>


              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Unidad *
                  </label>

                  <select
                    value={idUnidad}
                    onChange={(e) =>
                      setIdUnidad(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                  >

                    <option value="">
                      Seleccionar unidad
                    </option>

                    {unidades.map(
                      (unidad) => (
                        <option
                          key={
                            unidad.id_unidad
                          }
                          value={
                            unidad.id_unidad
                          }
                        >
                          {unidad.uni_placa}
                          {unidad.uni_placa_secundaria
                            ? ` / ${unidad.uni_placa_secundaria}`
                            : ""}
                        </option>
                      ),
                    )}

                  </select>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Conductor *
                  </label>

                  <select
                    value={idConductor}
                    onChange={(e) =>
                      setIdConductor(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                  >

                    <option value="">
                      Seleccionar conductor
                    </option>

                    {conductores.map(
                      (conductor) => (
                        <option
                          key={
                            conductor.in_id_conductor
                          }
                          value={
                            conductor.in_id_conductor
                          }
                        >
                          {
                            conductor.in_name
                          }{" "}
                          {
                            conductor.in_apellido
                          }
                          {conductor.in_brevete_num
                            ? ` — ${conductor.in_brevete_num}`
                            : ""}
                        </option>
                      ),
                    )}

                  </select>
                </div>

              </div>

            </div>
          )}


          {/* ==================================================
              TERCERO
          ================================================== */}

          {tipo === "tercero" && (

            <div className="space-y-5">

              {/* TRANSPORTISTA */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                <h3 className="mb-4 text-sm font-bold text-slate-900">
                  Empresa transportista
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <input
                    value={razonSocial}
                    onChange={(e) =>
                      setRazonSocial(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Razón social *"
                  />

                  <input
                    value={ruc}
                    onChange={(e) =>
                      setRuc(
                        e.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      )
                    }
                    maxLength={11}
                    className={inputClass}
                    placeholder="RUC *"
                  />

                  <input
                    value={nombreComercial}
                    onChange={(e) =>
                      setNombreComercial(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Nombre comercial"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        ¿Transportista homologado?
                    </label>

                    <select
                        value={homologado ? "si" : "no"}
                        onChange={(e) =>
                        setHomologado(e.target.value === "si")
                        }
                        className={inputClass}
                    >
                        <option value="no">No</option>
                        <option value="si">Sí</option>
                    </select>
                    </div>

                </div>

              </div>


              {/* CONDUCTOR TERCERO */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                <h3 className="mb-4 text-sm font-bold text-slate-900">
                  Conductor tercero
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <input
                    value={nombreConductor}
                    onChange={(e) =>
                      setNombreConductor(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Nombre *"
                  />

                  <input
                    value={apellidoConductor}
                    onChange={(e) =>
                      setApellidoConductor(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Apellido *"
                  />

                  <input
                    value={dniConductor}
                    onChange={(e) =>
                      setDniConductor(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="DNI *"
                  />

                  <input
                    value={brevete}
                    onChange={(e) =>
                      setBrevete(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="N° brevete"
                  />

                  <input
                    value={tipoBrevete}
                    onChange={(e) =>
                      setTipoBrevete(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Tipo de brevete"
                  />

                </div>

              </div>


              {/* UNIDAD TERCERO */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                <h3 className="mb-4 text-sm font-bold text-slate-900">
                  Unidad de tercero
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <input
                    value={placa}
                    onChange={(e) =>
                      setPlaca(
                        e.target.value.toUpperCase(),
                      )
                    }
                    className={inputClass}
                    placeholder="Placa *"
                  />

                  <input
                    value={placaSecundaria}
                    onChange={(e) =>
                      setPlacaSecundaria(
                        e.target.value.toUpperCase(),
                      )
                    }
                    className={inputClass}
                    placeholder="Placa secundaria"
                  />

                  <input
                    value={tipoVehiculo}
                    onChange={(e) =>
                      setTipoVehiculo(
                        e.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Tipo de vehículo *"
                  />

                </div>

              </div>

            </div>
          )}


          {/* OBSERVACIONES */}

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Observaciones
            </label>

            <textarea
              value={observaciones}
              onChange={(e) =>
                setObservaciones(
                  e.target.value,
                )
              }
              rows={3}
              className={inputClass}
              placeholder="Observaciones del servicio..."
            />

          </div>


          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Notificar por correo
          </label>
          <input
            type="email"
            value={correoNotificacion}
            onChange={(e) => setCorreoNotificacion(e.target.value)}
            className={inputClass}
            placeholder="correo@ejemplo.com (opcional)"
          />
        </div>
          {/* FOOTER */}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : "Crear servicio"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}