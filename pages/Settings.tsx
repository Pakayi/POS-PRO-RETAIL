import React, { useState, useEffect } from "react";
import { db } from "../services/db";
import { AppSettings, UserProfile } from "../types";
import { Button, Input, Card, Toast, Badge, Modal } from "../components/UI";
import { printerService } from "../services/printer";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    storeName: "",
    storeAddress: "",
    storePhone: "",
    enableTax: false,
    taxRate: 0,
    footerMessage: "",
    showLogo: true,
    logoUrl: null,
    securityPin: null,
    printerName: null,
    tierDiscounts: { bronze: 0, silver: 0, gold: 0 },
    enablePoints: true,
    pointValue: 1000,
    tierMultipliers: { bronze: 1, silver: 1, gold: 1 },
  });

  const [profile, setProfile] = useState<UserProfile | null>(db.getUserProfile());
  const [isSaved, setIsSaved] = useState(false);
  const [showAutoSaveToast, setShowAutoSaveToast] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<"disconnected" | "connected">("disconnected");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const s = db.getSettings();
    if (s) setSettings(s);
    setProfile(db.getUserProfile());
    if (printerService.isConnected()) {
      setPrinterStatus("connected");
    }
  }, []);

  const handleSave = () => {
    db.saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const copyWarungId = () => {
    if (profile?.warungId) {
      navigator.clipboard.writeText(profile.warungId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Logo = reader.result as string;
        const newSettings = { ...settings, logoUrl: base64Logo };
        setSettings(newSettings);
        db.saveSettings(newSettings);
        setShowAutoSaveToast(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInjectDemo = async () => {
    if (confirm("PERHATIAN: Ini akan MENGHAPUS semua data Anda saat ini dan menggantinya dengan data demo (Produk, Transaksi, Member). Lanjutkan?")) {
      setIsProcessing(true);
      try {
        await db.injectDemoData();
        alert("Injeksi Data Demo Berhasil!");
        window.location.reload();
      } catch (e: any) {
        alert("Gagal injeksi: " + e.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleWipeData = async () => {
    if (confirm("PERHATIAN: Ini akan MENGHAPUS PERMANEN semua data warung Anda. Tindakan ini tidak bisa dibatalkan! Ketik 'HAPUS' untuk konfirmasi.")) {
      const confirmText = prompt("Ketik HAPUS untuk konfirmasi:");
      if (confirmText === "HAPUS") {
        setIsProcessing(true);
        try {
          await db.wipeAllData();
          alert("Database berhasil dibersihkan.");
          window.location.reload();
        } catch (e: any) {
          alert("Gagal hapus: " + e.message);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  const handleConnectPrinter = async () => {
    setIsConnectingPrinter(true);
    try {
      const name = await printerService.connect();
      const newSettings = { ...settings, printerName: name };
      setSettings(newSettings);
      db.saveSettings(newSettings);
      setPrinterStatus("connected");
    } catch (e: any) {
      if (e.message !== "Pencarian dibatalkan.") alert(e.message);
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengaturan Warung</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge color={profile?.role === "owner" ? "blue" : "green"}>Role: {profile?.role?.toUpperCase()}</Badge>
          </div>
        </div>
        <Button onClick={handleSave} icon="fa-save" className={isSaved ? "bg-green-600" : ""}>
          {isSaved ? "Tersimpan!" : "Simpan Perubahan"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* IDENTITAS WARUNG */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
              <i className="fa-solid fa-store text-blue-500"></i> Profil Warung
            </h2>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-20 h-20 bg-white rounded-xl border flex items-center justify-center overflow-hidden shadow-inner">
                {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <i className="fa-solid fa-camera text-gray-300 text-2xl"></i>}
              </div>
              <div>
                <label className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold cursor-pointer shadow-sm hover:bg-gray-50 transition-colors">
                  Ganti Logo <input type="file" className="hidden" onChange={handleLogoUpload} />
                </label>
                <p className="text-[10px] text-gray-400 mt-2 italic">Format: JPG/PNG, Max: 1MB</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nama Toko" value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} />
              <Input label="Nomor Telepon" value={settings.storePhone} onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })} />
            </div>
            <Input label="Alamat Lengkap" value={settings.storeAddress} onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })} />
            <Input label="Pesan Kaki Struk (Footer)" value={settings.footerMessage} onChange={(e) => setSettings({ ...settings, footerMessage: e.target.value })} />
          </Card>

          {/* KONFIGURASI POIN MEMBER */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
              <i className="fa-solid fa-star text-amber-500"></i> Loyalty Program (Poin)
            </h2>
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900">Aktifkan Program Poin</p>
                <p className="text-[10px] text-blue-700 italic">Berikan poin otomatis kepada member saat transaksi di kasir.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.enablePoints} onChange={(e) => setSettings({ ...settings, enablePoints: e.target.checked })} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="max-w-xs">
              <Input label="Nilai Belanja per 1 Poin (Rp)" type="number" value={settings.pointValue} onChange={(e) => setSettings({ ...settings, pointValue: Number(e.target.value) })} prefix="Rp" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Multiplier Poin per Level</label>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Bronze (x)" type="number" step="0.1" value={settings.tierMultipliers.bronze} onChange={(e) => setSettings({ ...settings, tierMultipliers: { ...settings.tierMultipliers, bronze: Number(e.target.value) } })} />
                <Input label="Silver (x)" type="number" step="0.1" value={settings.tierMultipliers.silver} onChange={(e) => setSettings({ ...settings, tierMultipliers: { ...settings.tierMultipliers, silver: Number(e.target.value) } })} />
                <Input label="Gold (x)" type="number" step="0.1" value={settings.tierMultipliers.gold} onChange={(e) => setSettings({ ...settings, tierMultipliers: { ...settings.tierMultipliers, gold: Number(e.target.value) } })} />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg italic">* Tips: Atur Gold lebih tinggi (misal: 1.5) supaya pelanggan lebih termotivasi belanja banyak.</p>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* WARUNG ID & SECURITY */}
          <Card className="p-6 bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-blue-400">Warung ID</h3>
              <i className="fa-solid fa-key text-slate-700"></i>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm flex items-center overflow-hidden">
                <span className="truncate">{profile?.warungId || "Loading..."}</span>
              </div>
              <Button onClick={copyWarungId} variant="secondary" size="sm" className="bg-slate-700 border-none shrink-0 hover:bg-slate-600">
                <i className={`fa-solid ${copiedId ? "fa-check text-green-400" : "fa-copy"}`}></i>
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 italic mb-6">Kasir butuh ID ini untuk mendaftar ke toko Anda.</p>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Proteksi Aplikasi</h3>
              <Input
                label="PIN Keamanan (6 Digit)"
                type="password"
                maxLength={6}
                value={settings.securityPin || ""}
                onChange={(e) => setSettings({ ...settings, securityPin: e.target.value })}
                placeholder="Kosongkan jika tanpa PIN"
                className="!bg-slate-800 !border-slate-700 !text-white placeholder:text-slate-600"
              />
              <p className="text-[9px] text-slate-500">PIN akan diminta saat membuka menu Laporan atau Pengaturan.</p>
            </div>
          </Card>

          {/* PRINTER SETTINGS */}
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <i className="fa-solid fa-print text-slate-400"></i> Printer Struk
            </h3>
            <div className={`p-3 rounded-xl border flex items-center justify-between ${printerStatus === "connected" ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                <p className={`text-xs font-bold ${printerStatus === "connected" ? "text-emerald-600" : "text-gray-500"}`}>{printerStatus === "connected" ? "TERSAMBUNG" : "TERPUTUS"}</p>
              </div>
              <Button size="sm" variant={printerStatus === "connected" ? "secondary" : "primary"} onClick={handleConnectPrinter} disabled={isConnectingPrinter}>
                {isConnectingPrinter ? <i className="fa-solid fa-spinner fa-spin"></i> : printerStatus === "connected" ? "Ganti" : "Cari"}
              </Button>
            </div>
            {settings.printerName && <p className="text-[10px] text-gray-400 text-center font-mono">{settings.printerName}</p>}
          </Card>

          {/* DANGER ZONE / MOCK DATA */}
          <Card className="p-6 border-red-100 bg-red-50/30 space-y-4">
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i> Danger Zone
            </h3>
            <div className="space-y-2">
              <Button onClick={handleInjectDemo} disabled={isProcessing} variant="outline" className="w-full text-blue-600 border-blue-200 bg-white hover:bg-blue-50 text-xs font-bold" icon="fa-solid fa-flask">
                INJEKSI DATA DEMO
              </Button>
              <Button onClick={handleWipeData} disabled={isProcessing} variant="danger" className="w-full text-xs font-bold" icon="fa-solid fa-trash-can">
                BERSIHKAN DATABASE
              </Button>
            </div>
            <p className="text-[9px] text-red-400 text-center italic">Gunakan Data Demo untuk mencoba semua fitur aplikasi dengan cepat.</p>
          </Card>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <Card className="p-8 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-bold">Sedang memproses...</p>
          </Card>
        </div>
      )}

      <Toast isOpen={showAutoSaveToast} onClose={() => setShowAutoSaveToast(false)} type="success" message="Logo warung berhasil diperbarui!" />
    </div>
  );
};

export default Settings;
