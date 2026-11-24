import { useState } from "react";
import { inputClassGenerico } from "../almacen/almacen.utils";
import { Campo, Modal } from "../../components/ui/FormularioModal";
import { inputClass as input } from "../../lib/estilos";
import { etiqueta } from "../../lib/formato";
import { normalizar } from "../../lib/busqueda";
import { useEnviar as useEnviarModulo } from "../../lib/useEnviar";
import {
  cambios,
  crearCliente,
  crearConcepto,
  crearCuenta,
  crearItemCatalogo,
  crearProveedor,
  editarCliente,
  editarConcepto,
  editarCuenta,
  editarItemCatalogo,
  editarProveedor,
  TIPOS_CATALOGO,
  TIPOS_PROVEEDOR,
  type Cliente,
  type Concepto,
  type DatosCliente,
  type CuentaBancaria,
  type DatosConcepto,
  type DatosCuenta,
  type DatosItemCatalogo,
  type DatosProveedor,
  type ItemCatalogo,
  type Proveedor,
  type TipoCatalogo,
} from "./maestros.api";
import { useProveedores } from "./useMaestros";

/** Guarda y cierra; el error del servidor se muestra dentro del formulario. */
const useEnviar = <R,>(accion: () => Promise<R>, onListo: (r: R) => void) => useEnviarModulo("maestros", accion, onListo);

function Activo({ valor, onCambiar }: { valor: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
      <input type="checkbox" checked={valor} onChange={(e) => onCambiar(e.target.checked)} />
      Activo (si se desactiva, deja de aparecer en los formularios pero se conserva en el historial)
    </label>
  );
}

// ---------- Cliente ----------

const CLIENTE_VACIO: DatosCliente = {
  razonSocial: "", tipoDocumento: "RUC", numeroDocumento: "", tipoCliente: "NACIONAL", direccion: "", contacto: "",
  correo: "", telefono: "", condicionCredito: "CONTADO", diasCredito: 0, moneda: "USD", activo: true,
};

export function FormularioCliente({ cliente, nombreInicial, onCreado, onCerrar }: { cliente?: Cliente; nombreInicial?: string; onCreado?: (c: Cliente) => void; onCerrar: () => void }) {
  const inicial: DatosCliente = cliente
    ? { ...cliente, direccion: cliente.direccion ?? "", contacto: cliente.contacto ?? "", correo: cliente.correo ?? "", telefono: cliente.telefono ?? "" }
    : { ...CLIENTE_VACIO, razonSocial: nombreInicial ?? "" };
  const [f, setF] = useState(inicial);
  const set = <K extends keyof DatosCliente>(k: K, v: DatosCliente[K]) => setF((x) => ({ ...x, [k]: v }));
  const { enviar, guardando, error } = useEnviar(
    () => (cliente ? editarCliente(cliente.id, cambios(inicial, f)) : crearCliente(f)),
    (r) => {
      if (!cliente) onCreado?.(r);
      onCerrar();
    }
  );
  return (
    <Modal titulo={cliente ? `Editar ${cliente.razonSocial}` : "Nuevo cliente"} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error}>
      <Campo label="Razón social" requerido className="sm:col-span-2">
        <input className={input} value={f.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} autoFocus />
      </Campo>
      <Campo label="Tipo de cliente">
        <select
          className={input}
          value={f.tipoCliente}
          onChange={(e) => {
            const tipo = e.target.value as DatosCliente["tipoCliente"];
            setF((x) => ({ ...x, tipoCliente: tipo, tipoDocumento: tipo === "NACIONAL" ? "RUC" : "TAX_ID" }));
          }}
        >
          <option value="NACIONAL">Nacional</option>
          <option value="EXTRANJERO">Extranjero</option>
        </select>
      </Campo>
      <Campo label={f.tipoDocumento === "RUC" ? "RUC" : "Tax ID"} requerido ayuda={f.tipoDocumento === "RUC" ? "11 dígitos" : undefined}>
        <div className="flex gap-2">
          <select className={`${inputClassGenerico} w-28 shrink-0`} value={f.tipoDocumento} onChange={(e) => set("tipoDocumento", e.target.value as DatosCliente["tipoDocumento"])}>
            <option value="RUC">RUC</option>
            <option value="TAX_ID">Tax ID</option>
          </select>
          <input className={`${input} min-w-0`} value={f.numeroDocumento} onChange={(e) => set("numeroDocumento", e.target.value)} />
        </div>
      </Campo>
      <Campo label="Dirección" className="sm:col-span-2">
        <input className={input} value={f.direccion ?? ""} onChange={(e) => set("direccion", e.target.value)} />
      </Campo>
      <Campo label="Contacto">
        <input className={input} value={f.contacto ?? ""} onChange={(e) => set("contacto", e.target.value)} />
      </Campo>
      <Campo label="Teléfono">
        <input className={input} value={f.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} />
      </Campo>
      <Campo label="Correo" className="sm:col-span-2">
        <input type="email" className={input} value={f.correo ?? ""} onChange={(e) => set("correo", e.target.value)} />
      </Campo>
      <Campo label="Condición de pago">
        <select
          className={input}
          value={f.condicionCredito}
          onChange={(e) => {
            const c = e.target.value as DatosCliente["condicionCredito"];
            setF((x) => ({ ...x, condicionCredito: c, diasCredito: c === "CONTADO" ? 0 : x.diasCredito || 30 }));
          }}
        >
          <option value="CONTADO">Contado</option>
          <option value="CREDITO">Crédito</option>
        </select>
      </Campo>
      <Campo label="Días de crédito">
        <input
          type="number"
          min={0}
          max={365}
          className={input}
          disabled={f.condicionCredito === "CONTADO"}
          value={f.diasCredito}
          onChange={(e) => set("diasCredito", Number(e.target.value))}
        />
      </Campo>
      <Campo label="Moneda habitual">
        <select className={input} value={f.moneda} onChange={(e) => set("moneda", e.target.value as DatosCliente["moneda"])}>
          <option value="USD">Dólares (USD)</option>
          <option value="PEN">Soles (PEN)</option>
        </select>
      </Campo>
      {cliente && <Activo valor={f.activo} onCambiar={(v) => set("activo", v)} />}
    </Modal>
  );
}

