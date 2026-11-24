import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Save, Trash2 } from "lucide-react";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { Paginado } from "../../components/ui/Paginado";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { mensajeDeError, useEnviar } from "../../lib/useEnviar";
import {
  crearRol, eliminarRol, guardarPermisosRol, renombrarRol, useCatalogoPermisos, useRoles,
  type ModuloPermisos, type Rol,
} from "./administracion.api";

/** Roles y permisos: qué puede hacer cada rol. Lo que se guarda vale de inmediato en el servidor. */
export default function RolesPage() {
  const { data: roles, isLoading, error } = useRoles();
  const { data: catalogo } = useCatalogoPermisos();
  const [elegido, setElegido] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const rol = roles?.find((r) => r.id === elegido) ?? roles?.[0];

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <Aviso tono="error" titulo="No se pudieron cargar los roles">
          {mensajeDeError(error)}
        </Aviso>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Roles y permisos</h1>
          <p className="mt-1 text-sm text-slate-500">Qué puede hacer cada rol. Los cambios valen de inmediato en el servidor</p>
        </div>
        <button type="button" onClick={() => setCreando(true)} className={btnPrimario}>
          <Plus size={16} /> Nuevo rol
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Tarjeta titulo="Roles" sinPadding className="h-fit">
          {isLoading && <p className="p-4 text-sm text-slate-400">Cargando…</p>}
          <Paginado items={roles}>
            {(pagina) => (
              <nav className="p-2">
                {pagina.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setElegido(r.id)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${rol?.id === r.id ? "bg-slate-100 font-medium text-slate-800" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      {r.nombre}
                      {r.base && <Lock size={12} className="shrink-0 text-slate-300" aria-label="Rol del sistema" />}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {r.fijo ? "Todos los permisos" : `${r.permisos.length} ${r.permisos.length === 1 ? "permiso" : "permisos"}`} · {r.usuarios} usuario(s)
                    </span>
                  </button>
                ))}
              </nav>
            )}
          </Paginado>
        </Tarjeta>
        <div className="lg:col-span-3">{rol && catalogo && <EditorRol key={rol.id} rol={rol} catalogo={catalogo} onEliminado={() => setElegido(null)} />}</div>
      </div>

      {creando && (
        <CrearRolModal
          onCerrar={() => setCreando(false)}
          onCreado={(id) => {
            setCreando(false);
            setElegido(id);
          }}
        />
      )}
    </div>
  );
}

