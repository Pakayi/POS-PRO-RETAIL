import { Product, Transaction, AppSettings, Customer, UserProfile, Supplier, Procurement, DebtPayment, PointReward, PointHistory } from "../types";
import { db_fs, auth } from "./firebase";
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

          onSnapshot(collection(db_fs, `warungs/${warungId}/transactions`), (snapshot) => {
            const txs: Transaction[] = [];
            snapshot.forEach((doc) => txs.push(doc.data() as Transaction));
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
            window.dispatchEvent(new Event("transactions-updated"));
          });

          onSnapshot(collection(db_fs, `warungs/${warungId}/debt_payments`), (snapshot) => {
            const payments: DebtPayment[] = [];
            snapshot.forEach((doc) => payments.push(doc.data() as DebtPayment));
            localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify(payments));
            window.dispatchEvent(new Event("debt-payments-updated"));
          });

          // ADDED: Additional snapshots for full cloud sync
          onSnapshot(collection(db_fs, `warungs/${warungId}/suppliers`), (snapshot) => {
            const suppliers: Supplier[] = [];
            snapshot.forEach((doc) => suppliers.push(doc.data() as Supplier));
            localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
            window.dispatchEvent(new Event("suppliers-updated"));
          });

          onSnapshot(collection(db_fs, `warungs/${warungId}/procurements`), (snapshot) => {
            const procurements: Procurement[] = [];
            snapshot.forEach((doc) => procurements.push(doc.data() as Procurement));
            localStorage.setItem(STORAGE_KEYS.PROCUREMENT, JSON.stringify(procurements));
            window.dispatchEvent(new Event("procurements-updated"));
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

  // FIXED: Added deleteCustomer method
  async deleteCustomer(id: string): Promise<void> {
    const customers = this.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(filtered));
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

    const products = this.getProducts();
    transaction.items.forEach((item) => {
      const productIndex = products.findIndex((p) => p.id === item.productId);
      if (productIndex >= 0) {
        products[productIndex].stock -= item.quantity * item.conversion;
        this.saveProduct(products[productIndex]);
      }
    });

    if (transaction.customerId) {
      const customers = this.getCustomers();
      const custIdx = customers.findIndex((c) => c.id === transaction.customerId);
      if (custIdx >= 0) {
        const customer = customers[custIdx];
        customer.totalSpent += transaction.totalAmount;

        if (transaction.paymentMethod === "debt") {
          customer.debtBalance = (customer.debtBalance || 0) + transaction.totalAmount;
        } else if (transaction.paymentMethod === "split" && transaction.debtAmount) {
          customer.debtBalance = (customer.debtBalance || 0) + transaction.debtAmount;
        }

        if (customer.isMember && transaction.pointsEarned) {
          customer.pointsBalance = (customer.pointsBalance || 0) + transaction.pointsEarned;
          // Log point history
          const historyItem: PointHistory = {
            id: `PH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            customerId: customer.id,
            customerName: customer.name,
            type: "earn",
            points: transaction.pointsEarned,
            timestamp: Date.now(),
            referenceId: transaction.id,
          };
          await this.addPointHistory(historyItem);
        }
        await this.saveCustomer(customer);
      }
    }

    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/transactions`, transaction.id), this.sanitizeForFirestore(transaction));
    window.dispatchEvent(new Event("transactions-updated"));
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

  // FIXED: Added deleteProduct method
  async deleteProduct(id: string): Promise<void> {
    const products = this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
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

  // FIXED: Added saveSupplier method
  async saveSupplier(supplier: Supplier): Promise<void> {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    if (index >= 0) suppliers[index] = supplier;
    else suppliers.push(supplier);
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/suppliers`, supplier.id), this.sanitizeForFirestore(supplier));
    window.dispatchEvent(new Event("suppliers-updated"));
  }

  // FIXED: Added deleteSupplier method
  async deleteSupplier(id: string): Promise<void> {
    const suppliers = this.getSuppliers();
    const filtered = suppliers.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(filtered));
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
    for (const item of procurement.items) {
      const products = this.getProducts();
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

  getPointRewards(): PointReward[] {
    const data = localStorage.getItem(STORAGE_KEYS.REWARDS);
    return data ? JSON.parse(data) : [];
  }

  // FIXED: Added savePointReward method
  async savePointReward(reward: PointReward): Promise<void> {
    const rewards = this.getPointRewards();
    const index = rewards.findIndex((r) => r.id === reward.id);
    if (index >= 0) rewards[index] = reward;
    else rewards.push(reward);
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/point_rewards`, reward.id), this.sanitizeForFirestore(reward));
    window.dispatchEvent(new Event("rewards-updated"));
  }

  // FIXED: Added deletePointReward method
  async deletePointReward(id: string): Promise<void> {
    const rewards = this.getPointRewards();
    const filtered = rewards.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(filtered));
    if (this.profile?.warungId) await deleteDoc(doc(db_fs, `warungs/${this.profile.warungId}/point_rewards`, id));
    window.dispatchEvent(new Event("rewards-updated"));
  }

  getPointHistory(): PointHistory[] {
    const data = localStorage.getItem(STORAGE_KEYS.POINT_HISTORY);
    return data ? JSON.parse(data) : [];
  }

  // FIXED: Added addPointHistory method
  async addPointHistory(history: PointHistory): Promise<void> {
    const histories = this.getPointHistory();
    histories.unshift(history);
    localStorage.setItem(STORAGE_KEYS.POINT_HISTORY, JSON.stringify(histories));
    if (this.profile?.warungId) await setDoc(doc(db_fs, `warungs/${this.profile.warungId}/point_history`, history.id), this.sanitizeForFirestore(history));
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

        const history: PointHistory = {
          id: `PH-${Date.now()}`,
          customerId: customer.id,
          customerName: customer.name,
          type: "redeem",
          points: reward.pointsNeeded,
          timestamp: Date.now(),
          referenceId: reward.id,
        };
        await this.addPointHistory(history);
      } else {
        throw new Error("Poin tidak cukup atau stok hadiah habis.");
      }
    }
  }

  // FIXED: Added wipeAllData method
  async wipeAllData(): Promise<void> {
    const keysToKeep = [STORAGE_KEYS.PROFILE, STORAGE_KEYS.INIT];
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("warung_") && !keysToKeep.includes(k)) {
        localStorage.removeItem(k);
      }
    });
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.INIT, "true");
  }

  // FIXED: Added injectDemoData method
  async injectDemoData(): Promise<void> {
    await this.wipeAllData();
    const demoSuppliers: Supplier[] = [{ id: "S1", name: "PT Sembako Makmur", contact: "08123456789", address: "Jl. Pasar Baru No. 1", description: "Supplier Sembako Utama" }];
    const demoProducts: Product[] = [
      {
        id: "P1",
        name: "Indomie Goreng",
        sku: "8998866200578",
        category: "Makanan",
        baseUnit: "Pcs",
        stock: 100,
        minStockAlert: 20,
        units: [{ name: "Pcs", conversion: 1, price: 3500, buyPrice: 2800 }],
        updatedAt: Date.now(),
        supplierId: "S1",
      },
      {
        id: "P2",
        name: "Minyak Goreng 1L",
        sku: "8999999123456",
        category: "Kebutuhan Dapur",
        baseUnit: "Pouch",
        stock: 24,
        minStockAlert: 5,
        units: [{ name: "Pouch", conversion: 1, price: 18000, buyPrice: 15500 }],
        updatedAt: Date.now(),
        supplierId: "S1",
      },
    ];
    const demoCustomers: Customer[] = [
      { id: "C1", name: "Budi Santoso", phone: "087712345678", tier: "Gold", totalSpent: 500000, debtBalance: 0, joinedAt: Date.now(), isMember: true, pointsBalance: 450, memberId: "MB-001" },
      { id: "C2", name: "Ani Wijaya", phone: "081299998888", tier: "Bronze", totalSpent: 25000, debtBalance: 15000, joinedAt: Date.now(), isMember: false, pointsBalance: 0 },
    ];
    const demoRewards: PointReward[] = [
      { id: "R1", name: "Mug Cantik", pointsNeeded: 100, stock: 10, description: "Mug keramik limited edition" },
      { id: "R2", name: "Voucher Belanja 10rb", pointsNeeded: 500, stock: 50, description: "Potongan langsung di kasir" },
    ];

    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(demoSuppliers));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(demoProducts));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(demoCustomers));
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(demoRewards));

    if (this.profile?.warungId) {
      const warungId = this.profile.warungId;
      for (const s of demoSuppliers) await setDoc(doc(db_fs, `warungs/${warungId}/suppliers`, s.id), s);
      for (const p of demoProducts) await setDoc(doc(db_fs, `warungs/${warungId}/products`, p.id), p);
      for (const c of demoCustomers) await setDoc(doc(db_fs, `warungs/${warungId}/customers`, c.id), c);
      for (const r of demoRewards) await setDoc(doc(db_fs, `warungs/${warungId}/point_rewards`, r.id), r);
    }
  }

  exportAllData(): string {
    const data: any = {};
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("warung_")) data[k] = localStorage.getItem(k);
    });
    return JSON.stringify(data);
  }

  async importAllData(json: string): Promise<void> {
    const data = JSON.parse(json);
    Object.keys(data).forEach((k) => localStorage.setItem(k, data[k]));
    window.location.reload();
  }
}
export const db = new DBService();