// ---------- Proveedor ----------

/** `onCerrar` recibe el proveedor guardado (para elegirlo de inmediato, ej. al registrar un pago); sin argumento si se canceló. */
export function FormularioProveedor({ proveedor, onCerrar }: { proveedor?: Proveedor; onCerrar: (guardado?: Proveedor) => void }) {
  const inicial: DatosProveedor = proveedor ?? { ruc: "", extranjero: false, razonSocial: "", nombreCorto: null, tipo: "OTRO", activo: true };
  const [f, setF] = useState(inicial);
  const { enviar, guardando, error } = useEnviar(
    () => (proveedor ? editarProveedor(proveedor.id, cambios(inicial, f)) : crearProveedor(f)),
    (guardado) => onCerrar(guardado)
  );
  return (
    <Modal titulo={proveedor ? `Editar ${proveedor.razonSocial}` : "Nuevo proveedor"} onCerrar={() => onCerrar()} onGuardar={enviar} guardando={guardando} error={error}>
      <Campo label="Razón social" requerido className="sm:col-span-2">
        <input className={input} value={f.razonSocial} onChange={(e) => setF({ ...f, razonSocial: e.target.value })} autoFocus />
      </Campo>
      <Campo label="Nombre corto (opcional)" className="sm:col-span-2" ayuda="Cómo sale en la nota de cobranza y la proforma liquidada, ej. MSC S.A.C. Vacío = la razón social.">
        <input className={input} maxLength={60} value={f.nombreCorto ?? ""} onChange={(e) => setF({ ...f, nombreCorto: e.target.value.toUpperCase() || null })} />
      </Campo>
      <Campo label="Origen">
        <select className={input} value={f.extranjero ? "EXTERIOR" : "NACIONAL"} onChange={(e) => setF({ ...f, extranjero: e.target.value === "EXTERIOR" })}>
          <option value="NACIONAL">Nacional (RUC)</option>
          <option value="EXTERIOR">Del exterior</option>
        </select>
      </Campo>
      <Campo
        label={f.extranjero ? "Identificación fiscal" : "RUC"}
        requerido
        ayuda={f.extranjero ? "Tax ID / VAT del país de origen (ej. DK53139655)" : "11 dígitos"}
      >
        <input className={input} value={f.ruc} onChange={(e) => setF({ ...f, ruc: e.target.value.toUpperCase() })} />
      </Campo>
      <Campo label="Tipo">
        <select className={input} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as DatosProveedor["tipo"] })}>
          {TIPOS_PROVEEDOR.map((t) => (
            <option key={t} value={t}>
              {etiqueta(t)}
            </option>
          ))}
        </select>
      </Campo>
      {proveedor && <Activo valor={f.activo} onCambiar={(v) => setF({ ...f, activo: v })} />}
    </Modal>
  );
}

