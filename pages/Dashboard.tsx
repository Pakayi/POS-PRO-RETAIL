import React, { useEffect, useState } from "react";
import { db } from "../services/db";
import { Transaction, Product, UserProfile } from "../types";
import { Card, StatCard, Badge } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    todaySalesCount: 0,
    lastTxProducts: 0,
    todayProcurementCount: 0,
    lowStockCount: 0,
  });
  const [pieData, setPieData] = useState<any[]>([]);
  const [stockList, setStockList] = useState<Product[]>([]);

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
    const procurements = db.getProcurements();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayTx = transactions.filter((t) => t.timestamp >= startOfDay);
    const todayProcurements = procurements.filter((p) => p.timestamp >= startOfDay);
    const lowStock = products.filter((p) => p.stock <= (p.minStockAlert || 5));

    // Get product distribution for pie chart (top 5)
    const productCounts: Record<string, number> = {};
    transactions.forEach((t) => {
      t.items.forEach((item) => {
        productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity;
      });
    });

    const pieRaw = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    setStats({
      todaySalesCount: todayTx.length,
      lastTxProducts: todayTx.length > 0 ? todayTx[0].items.length : 0,
      todayProcurementCount: todayProcurements.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0), 0),
      lowStockCount: lowStock.length,
    });
    setPieData(pieRaw);
    setStockList(products.slice(0, 10)); // Show top items
  };

  const COLORS = ["#ff7675", "#00b894", "#0984e3", "#fdcb6e", "#6c5ce7"];

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-normal text-slate-800">Dashboard</h1>

      {/* 3 Main Stat Cards (Matching Image) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Transaksi Hari Ini" value={stats.todaySalesCount} icon="fa-solid fa-shopping-cart" color="cyan" />
        <StatCard title="Produk Transaksi Terakhir" value={stats.lastTxProducts} icon="fa-solid fa-money-bill-1" color="amber" />
        <StatCard title="Stok Masuk Hari Ini" value={stats.todayProcurementCount} icon="fa-solid fa-box-open" color="crimson" />
      </div>

      <h2 className="text-2xl font-normal text-slate-800 pt-4">Grafik</h2>

      {/* Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pie Chart Section */}
        <Card variant="flat-blue" title="Produk Terlaris" noPadding>
          <div className="h-[300px] w-full p-4 flex flex-col">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={0} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-4 justify-center mt-2 border-t pt-4 border-slate-100">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-3 h-3" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-[11px] text-slate-600 truncate max-w-[100px]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Right: Stock List Section */}
        <Card variant="flat-amber" title="Stok Produk" noPadding>
          <div className="h-[300px] overflow-y-auto no-scrollbar">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                {stockList.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{p.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{p.stock}</td>
                  </tr>
                ))}
                {stockList.length === 0 && (
                  <tr>
                    <td className="p-10 text-center text-slate-400 italic">Belum ada stok data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
