import { Routes, Route, Navigate } from "react-router-dom";

import { LoginPage } from "./modules/auth/LoginPage";
import { ForgotPasswordPage } from "./modules/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./modules/auth/ResetPasswordPage";
import { CrearUsuarioPage } from "./modules/usuarios/CrearUsuarioPage";
import { UsuariosPage } from "./modules/usuarios/UsuariosPage";
import RolesPage from "./modules/administracion/RolesPage";
import AuditoriaPage from "./modules/administracion/AuditoriaPage";
import DashboardPage from "./modules/dashboard/DashboardPage";
import ServicesPage from "./modules/services/ServicesPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { PERMISOS_ENTRADA_COMERCIAL, ROLES, ROLES_ALMACEN, ROLES_TRANSPORTE } from "./modules/auth/auth.utils";
import { PermisoRoute } from "./routes/PermisoRoute";
import { SinAcceso } from "./routes/SinAcceso";
import PanelComercialPage from "./modules/reportes/PanelComercialPage";
import ReportesPage from "./modules/reportes/ReportesPage";
import MaestrosPage from "./modules/maestros/MaestrosPage";
import TarifasPage from "./modules/tarifas/TarifasPage";
import ProformasPage from "./modules/proformas/ProformasPage";
import ProformaDetallePage from "./modules/proformas/ProformaDetallePage";
import FormularioProformaPage from "./modules/proformas/FormularioProformaPage";
import OperacionesPage from "./modules/operaciones/OperacionesPage";
import OperacionDetallePage from "./modules/operaciones/OperacionDetallePage";
import PagosPage from "./modules/pagos/PagosPage";
import LiquidacionesPage from "./modules/liquidaciones/LiquidacionesPage";
import LiquidacionPage from "./modules/liquidaciones/LiquidacionPage";
import NotaCobranzaPage from "./modules/cobranza/NotaCobranzaPage";
import FacturasPage from "./modules/cobranza/FacturasPage";
import CobranzaPage from "./modules/cobranza/CobranzaPage";
import { UnidadesPage } from "./modules/unidades/UnidadesPage";
import DocumentosPage from "./modules/documentos/DocumentosPage";

import { ConductoresPage } from "./modules/conductores/ConductoresPage";

import { DashboardLayout } from "./components/layout/DashboardLayout";
import TransportistasPage from "./modules/transportistas/TransportistasPage";
import AlmacenDashboardPage from "./modules/almacen/AlmacenDashboardPage";
import AlmacenMovimientosPage from "./modules/almacen/AlmacenMovimientosPage";
import AlmacenClientesPage from "./modules/almacen/AlmacenClientesPage";
import AlmacenProductosPage from "./modules/almacen/AlmacenProductosPage";
import AlmacenUbicacionesPage from "./modules/almacen/AlmacenUbicacionesPage";
import AlmacenFacturacionPage from "./modules/almacen/AlmacenFacturacionPage";

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Rutas protegidas */}
      <Route element={<ProtectedRoute />}>

        {/* Layout principal */}
        <Route element={<DashboardLayout />}>

          {/* Transporte: Administrador, Sistemas y Coordinador de transporte */}
          <Route element={<RoleRoute allowedRoles={ROLES_TRANSPORTE} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/conductores" element={<ConductoresPage />} />
            <Route path="/unidades" element={<UnidadesPage />} />
            <Route path="/asignacion-unidades" element={<ServicesPage />} />
            <Route path="/transportistas" element={<TransportistasPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
          </Route>
          {/* Solo administrador y sistemas (ahora dentro del layout, hereda sidebar y topbar) */}
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SISTEMAS]} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/usuarios/nuevo" element={<CrearUsuarioPage />} />
          </Route>
          {/* Roles y permisos: quien administra usuarios; auditoría: quien tenga ese permiso (ej. Gerencia) */}
          <Route element={<PermisoRoute permisos={["usuarios_roles"]} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>
          <Route element={<PermisoRoute permisos={["auditoria_ver"]} />}>
            <Route path="/auditoria" element={<AuditoriaPage />} />
          </Route>

          {/* Almacén: Administrador, Sistemas, Coordinador de Almacén y Facturación (el backend ya
              restringe qué puede escribir cada uno; aquí solo se controla quién ve el módulo) */}
          <Route element={<RoleRoute allowedRoles={ROLES_ALMACEN} />}>
            <Route path="/almacen/dashboard" element={<AlmacenDashboardPage />} />
            <Route path="/almacen/movimientos" element={<AlmacenMovimientosPage />} />
            <Route path="/almacen/clientes" element={<AlmacenClientesPage />} />
            <Route path="/almacen/productos" element={<AlmacenProductosPage />} />
            <Route path="/almacen/ubicaciones" element={<AlmacenUbicacionesPage />} />
            <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SISTEMAS, ROLES.FACTURACION]} />}>
              <Route path="/almacen/facturacion" element={<AlmacenFacturacionPage />} />
            </Route>
          </Route>

          {/* Comercial: cualquier rol con permisos del módulo (el backend valida el permiso de cada acción) */}
          <Route element={<PermisoRoute permisos={PERMISOS_ENTRADA_COMERCIAL} />}>
            <Route element={<PermisoRoute permisos={["panel_comercial"]} />}>
              <Route path="/comercial/panel" element={<PanelComercialPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["reportes_comercial"]} />}>
              <Route path="/comercial/reportes" element={<ReportesPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["maestros_ver"]} />}>
              <Route path="/comercial/maestros" element={<MaestrosPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["tarifas_ver"]} />}>
              <Route path="/comercial/tarifas" element={<TarifasPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["proformas_ver"]} />}>
              <Route path="/comercial/proformas" element={<ProformasPage />} />
              <Route path="/comercial/proformas/nueva" element={<FormularioProformaPage />} />
              <Route path="/comercial/proformas/:id" element={<ProformaDetallePage />} />
              <Route path="/comercial/proformas/:id/editar" element={<FormularioProformaPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["operaciones_ver"]} />}>
              <Route path="/comercial/operaciones" element={<OperacionesPage />} />
              <Route path="/comercial/operaciones/:id" element={<OperacionDetallePage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["pagos_ver"]} />}>
              <Route path="/comercial/pagos" element={<PagosPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["liquidaciones_ver"]} />}>
              <Route path="/comercial/liquidaciones" element={<LiquidacionesPage />} />
              <Route path="/comercial/liquidaciones/:operacionId" element={<LiquidacionPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["liquidaciones_ver", "cobros_ver"]} />}>
              <Route path="/comercial/notas/:id" element={<NotaCobranzaPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["facturas_ver"]} />}>
              <Route path="/comercial/facturas" element={<FacturasPage />} />
            </Route>
            <Route element={<PermisoRoute permisos={["cobros_ver"]} />}>
              <Route path="/comercial/cobranza" element={<CobranzaPage />} />
            </Route>
          </Route>

          <Route path="/sin-acceso" element={<SinAcceso />} />

        </Route>

      </Route>
    </Routes>
  );
}

export default App;