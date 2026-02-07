import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./services/firebase";
import { db } from "./services/db";
import { OfflineIndicator, Badge } from "./components/UI";
import { UserProfile } from "./types";

// Pages
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Suppliers from "./pages/Suppliers";
import Procurement from "./pages/Procurement";
import DebtBook from "./pages/DebtBook";
import Rewards from "./pages/Rewards";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "fa-solid fa-house", roles: ["owner", "staff"] },
  { path: "/pos", label: "Kasir", icon: "fa-solid fa-calculator", roles: ["owner", "staff"] },
  { path: "/products", label: "Stok Barang", icon: "fa-solid fa-boxes-stacked", roles: ["owner"] },
  { path: "/procurement", label: "Stok Masuk", icon: "fa-solid fa-truck-loading", roles: ["owner"] },
  { path: "/customers", label: "Pelanggan", icon: "fa-solid fa-address-book", roles: ["owner", "staff"] },
  { path: "/debt-book", label: "Buku Hutang", icon: "fa-solid fa-file-invoice-dollar", roles: ["owner", "staff"] },
  { path: "/rewards", label: "Reward Member", icon: "fa-solid fa-gift", roles: ["owner", "staff"] },
  { path: "/suppliers", label: "Supplier", icon: "fa-solid fa-building", roles: ["owner"] },
  { path: "/reports", label: "Laporan", icon: "fa-solid fa-chart-line", roles: ["owner"] },
  { path: "/settings", label: "Pengaturan", icon: "fa-solid fa-sliders", roles: ["owner"] },
];

const SidebarItem = ({ path, label, icon, isCollapsed, isMobile }: any) => (
  <NavLink
    to={path}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1
      ${isActive ? "bg-brand-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}
    `}
  >
    <div className="w-5 text-center">
      <i className={icon}></i>
    </div>
    {(!isCollapsed || isMobile) && <span className="font-bold text-xs uppercase tracking-wider">{label}</span>}
  </NavLink>
);

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <HashRouter>
      {!user ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Layout user={user} />
      )}
    </HashRouter>
  );
};

const Layout: React.FC<{ user: any }> = ({ user }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const profile = db.getUserProfile();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => signOut(auth);

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(profile?.role || "staff"));

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <OfflineIndicator />
      <aside className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col ${isSidebarOpen ? "w-64" : "w-20"}`}>
        <div className="p-6 font-black text-xl text-brand-600">WARUNGPRO</div>
        <nav className="flex-1 px-4 overflow-y-auto">
          {allowedNav.map((item) => (
            <SidebarItem key={item.path} {...item} isCollapsed={!isSidebarOpen} isMobile={isMobile} />
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg">
            LOGOUT
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-100 rounded-lg">
            <i className="fa-solid fa-bars"></i>
          </button>
          <h1 className="font-bold text-slate-800">{NAV_ITEMS.find((i) => i.path === location.pathname)?.label}</h1>
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold uppercase">{profile?.displayName?.charAt(0)}</div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<Products />} />
            <Route path="/procurement" element={<Procurement />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/debt-book" element={<DebtBook />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
