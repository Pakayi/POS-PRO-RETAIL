import React, { useState, useEffect, useMemo } from "react";
import { db } from "../services/db";
import { Supplier, Product, Procurement } from "../types";
import { Button, Input, Modal, Card, Badge } from "../components/UI";

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [procurements, setProcurements] = useState<Procurement[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier>>({});
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    window.addEventListener("suppliers-updated", handleUpdate);
    window.addEventListener("products-updated", handleUpdate);
    return () => {
      window.removeEventListener("suppliers-updated", handleUpdate);
      window.removeEventListener("products-updated", handleUpdate);
    };
  }, []);

  const refresh = () => {
    setSuppliers(db.getSuppliers());
    setProducts(db.getProducts());
    setProcurements(db.getProcurements());
  };

  const handleSave = () => {
    if (!editingSupplier.name) return;
    const s: Supplier = {
      id: editingSupplier.id || `S-${Date.now()}`,
      name: editingSupplier.name,
      contact: editingSupplier.contact || "",
      address: editingSupplier.address || "",
      description: editingSupplier.description || "",
    };
    db.saveSupplier(s);
    setIsModalOpen(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus supplier ini?")) {
      db.deleteSupplier(id);
      refresh();
    }
  };

  const openDetail = (s: Supplier) => {
    setSelectedSupplier(s);
    setIsDetailOpen(true);
  };

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Menghitung statistik per supplier
  const supplierStats = useMemo(() => {
    const stats: Record<string, { totalProducts: number; totalSpend: number }> = {};
    suppliers.forEach((s) => {
      const supplierProducts = products.filter((p) => p.supplierId === s.id);
      const supplierProcurements = procurements.filter((pr) => pr.supplierId === s.id);
      const totalSpend = supplierProcurements.reduce((sum, pr) => sum + pr.totalAmount, 0);

      stats[s.id] = {
        totalProducts: supplierProducts.length,
        totalSpend: totalSpend,
      };
    });
    return stats;
  }, [suppliers, products, procurements]);

  // Varian warna untuk kartu
  const cardVariants: Array<"blue-header" | "green-header" | "amber-header" | "indigo-header"> = ["blue-header", "green-header", "amber-header", "indigo-header"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Supplier</h1>
          <p className="text-xs text-slate-500">Kelola mitra penyuplai barang warung</p>
        </div>
        <Button
          onClick={() => {
            setEditingSupplier({});
            setIsModalOpen(true);
          }}
          icon="fa-plus"
        >
          Tambah Supplier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s, idx) => {
          const stat = supplierStats[s.id] || { totalProducts: 0, totalSpend: 0 };
          const variant = cardVariants[idx % cardVariants.length];
          return (
            <Card key={s.id} variant={variant} className="flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-extrabold text-lg text-slate-800 line-clamp-1">{s.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingSupplier(s);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Produk</p>
                    <p className="font-black text-slate-700">
                      {stat.totalProducts} <span className="text-[10px] font-normal text-slate-400">SKU</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Belanja</p>
                    <p className="font-black text-brand-600">Rp {stat.totalSpend.toLocaleString("id-ID", { notation: "compact" })}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-600 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <i className="fa-brands fa-whatsapp"></i>
                    </div>
                    <span className="font-bold text-xs">{s.contact || "-"}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-location-dot"></i>
                    </div>
                    <span className="text-xs line-clamp-2 leading-relaxed">{s.address || "Alamat tidak tersedia"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => openDetail(s)} className="py-2.5 bg-brand-50 text-brand-700 text-center rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-100 transition-colors">
                  <i className="fa-solid fa-chart-pie mr-1"></i> Laporan
                </button>
                <a
                  href={`https://wa.me/${s.contact.replace(/\D/g, "")}`}
                  target="_blank"
                  className="py-2.5 bg-emerald-600 text-white text-center rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 shadow-sm shadow-emerald-200"
                >
                  <i className="fa-brands fa-whatsapp mr-1"></i> Order WA
                </a>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <i className="fa-solid fa-truck-fast text-4xl text-slate-200 mb-4"></i>
            <p className="text-slate-400 font-bold italic">Belum ada supplier yang terdaftar.</p>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier.id ? "Edit Data Supplier" : "Tambah Supplier Baru"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan Supplier</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nama Supplier" value={editingSupplier.name || ""} onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })} placeholder="Misal: PT. Indofood" />
          <Input label="Nomor WhatsApp" value={editingSupplier.contact || ""} onChange={(e) => setEditingSupplier({ ...editingSupplier, contact: e.target.value })} placeholder="08..." />
          <Input label="Alamat Kantor" value={editingSupplier.address || ""} onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })} />
          <Input label="Catatan / Info Tambahan" value={editingSupplier.description || ""} onChange={(e) => setEditingSupplier({ ...editingSupplier, description: e.target.value })} />
        </div>
      </Modal>

      {/* Modal Laporan Detail Supplier */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Laporan Penyuplai: ${selectedSupplier?.name}`}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-100">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Total Transaksi</p>
              <p className="text-2xl font-black">Rp {(supplierStats[selectedSupplier?.id || ""]?.totalSpend || 0).toLocaleString("id-ID")}</p>
            </div>
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Daftar Produk</p>
              <p className="text-2xl font-black">
                {supplierStats[selectedSupplier?.id || ""]?.totalProducts || 0} <span className="text-xs font-normal">SKU</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-box-open text-brand-500"></i> Daftar Produk dari Supplier ini
            </h4>
            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl divide-y">
              {products
                .filter((p) => p.supplierId === selectedSupplier?.id)
                .map((p) => (
                  <div key={p.id} className="p-4 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">{p.category}</p>
                    </div>
                    <Badge color={p.stock <= p.minStockAlert ? "red" : "blue"}>
                      {p.stock} {p.baseUnit}
                    </Badge>
                  </div>
                ))}
              {products.filter((p) => p.supplierId === selectedSupplier?.id).length === 0 && (
                <div className="p-10 text-center">
                  <p className="text-xs text-slate-400 italic">Belum ada produk yang dikaitkan dengan supplier ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Suppliers;
