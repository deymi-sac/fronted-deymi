import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { useCatalogos, useClientes, useConceptos, useProveedores } from "./useMaestros";
import { useCuentasBancarias } from "../cobranza/cobranza.api";
import { FormularioCliente, FormularioConcepto, FormularioCuenta, FormularioItemCatalogo, FormularioProveedor } from "./FormulariosMaestros";
import {
  TIPOS_CATALOGO,
  type Cliente,
  type Concepto,
  type CuentaBancaria,
  type ItemCatalogo,
  type Proveedor,
  type TipoCatalogo,
} from "./maestros.api";
import { EncabezadoPagina } from "../../components/ui/EncabezadoPagina";
import { Tabla } from "../../components/ui/Tabla";
import { Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, inputClass } from "../../lib/estilos";
import { dinero, etiqueta } from "../../lib/formato";
import { tienePermiso } from "../auth/auth.utils";
import { EmpresaPanel } from "./EmpresaPanel";
import { NumeracionPanel } from "./NumeracionPanel";
import { Paginado } from "../../components/ui/Paginado";

type Tab = "clientes" | "proveedores" | "conceptos" | "catalogos" | "cuentas" | "empresa" | "numeracion";

/** Qué formulario está abierto (y con qué registro, si se edita). */
type Edicion =
  | { tipo: "cliente"; fila?: Cliente }
  | { tipo: "proveedor"; fila?: Proveedor }
  | { tipo: "concepto"; fila?: Concepto }
  | { tipo: "cuenta"; fila?: CuentaBancaria }
  | { tipo: "catalogo"; catalogo: TipoCatalogo; fila?: ItemCatalogo }
  | null;

const TABS: { clave: Tab; label: string }[] = [
  { clave: "clientes", label: "Clientes" },
  { clave: "proveedores", label: "Proveedores" },
  { clave: "conceptos", label: "Conceptos" },
  { clave: "catalogos", label: "Catálogos" },
  { clave: "cuentas", label: "Cuentas bancarias" },
  { clave: "empresa", label: "Empresa" },
  { clave: "numeracion", label: "Numeración" },
];

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const contiene = (texto: string, ...campos: (string | null | undefined)[]) =>
  !texto || campos.some((c) => c && sinTildes(c).includes(sinTildes(texto)));

