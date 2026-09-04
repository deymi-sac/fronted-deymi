import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  const [colapsado, setColapsado] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8F9FC]">
      <Sidebar colapsado={colapsado} onToggle={() => setColapsado((prev) => !prev)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}