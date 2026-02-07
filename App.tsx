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
  { path: "/pos", label: "Kasir", icon: "fa-solid fa-cart-shopping", roles: ["owner", "staff"] },
  { path: "/products", label: "Stok Barang", icon: "fa-solid fa-box", roles: ["owner"] },
  { path: "/procurement", label: "Stok Masuk", icon: "fa-solid fa-warehouse", roles: ["owner"] },
  { path: "/customers", label: "Pelanggan", icon: "fa-solid fa-users", roles: ["owner", "staff"] },
  { path: "/debt-book", label: "Buku Hutang", icon: "fa-solid fa-book-bookmark", roles: ["owner", "staff"] },
  { path: "/rewards", label: "Reward Member", icon: "fa-solid fa-gift", roles: ["owner", "staff"] },
  { path: "/suppliers", label: "Supplier", icon: "fa-solid fa-truck-field", roles: ["owner"] },
  { path: "/reports", label: "Laporan", icon: "fa-solid fa-file-invoice-dollar", roles: ["owner"] },
  { path: "/settings", label: "Pengaturan", icon: "fa-solid fa-gears", roles: ["owner"] },
];

const SidebarItem = ({ path, label, icon, isCollapsed, isMobile }: any) => (
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
    {(!isCollapsed || isMobile) && <span className="text-[13px] font-medium uppercase tracking-tight">{label}</span>}
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
        <div className="h-16 flex items-center px-4 border-b border-black/20 text-white font-bold tracking-tighter text-xl">{isSidebarOpen ? "TOKO TUM" : "TT"}</div>

        {/* User Profile Mini */}
        {isSidebarOpen && (
          <div className="p-4 flex items-center gap-3 border-b border-black/10">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">
              <i className="fa-solid fa-user"></i>
            </div>
            <span className="text-slate-300 text-xs font-medium truncate">{profile?.displayName || "Admin"}</span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
          {allowedNav.map((item) => (
            <SidebarItem key={item.path} {...item} isCollapsed={!isSidebarOpen} isMobile={isMobile} />
          ))}
        </nav>

        <div className="p-2 border-t border-black/20 bg-black/10">
          <button onClick={handleLogout} className="w-full py-2.5 text-xs font-black text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <i className="fa-solid fa-right-from-bracket"></i>
            {isSidebarOpen && <span>SIGN OUT</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* White Navbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
              <i className="fa-solid fa-bars"></i>
            </button>
            <h1 className="font-bold text-slate-800 hidden sm:block">{NAV_ITEMS.find((i) => i.path === location.pathname)?.label || "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end hidden md:block">
              <span className="text-[10px] font-bold text-slate-400 leading-none">WARUNG ACTIVE</span>
              <span className="text-xs font-black text-blue-600">{profile?.warungId || "W-XXXXXX"}</span>
            </div>
            <button className="w-8 h-8 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center">
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
