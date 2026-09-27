import { Routes, Route, Navigate } from "react-router-dom";

import { LoginPage } from "./modules/auth/LoginPage";
import { ForgotPasswordPage } from "./modules/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./modules/auth/ResetPasswordPage";
import { CrearUsuarioPage } from "./modules/usuarios/CrearUsuarioPage";
import { UsuariosPage } from "./modules/usuarios/UsuariosPage";
import DashboardPage from "./modules/dashboard/DashboardPage";
import ServicesPage from "./modules/services/ServicesPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { ROLES } from "./modules/auth/auth.utils";
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

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/conductores" element={<ConductoresPage />} />
          <Route path="/unidades" element={<UnidadesPage />} />
          <Route path="/asignacion-unidades" element={<ServicesPage />} />
          <Route path="/transportistas" element={<TransportistasPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          {/* Solo administrador y sistemas (ahora dentro del layout, hereda sidebar y topbar) */}
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SISTEMAS]} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/usuarios/nuevo" element={<CrearUsuarioPage />} />
          </Route>

          {/* Almacén: Administrador, Sistemas, Coordinador de Almacén y Facturación (el backend ya
              restringe qué puede escribir cada uno; aquí solo se controla quién ve el módulo) */}
          <Route
            element={
              <RoleRoute
                allowedRoles={[ROLES.ADMIN, ROLES.SISTEMAS, ROLES.COORDINADOR_DE_ALMACEN, ROLES.FACTURACION]}
              />
            }
          >
            <Route path="/almacen/dashboard" element={<AlmacenDashboardPage />} />
            <Route path="/almacen/movimientos" element={<AlmacenMovimientosPage />} />
            <Route path="/almacen/clientes" element={<AlmacenClientesPage />} />
            <Route path="/almacen/productos" element={<AlmacenProductosPage />} />
            <Route path="/almacen/ubicaciones" element={<AlmacenUbicacionesPage />} />
            <Route path="/almacen/facturacion" element={<AlmacenFacturacionPage />} />
          </Route>

        </Route>

      </Route>
    </Routes>
  );
}

export default App;