function EditorRol({ rol, catalogo, onEliminado }: { rol: Rol; catalogo: ModuloPermisos[]; onEliminado: () => void }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(rol.nombre);
  const [permisos, setPermisos] = useState<string[]>(rol.permisos);
  const [confirmaEliminar, setConfirmaEliminar] = useState(false);
  const cambiado = !rol.fijo && [...permisos].sort().join() !== [...rol.permisos].sort().join();
  const marcar = (nombres: string[], si: boolean) => setPermisos((ps) => (si ? [...new Set([...ps, ...nombres])] : ps.filter((p) => !nombres.includes(p))));
  const refrescar = () => {
    for (const clave of ["roles", "auditoria", "usuarios"]) qc.invalidateQueries({ queryKey: [clave] });
  };

  const guardarDatos = useMutation({ mutationFn: () => renombrarRol(rol.id, nombre.trim()), meta: { exito: "Rol renombrado" }, onSuccess: refrescar });
  const guardar = useMutation({ mutationFn: () => guardarPermisosRol(rol.id, permisos), meta: { exito: "Permisos guardados" }, onSuccess: refrescar });
  const eliminar = useMutation({
    mutationFn: () => eliminarRol(rol.id),
    meta: { exito: "Rol eliminado" },
    onSuccess: () => {
      setConfirmaEliminar(false);
      onEliminado();
      refrescar();
    },
  });

  return (
    <div className="space-y-6">
      <Tarjeta
        titulo={
          <span className="flex items-center gap-2">
            {rol.nombre}
            {rol.base && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Del sistema</span>}
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre" ayuda={rol.base ? "Los roles del sistema no se renombran" : undefined}>
            <input value={nombre} maxLength={100} disabled={rol.base} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
          </Campo>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {!rol.base && (
            <>
              <button type="button" onClick={() => guardarDatos.mutate()} disabled={nombre.trim() === rol.nombre || nombre.trim().length < 3 || guardarDatos.isPending} className={btnSecundario}>
                <Save size={16} /> Guardar datos
              </button>
              <button type="button" onClick={() => setConfirmaEliminar(true)} className={btnSecundario}>
                <Trash2 size={16} /> Eliminar rol
              </button>
            </>
          )}
          <span className="text-xs text-slate-500">{rol.usuarios} usuario(s) con este rol</span>
        </div>
        {guardarDatos.isError && <p className="mt-3 text-sm text-red-600">{mensajeDeError(guardarDatos.error)}</p>}
      </Tarjeta>

      <Tarjeta
        titulo={`Permisos (${rol.fijo ? catalogo.reduce((n, m) => n + m.permisos.length, 0) : permisos.length})`}
        acciones={
          !rol.fijo && (
            <button type="button" onClick={() => guardar.mutate()} disabled={!cambiado || guardar.isPending} className={btnPrimario}>
              <Save size={16} /> {guardar.isPending ? "Guardando..." : "Guardar permisos"}
            </button>
          )
        }
      >
        {rol.fijo ? (
          <div className="mb-4">
            <Aviso tono="info" titulo="Administrador siempre tiene todos los permisos">
              Así nadie se queda sin poder administrar el sistema. Los permisos nuevos que se agreguen también le llegan.
            </Aviso>
          </div>
        ) : (
          <div className="mb-4">
            <Aviso tono="info" titulo="Solo puedes dar permisos que tú tienes">
              Aquí se editan los permisos de Comercial y Administración; Transporte y Almacén se manejan con sus roles de siempre. Los usuarios ya conectados verán el
              menú actualizado al volver a iniciar sesión.
            </Aviso>
          </div>
        )}
        {guardar.isError && <p className="mb-4 text-sm text-red-600">{mensajeDeError(guardar.error)}</p>}
        <div className="grid gap-6 md:grid-cols-2">
          {catalogo.map((m) => {
            const nombres = m.permisos.map((p) => p.nombre);
            const lectura = rol.fijo || !m.editable;
            const marcados = rol.fijo ? nombres : permisos;
            const todos = nombres.every((n) => marcados.includes(n));
            return (
              <div key={m.modulo}>
                <label className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <input type="checkbox" checked={todos} disabled={lectura} onChange={(e) => marcar(nombres, e.target.checked)} aria-label={`Todo ${m.modulo}`} />
                  {m.modulo}
                  {!m.editable && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-normal normal-case tracking-normal text-slate-400">
                      <Lock size={11} /> Por rol de siempre
                    </span>
                  )}
                </label>
                <ul className="space-y-1">
                  {m.permisos.map((p) => (
                    <li key={p.nombre}>
                      <label className={`flex items-start gap-2 text-sm ${lectura ? "" : "cursor-pointer"}`}>
                        <input type="checkbox" checked={marcados.includes(p.nombre)} disabled={lectura} onChange={(e) => marcar([p.nombre], e.target.checked)} className="mt-0.5" />
                        <span>
                          {p.descripcion ?? p.nombre}
                          <code className="ml-1.5 text-[10px] text-slate-400">{p.nombre}</code>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Tarjeta>

      {confirmaEliminar && (
        <Modal
          titulo={`Eliminar "${rol.nombre}"`} textoGuardar="Eliminar rol" onCerrar={() => setConfirmaEliminar(false)} onGuardar={() => eliminar.mutate()}
          guardando={eliminar.isPending} error={eliminar.isError ? mensajeDeError(eliminar.error) : null} ancho="max-w-md"
        >
          <p className="text-sm text-slate-600 sm:col-span-2">
            Se elimina el rol y su lista de permisos. {rol.usuarios > 0 ? `Tiene ${rol.usuarios} usuario(s): primero cámbiales el rol.` : "No tiene usuarios."} Queda en la auditoría.
          </p>
        </Modal>
      )}
    </div>
  );
}

function CrearRolModal({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (id: number) => void }) {
  const [nombre, setNombre] = useState("");
  const { enviar, guardando, error } = useEnviar("roles", () => crearRol({ nombre: nombre.trim(), permisos: [] }), (r) => onCreado(r.id));
  return (
    <Modal
      titulo="Nuevo rol" textoGuardar="Crear rol" onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error} ancho="max-w-lg"
      deshabilitado={nombre.trim().length < 3} {...(nombre.trim().length < 3 && { aviso: "Falta: nombre del rol (mínimo 3 letras)" })}
    >
      <Campo label="Nombre" requerido className="sm:col-span-2" ayuda="Después de crearlo eliges sus permisos">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} placeholder="Ej. Supervisor de ventas" className={inputClass} autoFocus />
      </Campo>
    </Modal>
  );
}
