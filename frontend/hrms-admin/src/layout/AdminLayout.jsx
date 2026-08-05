import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import logoMark from "@/assets/logo-mark.svg";

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <img
          src={logoMark}
          alt=""
          className="brand-watermark w-[28rem] max-w-[70vw] -right-24 -bottom-24 z-0"
        />
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
