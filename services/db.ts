import { Product, Transaction, AppSettings, Customer, UserProfile, Supplier, Procurement, DebtPayment, PointReward, PointHistory } from "../types";
import { db_fs, auth } from "./firebase";
// FIX: Using CDN URLs for Firestore to match other services
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, writeBatch, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORAGE_KEYS = {
  PRODUCTS: "warung_products",
  TRANSACTIONS: "warung_transactions",
  CUSTOMERS: "warung_customers",
  SETTINGS: "warung_settings",
  PROFILE: "warung_user_profile",
  SUPPLIERS: "warung_suppliers",
  PROCUREMENT: "warung_procurement",
  DEBT_PAYMENTS: "warung_debt_payments",
  REWARDS: "warung_point_rewards",
  POINT_HISTORY: "warung_point_history",
  INIT: "warung_initialized",
};

const DEFAULT_SETTINGS: AppSettings = {
  storeName: "Warung Sejahtera",
  storeAddress: "Jl. Merdeka No. 45, Jakarta Selatan",
  storePhone: "0812-9988-7766",
  enableTax: false,
  taxRate: 11,
  footerMessage: "Terima kasih, selamat belanja kembali!",
  showLogo: true,
  logoUrl: null,
  securityPin: null,
  printerName: null,
  tierDiscounts: { bronze: 0, silver: 2, gold: 5 },
  enablePoints: true,
  pointValue: 1000,
  tierMultipliers: { bronze: 1, silver: 1.2, gold: 1.5 },
};

class DBService {
  private profile: UserProfile | null = null;

