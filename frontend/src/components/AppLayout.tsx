"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { Plus, Menu } from "lucide-react";
import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent relative overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-ivory/90 backdrop-blur border-b border-saffron/30 fixed top-0 w-full z-40 shadow-sm">
        <h1 className="text-xl font-bold text-terracotta">Inventory <span className="text-saffron">AI</span></h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-indigo p-2 focus:outline-none">
          <Menu size={24} />
        </button>
      </div>

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-indigo/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 mt-16 lg:mt-0 w-full max-w-[100vw] overflow-x-hidden">
        {children}
      </main>
      
      {/* Quick Add FAB */}
      <div className="fixed bottom-4 right-4 lg:bottom-8 lg:right-8 group z-30">
        <Link href="/sales" className="flex items-center justify-center w-14 h-14 bg-terracotta text-white rounded-full shadow-lg hover:bg-saffron hover:scale-105 transition-all">
          <Plus size={24} />
        </Link>
        <span className="hidden lg:block absolute -top-10 right-0 w-max bg-indigo text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Quick Sale
        </span>
      </div>
    </div>
  );
}
