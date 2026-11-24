import { useState } from "react";
import { Save } from "lucide-react";
import { Campo } from "../../components/ui/FormularioModal";
import { Aviso, Tarjeta } from "../../components/ui/Tarjeta";
import { btnPrimario, btnSecundario, inputClass } from "../../lib/estilos";
import { useEnviar } from "../../lib/useEnviar";
import { guardarEmpresa, type Empresa } from "./maestros.api";
import { useEmpresa } from "./useMaestros";

const EMPRESA_VACIA: Empresa = {
  razonSocial: "", ruc: "", nombreComercial: "", direccion: "", telefono: "", correo: "", web: "", logoUrl: "", tasaIgv: 0.18, pieProforma: "", pieNotaCobranza: "",
};

/** Datos de la empresa que van en el encabezado de las proformas. */
export function EmpresaPanel() {
  const { data: empresa, isLoading } = useEmpresa();
  if (isLoading) return <p className="text-sm text-slate-500">Cargando...</p>;
  // Se monta con los datos ya cargados para que el formulario empiece lleno
  return <FormularioEmpresa inicial={empresa ?? EMPRESA_VACIA} nueva={!empresa} />;
}

function FormularioEmpresa({ inicial, nueva }: { inicial: Empresa; nueva: boolean }) {
  const [f, setF] = useState<Empresa>(inicial);
  const [guardado, setGuardado] = useState(false);
  const set = <K extends keyof Empresa>(k: K, v: Empresa[K]) => {
    setGuardado(false);
    setF((x) => ({ ...x, [k]: v }));
  };
  const { enviar, guardando, error } = useEnviar("maestros", () => guardarEmpresa(f), () => setGuardado(true));
  const texto = (k: "razonSocial" | "ruc" | "nombreComercial" | "direccion" | "telefono" | "correo" | "web" | "logoUrl") => (
    <input className={inputClass} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
  );

  return (
    <Tarjeta titulo="Datos de la empresa">
      {nueva && (
        <div className="mb-4">
          <Aviso tono="advertencia" titulo="Faltan los datos de la empresa">
            Se usan en el encabezado de las proformas y el IGV con el que se calculan.
          </Aviso>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Aviso tono="error" titulo={error} />
        </div>
      )}
      {guardado && (
        <div className="mb-4">
          <Aviso tono="exito" titulo="Datos de la empresa guardados" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo label="Razón social" requerido className="lg:col-span-2">{texto("razonSocial")}</Campo>
        <Campo label="RUC" requerido ayuda="11 dígitos">{texto("ruc")}</Campo>
        <Campo label="Nombre comercial" className="lg:col-span-2">{texto("nombreComercial")}</Campo>
        <Campo label="Teléfono">{texto("telefono")}</Campo>
        <Campo label="Dirección" className="lg:col-span-2">{texto("direccion")}</Campo>
        <Campo label="Correo">{texto("correo")}</Campo>
        <Campo label="Web">{texto("web")}</Campo>
        <Campo label="Tasa de IGV (%)" ayuda="Ej. 18 para el 18 %">
          {/* Se muestra en porcentaje; por dentro se guarda como fracción (0.18) */}
          <input
            type="number"
            step="0.01"
            min={0}
            max={100}
            className={inputClass}
            value={Number((f.tasaIgv * 100).toFixed(2))}
            onChange={(e) => set("tasaIgv", Number((Number(e.target.value) / 100).toFixed(4)))}
          />
        </Campo>
        <Campo label="URL del logo" className="lg:col-span-3" ayuda="Opcional: imagen pública (https://…)">{texto("logoUrl")}</Campo>
        <Campo label="Pie de la proforma" className="lg:col-span-3" ayuda="Condiciones comerciales que se imprimen en cada proforma">
          <textarea rows={3} className={inputClass} value={f.pieProforma ?? ""} onChange={(e) => set("pieProforma", e.target.value)} />
        </Campo>
        <Campo label="Condiciones de la nota de cobranza" className="lg:col-span-3" ayuda="Se imprimen en cada nota. Vacío = «Contado» o «Crédito N días» según el cliente">
          <textarea rows={2} className={inputClass} value={f.pieNotaCobranza ?? ""} onChange={(e) => set("pieNotaCobranza", e.target.value)} />
        </Campo>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => { setF(inicial); setGuardado(false); }} className={btnSecundario}>Deshacer cambios</button>
        <button type="button" onClick={enviar} disabled={guardando} className={btnPrimario}>
          <Save size={16} /> {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </Tarjeta>
  );
}