  constructor() {
    this.init();
    this.setupCloudSync();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.INIT)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.INIT, "true");
    }
    const cachedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (cachedProfile) this.profile = JSON.parse(cachedProfile);
  }

  private sanitizeForFirestore(obj: any): any {
    return JSON.parse(
      JSON.stringify(obj, (key, value) => {
        return value === undefined ? null : value;
      }),
    );
  }

  private setupCloudSync() {
    // FIX: Typed user as any to accommodate CDN import type mismatches
    auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        const profileDoc = await getDoc(doc(db_fs, "users", user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as UserProfile;
          this.profile = profileData;
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profileData));
          window.dispatchEvent(new Event("profile-updated"));

          const warungId = profileData.warungId;

          onSnapshot(doc(db_fs, `warungs/${warungId}/config`, "settings"), (docSnap) => {
            if (docSnap.exists()) {
              localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(docSnap.data()));
              window.dispatchEvent(new Event("settings-updated"));
            }
          });

          onSnapshot(collection(db_fs, `warungs/${warungId}/products`), (snapshot) => {
            const products: Product[] = [];
            snapshot.forEach((doc) => products.push(doc.data() as Product));
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
            window.dispatchEvent(new Event("products-updated"));
          });

          onSnapshot(collection(db_fs, `warungs/${warungId}/customers`), (snapshot) => {
            const customers: Customer[] = [];
            snapshot.forEach((doc) => customers.push(doc.data() as Customer));
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
            window.dispatchEvent(new Event("customers-updated"));
          });

          onSnapshot(collection(db_fs, `warungs/${warungId}/point_rewards`), (snapshot) => {
            const rewards: PointReward[] = [];
            snapshot.forEach((doc) => rewards.push(doc.data() as PointReward));
            localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
            window.dispatchEvent(new Event("rewards-updated"));
          });

          onSnapshot(collection(db_fs, `warungs/${warungId}/point_history`), (snapshot) => {
            const history: PointHistory[] = [];
            snapshot.forEach((doc) => history.push(doc.data() as PointHistory));
            localStorage.setItem(STORAGE_KEYS.POINT_HISTORY, JSON.stringify(history));
            window.dispatchEvent(new Event("point-history-updated"));
          });

          onSnapshot(collection(db_fs, `warungs/${warungId}/transactions`), (snapshot) => {
            const txs: Transaction[] = [];
            snapshot.forEach((doc) => txs.push(doc.data() as Transaction));
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
            window.dispatchEvent(new Event("transactions-updated"));
          });

          // Cloud sync for suppliers
          onSnapshot(collection(db_fs, `warungs/${warungId}/suppliers`), (snapshot) => {
            const suppliers: Supplier[] = [];
            snapshot.forEach((doc) => suppliers.push(doc.data() as Supplier));
            localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
            window.dispatchEvent(new Event("suppliers-updated"));
          });

          // Cloud sync for procurement
          onSnapshot(collection(db_fs, `warungs/${warungId}/procurements`), (snapshot) => {
            const procurements: Procurement[] = [];
            snapshot.forEach((doc) => procurements.push(doc.data() as Procurement));
            localStorage.setItem(STORAGE_KEYS.PROCUREMENT, JSON.stringify(procurements));
            window.dispatchEvent(new Event("procurements-updated"));
          });

          // Cloud sync for debt payments
          onSnapshot(collection(db_fs, `warungs/${warungId}/debt_payments`), (snapshot) => {
            const payments: DebtPayment[] = [];
            snapshot.forEach((doc) => payments.push(doc.data() as DebtPayment));
            localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify(payments));
            window.dispatchEvent(new Event("debt-payments-updated"));
          });
        }
      }
    });
  }

  getCustomers(): Customer[] {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  }

  async saveCustomer(customer: Customer): Promise<void> {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === customer.id);
    const c = { ...customer, debtBalance: customer.debtBalance || 0, pointsBalance: customer.pointsBalance || 0 };
    if (index >= 0) customers[index] = c;
    else customers.push(c);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/customers`, c.id), this.sanitizeForFirestore(c));
    window.dispatchEvent(new Event("customers-updated"));
  }

  async deleteCustomer(id: string): Promise<void> {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    if (this.profile?.warungId) await deleteDoc(doc(db_fs, `warungs/${this.profile.warungId}/customers`, id));
    window.dispatchEvent(new Event("customers-updated"));
  }

  getTransactions(): Transaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  }

  async createTransaction(transaction: Transaction): Promise<void> {
    const transactions = this.getTransactions();
    transactions.unshift(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Kurangi Stok
    const products = this.getProducts();
    transaction.items.forEach((item) => {
      const productIndex = products.findIndex((p) => p.id === item.productId);
      if (productIndex >= 0) {
        products[productIndex].stock -= item.quantity * item.conversion;
        this.saveProduct(products[productIndex]);
      }
    });

    // Update Customer (Hutang, Belanja, & Poin Member)
    if (transaction.customerId) {
      const customers = this.getCustomers();
      const custIdx = customers.findIndex((c) => c.id === transaction.customerId);
      if (custIdx >= 0) {
        const customer = customers[custIdx];
        customer.totalSpent += transaction.totalAmount;

        if (transaction.paymentMethod === "debt") {
          customer.debtBalance = (customer.debtBalance || 0) + transaction.totalAmount;
        }

        // Otomatis tambah poin jika member
        if (customer.isMember && transaction.pointsEarned) {
          customer.pointsBalance = (customer.pointsBalance || 0) + transaction.pointsEarned;

          // Catat log poin
          const log: PointHistory = {
            id: `LOG-${Date.now()}`,
            customerId: customer.id,
            customerName: customer.name,
            type: "earn",
            points: transaction.pointsEarned,
            timestamp: Date.now(),
            referenceId: transaction.id,
          };
          await this.savePointHistory(log);
        }

        await this.saveCustomer(customer);
      }
    }

    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/transactions`, transaction.id), this.sanitizeForFirestore(transaction));
  }

  getPointRewards(): PointReward[] {
    const data = localStorage.getItem(STORAGE_KEYS.REWARDS);
    return data ? JSON.parse(data) : [];
  }

  async savePointReward(reward: PointReward): Promise<void> {
    const rewards = this.getPointRewards();
    const index = rewards.findIndex((r) => r.id === reward.id);
    if (index >= 0) rewards[index] = reward;
    else rewards.push(reward);
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/point_rewards`, reward.id), this.sanitizeForFirestore(reward));
    window.dispatchEvent(new Event("rewards-updated"));
  }

  async deletePointReward(id: string): Promise<void> {
    const rewards = this.getPointRewards().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    if (this.profile?.warungId) await deleteDoc(doc(db_fs, `warungs/${this.profile.warungId}/point_rewards`, id));
    window.dispatchEvent(new Event("rewards-updated"));
  }

  getPointHistory(): PointHistory[] {
    const data = localStorage.getItem(STORAGE_KEYS.POINT_HISTORY);
    return data ? JSON.parse(data) : [];
  }

  async savePointHistory(log: PointHistory): Promise<void> {
    const history = this.getPointHistory();
    history.unshift(log);
    localStorage.setItem(STORAGE_KEYS.POINT_HISTORY, JSON.stringify(history));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/point_history`, log.id), this.sanitizeForFirestore(log));
    window.dispatchEvent(new Event("point-history-updated"));
  }

  async redeemReward(customerId: string, rewardId: string): Promise<void> {
    const customers = this.getCustomers();
    const custIdx = customers.findIndex((c) => c.id === customerId);
    const rewards = this.getPointRewards();
    const rewIdx = rewards.findIndex((r) => r.id === rewardId);

    if (custIdx >= 0 && rewIdx >= 0) {
      const customer = customers[custIdx];
      const reward = rewards[rewIdx];

      if (customer.pointsBalance >= reward.pointsNeeded && reward.stock > 0) {
        customer.pointsBalance -= reward.pointsNeeded;
        await this.saveCustomer(customer);

        reward.stock -= 1;
        await this.savePointReward(reward);

        const log: PointHistory = {
          id: `REDEEM-${Date.now()}`,
          customerId: customer.id,
          customerName: customer.name,
          type: "redeem",
          points: reward.pointsNeeded,
          timestamp: Date.now(),
          referenceId: reward.id,
        };
        await this.savePointHistory(log);
      } else {
        throw new Error("Poin tidak cukup atau hadiah habis.");
      }
    }
  }

  getProducts(): Product[] {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  }
  async saveProduct(product: Product): Promise<void> {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    const updatedProduct = { ...product, updatedAt: Date.now() };
    if (index >= 0) products[index] = updatedProduct;
    else products.push(updatedProduct);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/products`, product.id), this.sanitizeForFirestore(updatedProduct));
    window.dispatchEvent(new Event("products-updated"));
  }

  async deleteProduct(id: string): Promise<void> {
    const products = this.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    if (this.profile?.warungId) await deleteDoc(doc(db_fs, `warungs/${this.profile.warungId}/products`, id));
    window.dispatchEvent(new Event("products-updated"));
  }

  getSettings(): AppSettings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  }
  async saveSettings(settings: AppSettings): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new Event("settings-updated"));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/config`, "settings"), this.sanitizeForFirestore(settings));
  }
  getUserProfile(): UserProfile | null {
    return this.profile;
  }
  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.profile = profile;
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    await setDoc(doc(db_fs, "users", profile.uid), this.sanitizeForFirestore(profile));
    window.dispatchEvent(new Event("profile-updated"));
  }
  getSuppliers(): Supplier[] {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return data ? JSON.parse(data) : [];
  }

  async saveSupplier(supplier: Supplier): Promise<void> {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    if (index >= 0) suppliers[index] = supplier;
    else suppliers.push(supplier);
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/suppliers`, supplier.id), this.sanitizeForFirestore(supplier));
    window.dispatchEvent(new Event("suppliers-updated"));
  }

  async deleteSupplier(id: string): Promise<void> {
    const suppliers = this.getSuppliers().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    if (this.profile?.warungId) await deleteDoc(doc(db_fs, `warungs/${this.profile.warungId}/suppliers`, id));
    window.dispatchEvent(new Event("suppliers-updated"));
  }

  getProcurements(): Procurement[] {
    const data = localStorage.getItem(STORAGE_KEYS.PROCUREMENT);
    return data ? JSON.parse(data) : [];
  }

  async createProcurement(procurement: Procurement): Promise<void> {
    const procurements = this.getProcurements();
    procurements.unshift(procurement);
    localStorage.setItem(STORAGE_KEYS.PROCUREMENT, JSON.stringify(procurements));

    // Update Stok
    const products = this.getProducts();
    for (const item of procurement.items) {
      const pIdx = products.findIndex((p) => p.id === item.productId);
      if (pIdx >= 0) {
        products[pIdx].stock += item.quantity;
        await this.saveProduct(products[pIdx]);
      }
    }

    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/procurements`, procurement.id), this.sanitizeForFirestore(procurement));
    window.dispatchEvent(new Event("procurements-updated"));
  }

  getDebtPayments(): DebtPayment[] {
    const data = localStorage.getItem(STORAGE_KEYS.DEBT_PAYMENTS);
    return data ? JSON.parse(data) : [];
  }
  async createDebtPayment(payment: DebtPayment): Promise<void> {
    const payments = this.getDebtPayments();
    payments.unshift(payment);
    localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify(payments));
    const customers = this.getCustomers();
    const custIdx = customers.findIndex((c) => c.id === payment.customerId);
    if (custIdx >= 0) {
      customers[custIdx].debtBalance -= payment.amount;
      await this.saveCustomer(customers[custIdx]);
    }
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/debt_payments`, payment.id), this.sanitizeForFirestore(payment));
    window.dispatchEvent(new Event("debt-payments-updated"));
  }

  // FIX: Added wipeAllData method to clear local and cloud data
  async wipeAllData(): Promise<void> {
    const warungId = this.profile?.warungId;
    if (!warungId) return;

    // Clear LocalStorage
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(STORAGE_KEYS.INIT);

    // Clear Firestore (Collections)
    const collections = ["products", "customers", "transactions", "suppliers", "procurements", "debt_payments", "point_rewards", "point_history"];
    const batch = writeBatch(db_fs);

    for (const colName of collections) {
      try {
        const snap = await getDocs(collection(db_fs, `warungs/${warungId}/${colName}`));
        snap.forEach((d) => batch.delete(d.ref));
      } catch (e) {
        console.error(`Failed to clear ${colName}`, e);
      }
    }

    // Clear settings
    try {
      batch.delete(doc(db_fs, `warungs/${warungId}/config`, "settings"));
    } catch (e) {}

    await batch.commit();
  }

  // FIX: Added injectDemoData method to prepopulate the app
  async injectDemoData(): Promise<void> {
    if (!this.profile?.warungId) return;

    await this.wipeAllData();

    const demoProducts: Product[] = [
      {
        id: "DEMO-P1",
        name: "Beras Pandan Wangi 5kg",
        sku: "899123456781",
        category: "Sembako",
        baseUnit: "Karung",
        stock: 20,
        minStockAlert: 5,
        updatedAt: Date.now(),
        units: [{ name: "Karung", conversion: 1, price: 85000, buyPrice: 78000 }],
      },
      {
        id: "DEMO-P2",
        name: "Minyak Goreng 1L",
        sku: "899123456782",
        category: "Sembako",
        baseUnit: "Pouch",
        stock: 50,
        minStockAlert: 10,
        updatedAt: Date.now(),
        units: [{ name: "Pouch", conversion: 1, price: 18000, buyPrice: 16500 }],
      },
      {
        id: "DEMO-P3",
        name: "Indomie Goreng",
        sku: "899123456783",
        category: "Makanan",
        baseUnit: "Pcs",
        stock: 200,
        minStockAlert: 40,
        updatedAt: Date.now(),
        units: [
          { name: "Pcs", conversion: 1, price: 3000, buyPrice: 2700 },
          { name: "Dus", conversion: 40, price: 110000, buyPrice: 102000 },
        ],
      },
    ];

    const demoCustomers: Customer[] = [
      {
        id: "DEMO-C1",
        name: "Budi Santoso",
        phone: "08123456789",
        tier: "Gold",
        totalSpent: 1200000,
        debtBalance: 0,
        joinedAt: Date.now(),
        isMember: true,
        pointsBalance: 1200,
      },
      {
        id: "DEMO-C2",
        name: "Siti Aminah",
        phone: "08556677889",
        tier: "Silver",
        totalSpent: 450000,
        debtBalance: 50000,
        joinedAt: Date.now(),
        isMember: true,
        pointsBalance: 450,
      },
    ];

    for (const p of demoProducts) await this.saveProduct(p);
    for (const c of demoCustomers) await this.saveCustomer(c);

    localStorage.setItem(STORAGE_KEYS.INIT, "true");
  }
}

export const db = new DBService();
