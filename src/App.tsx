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
          {/* Solo administrador (ahora dentro del layout, hereda sidebar y topbar) */}
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/usuarios/nuevo" element={<CrearUsuarioPage />} />
          </Route>

        </Route>

      </Route>
    </Routes>
  );
}

export default App;