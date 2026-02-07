import React, { useEffect, useState, useMemo } from "react";
import { db } from "../services/db";
import { Transaction, Product, UserProfile, Procurement } from "../types";
import { Card, Badge, Button, StatCard } from "../components/UI";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    todaySalesCount: 0,
    todayProductsSold: 0,
    todayStockIn: 0,
    todayRevenue: 0,
  });
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener("transactions-updated", handleUpdate);
    window.addEventListener("products-updated", handleUpdate);
    window.addEventListener("procurements-updated", handleUpdate);
    return () => {
      window.removeEventListener("transactions-updated", handleUpdate);
      window.removeEventListener("products-updated", handleUpdate);
      window.removeEventListener("procurements-updated", handleUpdate);
    };
  }, []);

  const refreshData = () => {
    const transactions = db.getTransactions();
    const prods = db.getProducts();
    const procurements = db.getProcurements();
    setProducts(prods);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 1. Filter data hari ini
    const todayTx = transactions.filter((t) => t.timestamp >= startOfDay);
    const todayProc = procurements.filter((p) => p.timestamp >= startOfDay);

    // 2. Hitung Metrik
    const salesCount = todayTx.length;
    const revenue = todayTx.reduce((sum, t) => sum + t.totalAmount, 0);

    // Uniq products sold today
    const productsSoldSet = new Set();
    todayTx.forEach((t) => t.items.forEach((item) => productsSoldSet.add(item.productId)));
    const uniqueProductsSold = productsSoldSet.size;

    // Total stock entered today via Procurement
    const stockIn = todayProc.reduce((sum, p) => {
      return sum + p.items.reduce((s, i) => s + i.quantity, 0);
    }, 0);

    // 3. Data untuk Pie Chart (Top 5 Produk Terlaris Hari Ini)
    const productMap = new Map<string, { name: string; value: number }>();
    todayTx.forEach((t) => {
      t.items.forEach((item) => {
        const existing = productMap.get(item.productName) || { name: item.productName, value: 0 };
        productMap.set(item.productName, {
          name: item.productName,
          value: existing.value + item.quantity,
        });
      });
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    setStats({
      todaySalesCount: salesCount,
      todayProductsSold: uniqueProductsSold,
      todayStockIn: stockIn,
      todayRevenue: revenue,
    });
    setTopProductsData(topProducts);
  };

  const COLORS = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Overview</h1>
        <Button variant="outline" size="sm" onClick={refreshData} icon="fa-solid fa-sync">
          Refresh Data
        </Button>
      </div>

      {/* Row 1: Vibrant Stat Cards (Admin Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Transaksi Hari Ini" value={stats.todaySalesCount} icon="fa-solid fa-shopping-cart" color="cyan" onClick={() => (window.location.hash = "#/reports")} />
        <StatCard title="Produk Terjual Hari Ini" value={stats.todayProductsSold} icon="fa-solid fa-tags" color="amber" onClick={() => (window.location.hash = "#/pos")} />
        <StatCard title="Stok Masuk Hari Ini" value={stats.todayStockIn} icon="fa-solid fa-box" color="crimson" onClick={() => (window.location.hash = "#/procurements")} />
        <StatCard title="Omzet Hari Ini" value={`Rp ${stats.todayRevenue.toLocaleString("id-ID", { notation: "compact" })}`} icon="fa-solid fa-wallet" color="emerald" onClick={() => (window.location.hash = "#/reports")} />
      </div>

      {/* Row 2: Charts & Product List (Persis Gambar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart Produk Terlaris */}
        <Card variant="blue-header" className="min-h-[400px]">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest mb-6">Produk Terlaris (Hari Ini)</h3>
          <div className="h-[300px] w-full">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topProductsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm">
                <i className="fa-solid fa-chart-pie text-4xl mb-3 opacity-20"></i>
                Belum ada penjualan hari ini
              </div>
            )}
          </div>
        </Card>

        {/* List Stok Produk */}
        <Card variant="amber-header">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Status Stok Produk</h3>
            {/* FIX: Changed color from 'amber' to 'yellow' to match allowed Badge colors in components/UI.tsx */}
            <Badge color="yellow">Data Real-time</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 uppercase text-[10px] tracking-widest">
                  <th className="pb-3 font-bold">Nama Barang</th>
                  <th className="pb-3 font-bold text-right">Sisa Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products
                  .sort((a, b) => a.stock - b.stock)
                  .slice(0, 8)
                  .map((p, i) => (
                    <tr key={i} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-bold text-slate-700">{p.name}</td>
                      <td className={`py-3 text-right font-black ${p.stock <= p.minStockAlert ? "text-red-500" : "text-slate-900"}`}>
                        {p.stock} <span className="text-[10px] font-normal text-slate-400 uppercase ml-1">{p.baseUnit}</span>
                      </td>
                    </tr>
                  ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-10 text-center text-slate-400 italic">
                      Data produk kosong
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button onClick={() => (window.location.hash = "#/products")} className="w-full mt-4 py-2 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-brand-600 hover:text-white transition-all tracking-widest">
            Lihat Stok Lengkap <i className="fa-solid fa-arrow-right ml-1"></i>
          </button>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
