"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, LogOut } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Forecasting", href: "/forecasting", icon: TrendingUp },
];

export default function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean, setIsOpen?: (val: boolean) => void }) {
  const pathname = usePathname();

  return (
    <aside 
      className={clsx(
        "w-64 h-screen fixed top-0 left-0 bg-ivory/95 lg:bg-transparent lg:glass-card rounded-none border-r border-saffron/30 flex flex-col justify-between z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div>
        <div className="p-6 hidden lg:block">
          <h1 className="text-2xl font-bold text-terracotta">Inventory <span className="text-saffron">AI</span></h1>
        </div>
        <div className="p-6 lg:hidden flex justify-between items-center border-b border-saffron/30">
          <h1 className="text-2xl font-bold text-terracotta">Menu</h1>
        </div>
        <nav className="mt-6 flex flex-col gap-2 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen && setIsOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all",
                  isActive
                    ? "bg-terracotta text-white shadow-md"
                    : "text-indigo hover:bg-saffron/10"
                )}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-saffron/30">
         <button 
           onClick={() => {
             localStorage.removeItem("token");
             window.location.href = "/login";
           }}
           className="flex items-center gap-3 w-full px-4 py-3 text-indigo hover:bg-terracotta hover:text-white rounded-lg transition-all font-medium"
         >
            <LogOut size={20} />
            Logout
         </button>
      </div>
    </aside>
  );
}
