import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../services/db";
import { Product, ProductUnit, CartItem, Transaction, AppSettings, Customer } from "../types";
import { Button, Input, Modal, Card, Badge } from "../components/UI";

const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "debt" | "split">("cash");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());

  useEffect(() => {
    setProducts(db.getProducts());
    setSettings(db.getSettings());
    setAllCustomers(db.getCustomers());

    const handleProducts = () => setProducts(db.getProducts());
    const handleSettings = () => setSettings(db.getSettings());
    const handleCustomers = () => setAllCustomers(db.getCustomers());

    window.addEventListener("products-updated", handleProducts);
    window.addEventListener("settings-updated", handleSettings);
    window.addEventListener("customers-updated", handleCustomers);

    return () => {
      window.removeEventListener("products-updated", handleProducts);
      window.removeEventListener("settings-updated", handleSettings);
      window.removeEventListener("customers-updated", handleCustomers);
    };
  }, []);

  const addToCart = (product: Product, unit: ProductUnit) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.unitName === unit.name);
      if (existing) {
        return prev.map((item) => (item.productId === product.id && item.unitName === unit.name ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitName: unit.name,
          price: unit.price,
          buyPrice: unit.buyPrice || 0,
          conversion: unit.conversion,
          quantity: 1,
        },
      ];
    });
  };

  const calculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountRate = 0;
    if (selectedCustomer) {
      const discounts = settings.tierDiscounts || { bronze: 0, silver: 2, gold: 5 };
      discountRate = (discounts[selectedCustomer.tier.toLowerCase() as keyof typeof discounts] || 0) / 100;
    }
    const discountAmount = subtotal * discountRate;
    const total = subtotal - discountAmount;
    let pointsEarned = 0;
    if (selectedCustomer?.isMember && settings.enablePoints) {
      const basePoints = Math.floor(total / settings.pointValue);
      const multiplier = settings.tierMultipliers[selectedCustomer.tier.toLowerCase() as keyof typeof settings.tierMultipliers] || 1;
      pointsEarned = Math.floor(basePoints * multiplier);
    }
    return { subtotal, discountAmount, total, pointsEarned };
  }, [cart, settings, selectedCustomer]);

  const handleCheckout = async () => {
    if ((paymentMethod === "debt" || paymentMethod === "split") && !selectedCustomer) {
      alert("Pilih pelanggan terlebih dahulu untuk mencatat hutang!");
      setShowCustomerModal(true);
      return;
    }

    let paid = calculations.total;
    let debt = 0;

    if (paymentMethod === "cash") {
      paid = parseInt(amountPaid) || 0;
      if (paid < calculations.total) {
        alert("Nominal uang tunai kurang dari total belanja!");
        return;
      }
    } else if (paymentMethod === "split") {
      paid = parseInt(amountPaid) || 0;
      if (paid <= 0) {
        alert("Untuk pembayaran campuran, masukkan jumlah tunai yang diterima (min. Rp 1)");
        return;
      }
      if (paid >= calculations.total) {
        alert("Nominal tunai melebihi total. Gunakan metode TUNAI biasa untuk mendapatkan kembalian.");
        return;
      }
      debt = calculations.total - paid;
    } else if (paymentMethod === "debt") {
      paid = 0;
      debt = calculations.total;
    }

    const transaction: Transaction = {
      id: `TX-${Date.now()}`,
      timestamp: Date.now(),
      items: cart,
      totalAmount: calculations.total,
      paymentMethod: paymentMethod,
      cashPaid: paid,
      debtAmount: debt > 0 ? debt : undefined,
      change: paid > calculations.total ? paid - calculations.total : 0,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      discountAmount: calculations.discountAmount,
      pointsEarned: calculations.pointsEarned,
    };

    await db.createTransaction(transaction);
    setLastTransaction(transaction);
    setShowCheckout(false);
    setShowSuccessModal(true);
    setCart([]);
    setAmountPaid("");
    setSelectedCustomer(null);
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search));
  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category || "Umum")))];

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <Input placeholder="Cari produk atau scan..." className="flex-1" value={search} onChange={(e) => setSearch(e.target.value)} prefix={<i className="fa-solid fa-search"></i>} />

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedCategory === cat ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-500 border-gray-200"}`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts
              .filter((p) => selectedCategory === "Semua" || (p.category || "Umum") === selectedCategory)
              .map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-blue-500 uppercase">{product.category || "Umum"}</span>
                    <h3 className="font-bold text-gray-800 text-sm leading-tight mb-2">{product.name}</h3>
                  </div>
                  <div className="space-y-1">
                    {product.units.map((unit, idx) => (
                      <button key={idx} onClick={() => addToCart(product, unit)} className="w-full flex justify-between items-center px-2 py-1.5 bg-gray-50 rounded-lg hover:bg-blue-50 border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-600">{unit.name}</span>
                        <span className="text-xs font-black text-slate-800">{unit.price.toLocaleString("id-ID", { notation: "compact" })}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <Card className="w-full lg:w-96 flex flex-col border-l border-gray-200 shadow-lg">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <h2 className="font-bold text-gray-800">Keranjang</h2>
          <button
            onClick={() => setShowCustomerModal(true)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black transition-all ${selectedCustomer ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200"}`}
          >
            <i className="fa-solid fa-user"></i>
            {selectedCustomer ? selectedCustomer.name.split(" ")[0].toUpperCase() : "PELANGGAN"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm">
              <div className="flex-1">
                <div className="font-medium text-gray-800">{item.productName}</div>
                <div className="text-xs text-gray-500">
                  {item.unitName} @ {item.price.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{item.quantity}</span>
                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="text-center py-20 text-gray-400 text-sm italic">Keranjang kosong</div>}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 font-bold">Total</span>
            <span className="text-2xl font-black text-blue-700">Rp {calculations.total.toLocaleString("id-ID")}</span>
          </div>
          <Button className="w-full py-3 text-lg font-black" disabled={cart.length === 0} onClick={() => setShowCheckout(true)}>
            Bayar
          </Button>
        </div>
      </Card>

      <Modal isOpen={showCheckout} onClose={() => setShowCheckout(false)} title="Metode Pembayaran">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setPaymentMethod("cash")} className={`py-2 text-[10px] font-black rounded-lg ${paymentMethod === "cash" ? "bg-white text-blue-600" : "text-slate-500"}`}>
              TUNAI
            </button>
            <button onClick={() => setPaymentMethod("qris")} className={`py-2 text-[10px] font-black rounded-lg ${paymentMethod === "qris" ? "bg-white text-blue-600" : "text-slate-500"}`}>
              QRIS
            </button>
            <button onClick={() => setPaymentMethod("debt")} className={`py-2 text-[10px] font-black rounded-lg ${paymentMethod === "debt" ? "bg-white text-blue-600" : "text-slate-500"}`}>
              FULL HUTANG
            </button>
            <button onClick={() => setPaymentMethod("split")} className={`py-2 text-[10px] font-black rounded-lg ${paymentMethod === "split" ? "bg-white text-blue-600" : "text-slate-500"}`}>
              TUNAI + HUTANG
            </button>
          </div>

          {(paymentMethod === "cash" || paymentMethod === "split") && (
            <Input type="number" label={paymentMethod === "split" ? "Jumlah Tunai Diterima" : "Bayar Tunai"} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} autoFocus prefix="Rp" />
          )}

          {paymentMethod === "split" && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs font-bold text-red-700">Kekurangan (Masuk Hutang): Rp {Math.max(0, calculations.total - (parseInt(amountPaid) || 0)).toLocaleString("id-ID")}</p>
            </div>
          )}

          <Button onClick={handleCheckout} className="w-full py-3">
            PROSES TRANSAKSI
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Pilih Pelanggan">
        <div className="max-h-60 overflow-y-auto divide-y">
          {allCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCustomer(c);
                setShowCustomerModal(false);
              }}
              className="w-full flex justify-between items-center py-3 px-2 hover:bg-slate-50"
            >
              <span className="font-bold text-sm text-slate-800">{c.name}</span>
              <Badge color={c.debtBalance > 0 ? "red" : "blue"}>Saldo: Rp {c.debtBalance.toLocaleString("id-ID")}</Badge>
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Transaksi Berhasil">
        <div className="text-center space-y-4">
          <p className="text-2xl font-black">Total: Rp {lastTransaction?.totalAmount.toLocaleString("id-ID")}</p>
          {lastTransaction?.debtAmount && <p className="text-red-600 font-bold">Hutang Baru: Rp {lastTransaction.debtAmount.toLocaleString("id-ID")}</p>}
          <Button onClick={() => setShowSuccessModal(false)} className="w-full">
            Selesai
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
