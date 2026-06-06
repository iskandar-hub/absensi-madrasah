"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function DashboardLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <Sidebar />

      <main className="main-content">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}