import React, { useState, useEffect, useMemo } from "react";
import { db } from "../services/db";
import { PointReward, PointHistory, Customer, UserProfile } from "../types";
import { Button, Input, Modal, Card, Badge } from "../components/UI";

const Loyalty: React.FC = () => {
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(db.getUserProfile());

  const [isModalRewardOpen, setIsModalRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Partial<PointReward>>({});

  const [isModalRedeemOpen, setIsModalRedeemOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState("");

  useEffect(() => {
    refresh();
    const handleUp = () => refresh();
    window.addEventListener("rewards-updated", handleUp);
    window.addEventListener("point-history-updated", handleUp);
    window.addEventListener("customers-updated", handleUp);
    return () => {
      window.removeEventListener("rewards-updated", handleUp);
      window.removeEventListener("point-history-updated", handleUp);
      window.removeEventListener("customers-updated", handleUp);
    };
  }, []);

  const refresh = () => {
    setRewards(db.getPointRewards());
    setHistory(db.getPointHistory());
    setCustomers(db.getCustomers().filter((c) => c.isMember));
  };

  const handleSaveReward = () => {
    if (!editingReward.name || !editingReward.pointsNeeded) return;
    const r: PointReward = {
      id: editingReward.id || `REW-${Date.now()}`,
      name: editingReward.name,
      pointsNeeded: Number(editingReward.pointsNeeded),
      stock: Number(editingReward.stock || 0),
      description: editingReward.description || "",
    };
    db.savePointReward(r);
    setIsModalRewardOpen(false);
  };

  const handleRedeem = async () => {
    if (!selectedCustId || !selectedRewardId) return;
    try {
      await db.redeemReward(selectedCustId, selectedRewardId);
      alert("Penukaran poin berhasil!");
      setIsModalRedeemOpen(false);
      setSelectedCustId("");
      setSelectedRewardId("");
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Program Loyalitas</h1>
          <p className="text-sm text-slate-500">Katalog hadiah dan riwayat poin member</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsModalRedeemOpen(true)} icon="fa-solid fa-gift">
            Proses Penukaran
          </Button>
          {profile?.role === "owner" && (
            <Button
              onClick={() => {
                setEditingReward({ stock: 10 });
                setIsModalRewardOpen(true);
              }}
              icon="fa-plus"
            >
              Hadiah Baru
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Katalog Hadiah */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-list-check text-blue-500"></i> Katalog Hadiah
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((r) => (
              <Card key={r.id} className="p-4 border-l-4 border-l-amber-400">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800">{r.name}</h4>
                  {profile?.role === "owner" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingReward(r);
                          setIsModalRewardOpen(true);
                        }}
                        className="text-blue-500 p-1"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button onClick={() => db.deletePointReward(r.id)} className="text-red-400 p-1">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Dibutuhkan</p>
                    <p className="text-lg font-black text-amber-600">{r.pointsNeeded.toLocaleString("id-ID")} PTS</p>
                  </div>
                  <Badge color={r.stock > 0 ? "green" : "red"}>Stok: {r.stock}</Badge>
                </div>
              </Card>
            ))}
            {rewards.length === 0 && (
              <div className="col-span-full py-10 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 italic">Belum ada hadiah terdaftar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Riwayat Poin */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-history text-indigo-500"></i> Aktivitas Poin
          </h3>
          <Card className="max-h-[60vh] overflow-y-auto no-scrollbar">
            <div className="divide-y">
              {history.map((h) => (
                <div key={h.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-700">{h.customerName}</span>
                    <span className={`text-xs font-black ${h.type === "earn" ? "text-green-600" : "text-red-600"}`}>
                      {h.type === "earn" ? "+" : "-"} {h.points.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] text-slate-400">{h.type === "earn" ? "Belanja" : "Tukar Hadiah"}</span>
                    <span className="text-[9px] text-slate-400">{new Date(h.timestamp).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
              ))}
              {history.length === 0 && <p className="p-6 text-center text-xs text-slate-400 italic">Belum ada aktivitas.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Hadiah Baru */}
      <Modal isOpen={isModalRewardOpen} onClose={() => setIsModalRewardOpen(false)} title="Detail Hadiah">
        <div className="space-y-4">
          <Input label="Nama Hadiah" value={editingReward.name || ""} onChange={(e) => setEditingReward({ ...editingReward, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            {/* FIX: Cast input value to Number */}
            <Input label="Poin Dibutuhkan" type="number" value={editingReward.pointsNeeded || ""} onChange={(e) => setEditingReward({ ...editingReward, pointsNeeded: Number(e.target.value) })} />
            <Input label="Stok Hadiah" type="number" value={editingReward.stock || ""} onChange={(e) => setEditingReward({ ...editingReward, stock: Number(e.target.value) })} />
          </div>
          <Input label="Deskripsi" value={editingReward.description || ""} onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })} />
          <Button className="w-full" onClick={handleSaveReward}>
            Simpan Hadiah
          </Button>
        </div>
      </Modal>

      {/* Modal Proses Tukar Poin */}
      <Modal isOpen={isModalRedeemOpen} onClose={() => setIsModalRedeemOpen(false)} title="Penukaran Hadiah">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Pilih Member</label>
            <select className="w-full p-2 border rounded-lg text-sm" value={selectedCustId} onChange={(e) => setSelectedCustId(e.target.value)}>
              <option value="">-- Cari Member --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.pointsBalance.toLocaleString("id-ID")} PTS)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Pilih Hadiah</label>
            <select className="w-full p-2 border rounded-lg text-sm" value={selectedRewardId} onChange={(e) => setSelectedRewardId(e.target.value)}>
              <option value="">-- Pilih Hadiah --</option>
              {rewards
                .filter((r) => r.stock > 0)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.pointsNeeded.toLocaleString("id-ID")} PTS)
                  </option>
                ))}
            </select>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-[10px] text-amber-700 italic">Pastikan member membawa kartu member/identitas fisik sebelum proses tukar poin dilakukan.</div>
          <Button className="w-full py-3" onClick={handleRedeem} disabled={!selectedCustId || !selectedRewardId}>
            Konfirmasi Tukar Hadiah
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Loyalty;
