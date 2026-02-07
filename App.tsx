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
  { path: "/", label: "Dashboard", icon: "fa-solid fa-gauge-high", roles: ["owner", "staff"] },
  { path: "/suppliers", label: "Supplier", icon: "fa-solid fa-truck-field", roles: ["owner"] },
  { path: "/customers", label: "Pelanggan", icon: "fa-solid fa-users", roles: ["owner", "staff"] },
  { path: "/products", label: "Produk", icon: "fa-solid fa-box", roles: ["owner"], subItems: true },
  { path: "/procurement", label: "Stok", icon: "fa-solid fa-warehouse", roles: ["owner"], subItems: true },
  { path: "/pos", label: "Transaksi", icon: "fa-solid fa-cart-shopping", roles: ["owner", "staff"] },
  { path: "/reports", label: "Laporan", icon: "fa-solid fa-file-invoice", roles: ["owner"], subItems: true },
];

const SidebarItem = ({ path, label, icon, isCollapsed, isMobile, subItems }: any) => (
  <NavLink
    to={path}
    className={({ isActive }) => `
      sidebar-link flex items-center gap-3 px-4 py-3 transition-all duration-200 border-b border-black/10
      ${isActive ? "active" : "text-slate-300 hover:bg-black/20 hover:text-white"}
    `}
  >
    <div className="w-5 text-center text-sm">
      <i className={icon}></i>
    </div>
    {(!isCollapsed || isMobile) && (
      <div className="flex-1 flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        {subItems && <i className="fa-solid fa-chevron-left text-[10px] opacity-50"></i>}
      </div>
    )}
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">Loading...</div>;

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
    <div className="flex h-screen bg-[#f4f6f9] overflow-hidden">
      <OfflineIndicator />

      {/* Dark Sidebar */}
      <aside className={`bg-dashboard-sidebar transition-all duration-300 flex flex-col z-40 ${isSidebarOpen ? "w-64" : "w-16"}`}>
        <div className="h-16 flex items-center px-4 border-b border-black/20 text-white font-bold tracking-tight">{isSidebarOpen ? "Toko Tum" : "TT"}</div>

        {/* User Profile Mini */}
        {isSidebarOpen && (
          <div className="p-4 flex items-center gap-3 border-b border-black/10">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">
              <i className="fa-solid fa-user"></i>
            </div>
            <span className="text-slate-300 text-xs font-medium truncate">{profile?.displayName || "Admin"}</span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto no-scrollbar">
          {allowedNav.map((item) => (
            <SidebarItem key={item.path} {...item} isCollapsed={!isSidebarOpen} isMobile={isMobile} />
          ))}
        </nav>

        <div className="p-2 border-t border-black/20">
          <button onClick={handleLogout} className="w-full py-2 text-xs font-bold text-red-400 hover:bg-black/20 rounded-lg">
            {isSidebarOpen ? "SIGN OUT" : <i className="fa-solid fa-right-from-bracket"></i>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* White Navbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <i className="fa-solid fa-bars"></i>
            </button>
            <h1 className="font-bold text-slate-800 hidden sm:block">{NAV_ITEMS.find((i) => i.path === location.pathname)?.label || "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600">
              <i className="fa-solid fa-user"></i>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#f4f6f9]">
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
