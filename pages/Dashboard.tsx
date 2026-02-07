import React, { useEffect, useState } from "react";
import { db } from "../services/db";
import { Transaction, Product, UserProfile } from "../types";
import { Card, Badge, Button } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    totalTransactions: 0,
    lowStockCount: 0,
    todayMethods: { cash: 0, qris: 0, debt: 0 },
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(db.getUserProfile());

  useEffect(() => {
    refreshData();
    const handleTxUpdate = () => refreshData();
    const handleProdUpdate = () => refreshData();

    window.addEventListener("transactions-updated", handleTxUpdate);
    window.addEventListener("products-updated", handleProdUpdate);

    return () => {
      window.removeEventListener("transactions-updated", handleTxUpdate);
      window.removeEventListener("products-updated", handleProdUpdate);
    };
  }, []);

  const refreshData = () => {
    const transactions = db.getTransactions();
    const products = db.getProducts();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const todayTx = transactions.filter((t) => t.timestamp >= startOfDay);
    const lowStock = products.filter((p) => p.stock <= (p.minStockAlert || 5)).length;

    const todayMethods = {
      cash: todayTx.filter((t) => t.paymentMethod === "cash" || t.paymentMethod === "split").reduce((sum, t) => sum + (t.paymentMethod === "split" ? t.cashPaid || 0 : t.totalAmount), 0),
      qris: todayTx.filter((t) => t.paymentMethod === "qris").reduce((sum, t) => sum + t.totalAmount, 0),
      debt: todayTx.reduce((sum, t) => sum + (t.paymentMethod === "debt" ? t.totalAmount : t.debtAmount || 0), 0),
    };

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const daySales = transactions.filter((t) => t.timestamp >= dayStart && t.timestamp < dayEnd).reduce((sum, t) => sum + t.totalAmount, 0);

      last7Days.push({
        name: d.toLocaleDateString("id-ID", { weekday: "short" }),
        sales: daySales,
      });
    }

    setStats({
      todaySales: todayTx.reduce((sum, t) => sum + t.totalAmount, 0),
      monthSales: transactions.filter((t) => t.timestamp >= startOfMonth).reduce((sum, t) => sum + t.totalAmount, 0),
      totalTransactions: transactions.length,
      lowStockCount: lowStock,
      todayMethods,
    });
    setChartData(last7Days);
  };

  const formatRp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Halo, {profile?.displayName || "Admin"}! 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Berikut adalah ringkasan performa warung Anda hari ini.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} icon="fa-solid fa-rotate">
            Refresh
          </Button>
          <Button size="sm" icon="fa-solid fa-plus" onClick={() => (window.location.hash = "#/pos")}>
            Transaksi Baru
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-brand-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Omzet Hari Ini</p>
          <p className="text-2xl font-black text-slate-900">{formatRp(stats.todaySales)}</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Omzet Bulan Ini</p>
          <p className="text-2xl font-black text-slate-900">{formatRp(stats.monthSales)}</p>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Transaksi</p>
          <p className="text-2xl font-black text-slate-900">{stats.totalTransactions.toLocaleString("id-ID")}</p>
        </Card>
        <Card className={`border-l-4 ${stats.lowStockCount > 0 ? "border-l-red-500 bg-red-50" : "border-l-slate-200"}`}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stok Menipis</p>
          <p className={`text-2xl font-black ${stats.lowStockCount > 0 ? "text-red-600" : "text-slate-900"}`}>
            {stats.lowStockCount} <span className="text-xs font-normal text-slate-400">Item</span>
          </p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Trend Penjualan (7 Hari)</h3>
            <Badge color="brand">REALTIME</Badge>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} formatter={(value: number) => [formatRp(value), "Penjualan"]} />
                <Area type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-6">Metode Pembayaran (Hari Ini)</h3>
          <div className="space-y-6">
            <MethodItem label="Tunai" amount={stats.todayMethods.cash} total={stats.todaySales} color="bg-brand-500" />
            <MethodItem label="QRIS" amount={stats.todayMethods.qris} total={stats.todaySales} color="bg-emerald-500" />
            <MethodItem label="Hutang" amount={stats.todayMethods.debt} total={stats.todaySales} color="bg-red-500" />
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 italic text-center">Data diperbarui otomatis setiap transaksi</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

const MethodItem = ({ label, amount, total, color }: any) => {
  const percent = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

export default Dashboard;
