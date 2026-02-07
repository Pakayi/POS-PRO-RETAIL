import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
// FIX: Using CDN URL for firebase/auth to ensure exports like onAuthStateChanged and signOut are available
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

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "fa-solid fa-house", roles: ["owner", "staff"] },
  { path: "/pos", label: "Kasir", icon: "fa-solid fa-calculator", roles: ["owner", "staff"] },
  { path: "/products", label: "Stok Barang", icon: "fa-solid fa-boxes-stacked", roles: ["owner"] },
  { path: "/customers", label: "Pelanggan", icon: "fa-solid fa-address-book", roles: ["owner", "staff"] },
  { path: "/settings", label: "Pengaturan", icon: "fa-solid fa-sliders", roles: ["owner"] },
];

const SidebarItem = ({ path, label, icon, isCollapsed, isMobile }: any) => (
  <NavLink
    to={path}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 mb-1 group
      ${isActive ? "bg-brand-600 text-white shadow-lg shadow-brand-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}
    `}
  >
    <div className={`w-5 text-center text-lg ${!isCollapsed || isMobile ? "" : "mx-auto"}`}>
      <i className={`${icon}`}></i>
    </div>
    {(!isCollapsed || isMobile) && <span className="font-bold text-sm tracking-tight">{label}</span>}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold text-sm animate-pulse tracking-widest uppercase">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
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
  const [profile, setProfile] = useState<UserProfile | null>(db.getUserProfile());
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    if (confirm("Keluar dari sistem?")) signOut(auth);
  };

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(profile?.role || "staff"));

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <OfflineIndicator />

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 
          transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? "w-72 translate-x-0" : isMobile ? "-translate-x-full w-72" : "w-24"}
        `}
      >
        <div className="h-20 flex items-center px-6 mb-4 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-200 shrink-0">
              <i className="fa-solid fa-bolt-lightning text-xl"></i>
            </div>
            {(isSidebarOpen || isMobile) && (
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 tracking-tight leading-none text-lg">
                  WARUNG<span className="text-brand-600">PRO</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Retail System</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            {allowedNav.map((item) => (
              <SidebarItem key={item.path} {...item} isCollapsed={!isSidebarOpen} isMobile={isMobile} />
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm ${!isSidebarOpen && !isMobile ? "justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-brand-600 font-bold text-lg border border-slate-200 shrink-0 uppercase">{profile?.displayName?.charAt(0) || user.email?.charAt(0)}</div>
            {(isSidebarOpen || isMobile) && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{profile?.displayName || "Admin"}</p>
                <Badge color={profile?.role === "owner" ? "brand" : "green"}>{profile?.role}</Badge>
              </div>
            )}
          </div>
          {(isSidebarOpen || isMobile) && (
            <button onClick={handleLogout} className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              Logout System
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Desktop & Mobile */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-6 justify-between shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-white hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
            >
              <i className={`fa-solid ${isSidebarOpen ? "fa-indent" : "fa-outdent"}`}></i>
            </button>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">{NAV_ITEMS.find((i) => i.path === location.pathname)?.label || "Warung POS"}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              System Online
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 relative">
              <i className="fa-regular fa-bell"></i>
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8 no-scrollbar bg-[#F8FAFC]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