function Estado({ activo }: { activo: boolean }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${activo ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

export default function MaestrosPage() {
  const [tab, setTab] = useState<Tab>("clientes");
  const [buscar, setBuscar] = useState("");
  const [edicion, setEdicion] = useState<Edicion>(null);
  const { data: clientes, isLoading: cargandoClientes } = useClientes();
  const { data: proveedores } = useProveedores();
  const { data: conceptos } = useConceptos();
  const { data: cat } = useCatalogos();
  const { data: cuentas } = useCuentasBancarias();
  const cerrar = () => setEdicion(null);
  // El backend valida el permiso numeracion_configurar
  const puedeConfigurarNumeracion = tienePermiso("numeracion_configurar");

  const nuevo: Partial<Record<Tab, () => void>> = {
    clientes: () => setEdicion({ tipo: "cliente" }),
    proveedores: () => setEdicion({ tipo: "proveedor" }),
    conceptos: () => setEdicion({ tipo: "concepto" }),
    cuentas: () => setEdicion({ tipo: "cuenta" }),
  };
  const nombreProveedor = (id?: number | null) => proveedores?.find((p) => p.id === id)?.razonSocial;
  const contador: Record<Tab, number | undefined> = {
    clientes: clientes?.length,
    proveedores: proveedores?.length,
    conceptos: conceptos?.length,
    catalogos: undefined,
    cuentas: cuentas?.length,
    empresa: undefined,
    numeracion: undefined,
  };

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <EncabezadoPagina
        titulo="Maestros"
        subtitulo="Clientes, proveedores, conceptos y catálogos para tarifas y proformas"
        acciones={
          nuevo[tab] && (
            <button type="button" onClick={nuevo[tab]} className={btnPrimario}>
              <Plus size={16} /> Nuevo
            </button>
          )
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.clave}
            type="button"
            onClick={() => {
              setTab(t.clave);
              setBuscar("");
            }}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.clave ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {contador[t.clave] !== undefined && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{contador[t.clave]}</span>}
          </button>
        ))}
      </div>

      {(tab === "clientes" || tab === "proveedores" || tab === "conceptos") && (
        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-9`} placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
      )}

      {tab === "clientes" && (
        <Tarjeta sinPadding>
          <Tabla
            cargando={cargandoClientes}
            filas={clientes?.filter((c) => contiene(buscar, c.razonSocial, c.numeroDocumento, c.contacto))}
            claveFila={(c) => c.id}
            onFila={(c) => setEdicion({ tipo: "cliente", fila: c })}
            vacio="Aún no hay clientes registrados"
            columnas={[
              { titulo: "Razón social", celda: (c) => <span className="font-medium text-slate-800">{c.razonSocial}</span> },
              { titulo: "Documento", celda: (c) => `${c.tipoDocumento === "RUC" ? "RUC" : "Tax ID"} ${c.numeroDocumento}` },
              { titulo: "Tipo", celda: (c) => etiqueta(c.tipoCliente) },
              { titulo: "Contacto", celda: (c) => (<span>{c.contacto ?? "—"}<span className="block text-xs text-slate-400">{c.correo}</span></span>) },
              { titulo: "Teléfono", celda: (c) => c.telefono ?? "—" },
              { titulo: "Crédito", celda: (c) => (c.condicionCredito === "CREDITO" ? `${c.diasCredito} días` : "Contado") },
              { titulo: "Moneda", celda: (c) => c.moneda },
              { titulo: "Estado", celda: (c) => <Estado activo={c.activo} /> },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "proveedores" && (
        <Tarjeta sinPadding>
          <Tabla
            filas={proveedores?.filter((p) => contiene(buscar, p.razonSocial, p.ruc, p.nombreCorto ?? ""))}
            claveFila={(p) => p.id}
            onFila={(p) => setEdicion({ tipo: "proveedor", fila: p })}
            vacio="Aún no hay proveedores registrados"
            columnas={[
              { titulo: "Documento", celda: (p) => `${p.extranjero ? "Exterior" : "RUC"} ${p.ruc}` },
              {
                titulo: "Razón social",
                celda: (p) => (
                  <>
                    <span className="font-medium text-slate-800">{p.razonSocial}</span>
                    {p.nombreCorto && <span className="block text-xs text-slate-500">En la nota: {p.nombreCorto}</span>}
                  </>
                ),
              },
              { titulo: "Tipo", celda: (p) => etiqueta(p.tipo) },
              { titulo: "Estado", celda: (p) => <Estado activo={p.activo} /> },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "conceptos" && (
        <Tarjeta sinPadding>
          <Tabla
            filas={conceptos?.filter((c) => contiene(buscar, c.nombre, c.codigo))}
            claveFila={(c) => c.id}
            onFila={(c) => setEdicion({ tipo: "concepto", fila: c })}
            vacio="Aún no hay conceptos registrados"
            columnas={[
              { titulo: "Código", celda: (c) => <code className="text-xs">{c.codigo}</code> },
              { titulo: "Concepto", celda: (c) => <span className="font-medium text-slate-800">{c.nombre}</span> },
              { titulo: "Tipo", celda: (c) => etiqueta(c.tipo) },
              { titulo: "IGV", celda: (c) => (c.afectoIgv ? "Afecto" : "Inafecto") },
              {
                titulo: "Precio sugerido",
                alinear: "derecha",
                celda: (c) => (c.precioSugerido != null ? `${dinero(c.precioSugerido, c.precioMoneda)}${c.precioIncluyeIgv ? " inc. IGV" : ""}` : "—"),
              },
              { titulo: "Estado", celda: (c) => <Estado activo={c.activo} /> },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "catalogos" &&
        (cat ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TIPOS_CATALOGO.map((t) => (
              <Tarjeta
                key={t.clave}
                titulo={t.titulo}
                acciones={
                  <button
                    type="button"
                    onClick={() => setEdicion({ tipo: "catalogo", catalogo: t.clave })}
                    className="rounded-lg p-1 text-slate-700 hover:bg-slate-100"
                    aria-label={`Agregar a ${t.titulo}`}
                  >
                    <Plus size={16} />
                  </button>
                }
              >
                {cat[t.clave].length === 0 && <p className="text-sm text-slate-400">Sin registros</p>}
                <Paginado items={cat[t.clave]}>
                  {(pagina) => (
                    <ul className="space-y-1.5 text-sm">
                      {pagina.map((i) => (
                        <li key={i.id} className={`group flex items-start justify-between gap-2 ${i.activo ? "text-slate-700" : "text-slate-400 line-through"}`}>
                          <span>
                            {i.codigo && <code className="mr-1.5 text-xs text-slate-500">{i.codigo}</code>}
                            {i.nombre}
                            {t.proveedor && i.proveedorId && <span className="block text-xs text-slate-400">{nombreProveedor(i.proveedorId)}</span>}
                            {t.clave === "regimenes" && (
                              <span className={`block text-xs ${i.tipoOperacion ? "text-slate-400" : "text-red-600"}`}>
                                {i.tipoOperacion === "IMPORTACION" ? "Importación" : i.tipoOperacion === "EXPORTACION" ? "Exportación" : "Sin tipo: no se podrá usar en proformas"}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEdicion({ tipo: "catalogo", catalogo: t.clave, fila: i })}
                            className="rounded p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100"
                            aria-label={`Editar ${i.nombre}`}
                          >
                            <Pencil size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Paginado>
              </Tarjeta>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Cargando...</p>
        ))}

      {tab === "cuentas" && (
        <Tarjeta sinPadding>
          <Tabla
            filas={cuentas}
            claveFila={(c) => c.id}
            onFila={(c) => setEdicion({ tipo: "cuenta", fila: c })}
            vacio="Aún no hay cuentas bancarias: son las que aparecen en la nota de cobranza para que el cliente pague"
            columnas={[
              { titulo: "Banco", celda: (c) => <span className="font-medium text-slate-800">{c.banco}</span> },
              { titulo: "Moneda", celda: (c) => (c.moneda === "USD" ? "Dólares" : "Soles") },
              { titulo: "N.° de cuenta", celda: (c) => c.numeroCuenta },
              { titulo: "CCI", celda: (c) => c.cci ?? "—" },
              { titulo: "Estado", celda: (c) => <Estado activo={c.activo ?? true} /> },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "empresa" && <EmpresaPanel />}
      {tab === "numeracion" && <NumeracionPanel puedeConfigurar={puedeConfigurarNumeracion} />}

      {edicion?.tipo === "cliente" && <FormularioCliente cliente={edicion.fila} onCerrar={cerrar} />}
      {edicion?.tipo === "proveedor" && <FormularioProveedor proveedor={edicion.fila} onCerrar={cerrar} />}
      {edicion?.tipo === "cuenta" && <FormularioCuenta cuenta={edicion.fila} onCerrar={cerrar} />}
      {edicion?.tipo === "concepto" && <FormularioConcepto concepto={edicion.fila} onCerrar={cerrar} />}
      {edicion?.tipo === "catalogo" && <FormularioItemCatalogo tipo={edicion.catalogo} item={edicion.fila} onCerrar={cerrar} />}
    </div>
  );
}
