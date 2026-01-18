import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../services/db";
import { Product, ProductUnit, CartItem, Transaction, AppSettings, Customer } from "../types";
import { Button, Input, Modal, Card, Badge } from "../components/UI";
import { printerService } from "../services/printer";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "debt">("cash");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<"disconnected" | "connected">(printerService.isConnected() ? "connected" : "disconnected");

  const [showScanner, setShowScanner] = useState(false);
  const [scanSelection, setScanSelection] = useState<Product | null>(null);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);

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

    const checkPrinter = setInterval(() => {
      setPrinterStatus(printerService.isConnected() ? "connected" : "disconnected");
    }, 5000);

    return () => {
      window.removeEventListener("products-updated", handleProducts);
      window.removeEventListener("settings-updated", handleSettings);
      window.removeEventListener("customers-updated", handleCustomers);
      clearInterval(checkPrinter);
    };
  }, []);

  // Logika Scanner Barcode
  useEffect(() => {
    if (showScanner) {
      const timer = setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("reader", {
            formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.CODE_128],
            verbose: false,
          });
          scannerInstanceRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => onScanSuccess(decodedText),
            () => {},
          );
        } catch (err) {
          console.error("Scanner error:", err);
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        if (scannerInstanceRef.current?.isScanning) {
          scannerInstanceRef.current.stop().catch(console.error);
        }
      };
    }
  }, [showScanner]);

  const onScanSuccess = (decodedText: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 1500) return;
    const product = products.find((p) => p.sku === decodedText);
    if (product) {
      lastScanTimeRef.current = now;
      if (product.units.length > 1) {
        setScanSelection(product);
      } else {
        addToCart(product, product.units[0]);
      }
    }
  };

  const handleConnectPrinter = async () => {
    try {
      const deviceName = await printerService.connect();
      const updated = { ...settings, printerName: deviceName };
      setSettings(updated);
      await db.saveSettings(updated);
      setPrinterStatus("connected");
    } catch (error: any) {
      if (error.message !== "Pencarian dibatalkan.") alert(error.message);
    }
  };

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
    setScanSelection(null);
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

    // Hitung Estimasi Poin (Jika Member)
    let pointsEarned = 0;
    if (selectedCustomer?.isMember && settings.enablePoints) {
      const basePoints = Math.floor(total / settings.pointValue);
      const multiplier = settings.tierMultipliers[selectedCustomer.tier.toLowerCase() as keyof typeof settings.tierMultipliers] || 1;
      pointsEarned = Math.floor(basePoints * multiplier);
    }

    return { subtotal, discountAmount, total, pointsEarned };
  }, [cart, settings, selectedCustomer]);

  const handleCheckout = async () => {
    if (paymentMethod === "debt" && !selectedCustomer) {
      alert("Pilih pelanggan untuk hutang!");
      return;
    }
    const paid = paymentMethod === "cash" ? parseInt(amountPaid) || 0 : calculations.total;
    if (paymentMethod === "cash" && paid < calculations.total) {
      alert("Pembayaran kurang!");
      return;
    }

    const transaction: Transaction = {
      id: `TX-${Date.now()}`,
      timestamp: Date.now(),
      items: cart,
      totalAmount: calculations.total,
      paymentMethod: paymentMethod,
      cashPaid: paid,
      change: paid - calculations.total,
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

  const handlePrint = async () => {
    if (!lastTransaction) return;
    setIsPrinting(true);
    try {
      if (printerService.isConnected()) {
        await printerService.printTransaction(lastTransaction, settings, "58mm");
      } else {
        const printContent = generateReceiptHTML(lastTransaction, settings);
        const iframe = document.getElementById("printFrame") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.document.open();
          iframe.contentWindow.document.write(printContent);
          iframe.contentWindow.document.close();
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search));
  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category || "Umum")))];

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2">
          <Input placeholder="Cari produk atau scan..." className="flex-1" value={search} onChange={(e) => setSearch(e.target.value)} prefix={<i className="fa-solid fa-search"></i>} />
          <Button onClick={() => setShowScanner(true)} variant="secondary" icon="fa-solid fa-barcode">
            Scan
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
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
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowCustomerModal(true)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black transition-all ${selectedCustomer ? "bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-100" : "bg-white text-gray-500 border-gray-200"}`}
            >
              <i className="fa-solid fa-user"></i>
              {selectedCustomer ? selectedCustomer.name.split(" ")[0].toUpperCase() : "PELANGGAN"}
              {selectedCustomer?.isMember && <i className="fa-solid fa-star text-amber-400 ml-1"></i>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedCustomer?.isMember && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3 rounded-xl shadow-sm mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] opacity-80 uppercase font-bold tracking-widest">Saldo Poin Member</p>
                  <p className="text-xl font-black">{selectedCustomer.pointsBalance.toLocaleString("id-ID")} PTS</p>
                </div>
                <Badge color="yellow">{selectedCustomer.tier.toUpperCase()}</Badge>
              </div>
              <div className="mt-2 text-[10px] font-medium py-1 px-2 bg-white/10 rounded-lg inline-block">Dapat +{calculations.pointsEarned} poin dari transaksi ini</div>
            </div>
          )}

          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm">
              <div className="flex-1">
                <div className="font-medium text-gray-800">{item.productName}</div>
                <div className="text-xs text-gray-500">
                  {item.unitName} @ {item.price.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => {
                      setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it)));
                    }}
                    className="px-2 py-0.5 text-gray-500"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold">{item.quantity}</span>
                  <button
                    onClick={() => {
                      setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: it.quantity + 1 } : it)));
                    }}
                    className="px-2 py-0.5 text-gray-500"
                  >
                    +
                  </button>
                </div>
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

      <Modal isOpen={showCheckout} onClose={() => setShowCheckout(false)} title="Bayar">
        <div className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["cash", "qris", "debt"].map((m: string) => (
              <button key={m} onClick={() => setPaymentMethod(m as any)} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${paymentMethod === m ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="text-center py-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-3xl font-black text-blue-800">Rp {calculations.total.toLocaleString("id-ID")}</p>
            {calculations.pointsEarned > 0 && <p className="text-xs text-blue-600 font-bold mt-1">Dapat +{calculations.pointsEarned} Poin Member</p>}
          </div>
          {paymentMethod === "cash" && (
            <div className="space-y-4">
              <Input type="number" label="Uang Tunai" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} autoFocus />
              <Button onClick={() => setAmountPaid(calculations.total.toString())} variant="secondary" className="w-full text-xs font-bold">
                UANG PAS
              </Button>
            </div>
          )}
          <Button onClick={handleCheckout} className="w-full py-3" disabled={(paymentMethod === "cash" && Number(amountPaid) < calculations.total) || (paymentMethod === "debt" && !selectedCustomer)}>
            Konfirmasi
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Pilih Pelanggan">
        <Input placeholder="Cari nama atau no HP member..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
        <div className="mt-4 max-h-60 overflow-y-auto divide-y">
          {allCustomers
            .filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
            .map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setShowCustomerModal(false);
                }}
                className="w-full flex justify-between items-center py-3 px-2 hover:bg-slate-50"
              >
                <div className="text-left">
                  <span className="font-bold text-sm text-slate-800 flex items-center gap-1">
                    {c.name} {c.isMember && <i className="fa-solid fa-star text-amber-400 text-[10px]"></i>}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>
                </div>
                <div className="flex gap-1 items-center">
                  {c.isMember && <Badge color="blue">{c.pointsBalance.toLocaleString("id-ID")} PTS</Badge>}
                  {c.debtBalance > 0 && <Badge color="red">HUTANG</Badge>}
                </div>
              </button>
            ))}
        </div>
      </Modal>

      <Modal isOpen={showScanner} onClose={() => setShowScanner(false)} title="Scanner">
        <div id="reader" className="w-full max-w-[300px] mx-auto bg-black rounded-xl aspect-square border-2 border-blue-500 overflow-hidden"></div>
      </Modal>

      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Berhasil">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
            <i className="fa-solid fa-check"></i>
          </div>
          <p className="text-2xl font-black">Rp {lastTransaction?.totalAmount.toLocaleString("id-ID")}</p>
          {lastTransaction?.pointsEarned ? <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-bold">Member dapat +{lastTransaction.pointsEarned} Poin!</div> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handlePrint} icon="fa-solid fa-print">
              Struk
            </Button>
            <Button onClick={() => setShowSuccessModal(false)} variant="secondary">
              Selesai
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Helper untuk cetak browser
const generateReceiptHTML = (tx: Transaction, settings: AppSettings) => {
  const itemsHtml = tx.items
    .map(
      (item) => `
    <tr>
      <td style="padding:4px 0;">${item.productName}<br/><small>${item.quantity} x ${item.price.toLocaleString("id-ID")}</small></td>
      <td style="text-align:right; vertical-align:top; padding:4px 0;">${(item.quantity * item.price).toLocaleString("id-ID")}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 58mm; font-size: 10px; margin: 0; padding: 5px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="center bold">${settings.storeName.toUpperCase()}</div>
        <div class="center">${settings.storeAddress}</div>
        <div class="line"></div>
        <div>No: ${tx.id}</div>
        <div>Tgl: ${new Date(tx.timestamp).toLocaleString("id-ID")}</div>
        <div class="line"></div>
        <table>${itemsHtml}</table>
        <div class="line"></div>
        <table class="bold">
          <tr><td>TOTAL</td><td style="text-align:right;">Rp ${tx.totalAmount.toLocaleString("id-ID")}</td></tr>
          ${
            tx.paymentMethod === "cash"
              ? `
            <tr><td>BAYAR</td><td style="text-align:right;">Rp ${tx.cashPaid.toLocaleString("id-ID")}</td></tr>
            <tr><td>KEMBALI</td><td style="text-align:right;">Rp ${tx.change.toLocaleString("id-ID")}</td></tr>
          `
              : `<tr><td>METODE</td><td style="text-align:right;">${tx.paymentMethod.toUpperCase()}</td></tr>`
          }
        </table>
        ${tx.pointsEarned ? `<div class="line"></div><div class="center">Point Member Baru: +${tx.pointsEarned}</div>` : ""}
        <div class="line"></div>
        <div class="center">${settings.footerMessage}</div>
        <br/><br/>
      </body>
    </html>
  `;
};

export default POS;