// ---------- Cuenta bancaria de la empresa ----------

export function FormularioCuenta({ cuenta, onCerrar }: { cuenta?: CuentaBancaria; onCerrar: () => void }) {
  const inicial: DatosCuenta = cuenta ? { ...cuenta, cci: cuenta.cci ?? "" } : { banco: "", moneda: "USD", numeroCuenta: "", cci: "", activo: true };
  const [f, setF] = useState(inicial);
  const { enviar, guardando, error } = useEnviar(() => (cuenta ? editarCuenta(cuenta.id, cambios(inicial, f)) : crearCuenta(f)), onCerrar);
  return (
    <Modal titulo={cuenta ? `Editar cuenta de ${cuenta.banco}` : "Nueva cuenta bancaria"} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error}>
      <Campo label="Banco" requerido>
        <input className={input} value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} autoFocus />
      </Campo>
      <Campo label="Moneda" requerido ayuda="No cambia si la cuenta ya tiene cobros">
        <select className={input} value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value as DatosCuenta["moneda"] })}>
          <option value="USD">Dólares (US$)</option>
          <option value="PEN">Soles (S/)</option>
        </select>
      </Campo>
      <Campo label="N.° de cuenta" requerido>
        <input className={input} value={f.numeroCuenta} onChange={(e) => setF({ ...f, numeroCuenta: e.target.value })} />
      </Campo>
      <Campo label="CCI">
        <input className={input} value={f.cci ?? ""} onChange={(e) => setF({ ...f, cci: e.target.value })} />
      </Campo>
      {cuenta && <Activo valor={f.activo} onCambiar={(v) => setF({ ...f, activo: v })} />}
    </Modal>
  );
}

// ---------- Concepto ----------

export function FormularioConcepto({ concepto, nombreInicial, onCreado, onCerrar }: { concepto?: Concepto; nombreInicial?: string; onCreado?: (c: Concepto) => void; onCerrar: () => void }) {
  const inicial: DatosConcepto = concepto ?? {
    // Desde la proforma: el código sale del nombre escrito y se puede cambiar
    codigo: normalizar(nombreInicial ?? "").toUpperCase().replace(/ /g, "_").slice(0, 20), nombre: nombreInicial ?? "", tipo: "GASTO_TERCERO", afectoIgv: false, activo: true, precioSugerido: null, precioMoneda: "USD", precioIncluyeIgv: false,
  };
  const [f, setF] = useState(inicial);
  const { enviar, guardando, error } = useEnviar(
    () => (concepto ? editarConcepto(concepto.id, cambios(inicial, f)) : crearConcepto(f)),
    (r) => {
      if (!concepto) onCreado?.(r);
      onCerrar();
    }
  );
  return (
    <Modal titulo={concepto ? `Editar ${concepto.nombre}` : "Nuevo concepto"} onCerrar={onCerrar} onGuardar={enviar} guardando={guardando} error={error}>
      <Campo label="Nombre" requerido className="sm:col-span-2">
        <input className={input} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus />
      </Campo>
      <Campo label="Código" requerido ayuda="Mayúsculas, números y _ (ej. VISTO_BUENO)">
        <input className={input} value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase() })} />
      </Campo>
      <Campo label="Tipo">
        <select
          className={input}
          value={f.tipo}
          onChange={(e) => {
            const tipo = e.target.value as DatosConcepto["tipo"];
            // Los servicios propios llevan IGV; los gastos de terceros se trasladan sin IGV
            setF({ ...f, tipo, afectoIgv: tipo === "SERVICIO_PROPIO" });
          }}
        >
          <option value="SERVICIO_PROPIO">Servicio propio</option>
          <option value="GASTO_TERCERO">Gasto de tercero</option>
        </select>
      </Campo>
      <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
        <input type="checkbox" checked={f.afectoIgv} onChange={(e) => setF({ ...f, afectoIgv: e.target.checked })} />
        Afecto a IGV
      </label>
      <Campo label="Precio sugerido" ayuda="Aparecerá al agregar el concepto a mano en una proforma. Vacío = sin precio">
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            className={`${input} min-w-0`}
            placeholder="—"
            value={f.precioSugerido ?? ""}
            onChange={(e) => setF({ ...f, precioSugerido: e.target.value === "" ? null : Number(e.target.value) })}
          />
          <select className={`${inputClassGenerico} w-24 shrink-0`} value={f.precioMoneda} onChange={(e) => setF({ ...f, precioMoneda: e.target.value as DatosConcepto["precioMoneda"] })}>
            <option value="USD">USD</option>
            <option value="PEN">PEN</option>
          </select>
        </div>
      </Campo>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
        <input type="checkbox" checked={f.precioIncluyeIgv} disabled={!f.afectoIgv} onChange={(e) => setF({ ...f, precioIncluyeIgv: e.target.checked })} />
        El precio incluye IGV
      </label>
      {concepto && <Activo valor={f.activo} onCambiar={(v) => setF({ ...f, activo: v })} />}
    </Modal>
  );
}

