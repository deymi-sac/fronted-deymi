import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  const [colapsado, setColapsado] = useState(false);
  const [menuMobileAbierto, setMenuMobileAbierto] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FC]">
      <Sidebar
        colapsado={colapsado}
        onToggle={() => setColapsado((prev) => !prev)}
        abiertoMobile={menuMobileAbierto}
        onCerrarMobile={() => setMenuMobileAbierto(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onAbrirMenuMobile={() => setMenuMobileAbierto(true)} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}