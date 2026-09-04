import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-[#F8F9FC]">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}