// ---------- Ítem de catálogo ----------

export function FormularioItemCatalogo({ tipo, item, nombreInicial, onCreado, onCerrar }: { tipo: TipoCatalogo; item?: ItemCatalogo; nombreInicial?: string; onCreado?: (i: ItemCatalogo) => void; onCerrar: () => void }) {
  const config = TIPOS_CATALOGO.find((t) => t.clave === tipo)!;
  const { data: proveedores } = useProveedores();
  const inicial: DatosItemCatalogo = {
    nombre: item?.nombre ?? nombreInicial ?? "",
    activo: item?.activo ?? true,
    ...(config.codigo && { codigo: item?.codigo ?? "" }),
    ...(config.proveedor && { proveedorId: item?.proveedorId ?? null }),
    ...(tipo === "regimenes" && { tipoOperacion: item?.tipoOperacion ?? null }),
  };
  const [f, setF] = useState(inicial);
  const { enviar, guardando, error } = useEnviar(
    () => (item ? editarItemCatalogo(tipo, item.id, cambios(inicial, f)) : crearItemCatalogo(tipo, f)),
    (r) => {
      if (!item) onCreado?.(r);
      onCerrar();
    }
  );
  return (
    <Modal
      titulo={item ? `Editar ${item.nombre}` : `Agregar a ${config.titulo.toLowerCase()}`}
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardando}
      error={error}
    >
      <Campo label="Nombre" requerido className={config.codigo ? "" : "sm:col-span-2"}>
        <input className={input} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus />
      </Campo>
      {config.codigo && (
        <Campo label="Código" ayuda={config.ayudaCodigo}>
          <input className={input} value={f.codigo ?? ""} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase() })} />
        </Campo>
      )}
      {config.proveedor && (
        <Campo label="Proveedor que factura" className="sm:col-span-2" ayuda="Opcional: la empresa que emite los comprobantes">
          <select className={input} value={f.proveedorId ?? ""} onChange={(e) => setF({ ...f, proveedorId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">— Sin proveedor —</option>
            {proveedores
              ?.filter((p) => p.activo || p.id === f.proveedorId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razonSocial}
                </option>
              ))}
          </select>
        </Campo>
      )}
      {tipo === "regimenes" && (
        <Campo label="Tipo de operación" ayuda="La proforma tomará de aquí si es importación o exportación">
          <select
            className={input}
            value={f.tipoOperacion ?? ""}
            onChange={(e) => setF({ ...f, tipoOperacion: (e.target.value || null) as ItemCatalogo["tipoOperacion"] })}
          >
            <option value="">— Sin definir —</option>
            <option value="IMPORTACION">Importación</option>
            <option value="EXPORTACION">Exportación</option>
          </select>
        </Campo>
      )}
      {item && tipo !== "tipos-contenedor" && <Activo valor={f.activo} onCambiar={(v) => setF({ ...f, activo: v })} />}
    </Modal>
  );
}
