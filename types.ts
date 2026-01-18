export interface ProductUnit {
  name: string;
  conversion: number;
  price: number;
  buyPrice: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  baseUnit: string;
  stock: number;
  minStockAlert: number;
  units: ProductUnit[];
  updatedAt: number;
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  description: string;
}

export interface ProcurementItem {
  productId: string;
  productName: string;
  quantity: number;
  unitName: string;
  buyPrice: number;
  total: number;
}

export interface Procurement {
  id: string;
  supplierId: string;
  supplierName: string;
  timestamp: number;
  items: ProcurementItem[];
  totalAmount: number;
  note?: string;
}

export type CustomerTier = "Bronze" | "Silver" | "Gold";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  tier: CustomerTier;
  totalSpent: number;
  debtBalance: number;
  joinedAt: number;
  // Member Point Fields
  isMember: boolean;
  pointsBalance: number;
  memberId?: string;
}

export interface PointReward {
  id: string;
  name: string;
  pointsNeeded: number;
  stock: number;
  description: string;
}

export interface PointHistory {
  id: string;
  customerId: string;
  customerName: string;
  type: "earn" | "redeem";
  points: number;
  timestamp: number;
  referenceId: string; // Transaction ID atau Reward ID
}

export interface DebtPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  unitName: string;
  price: number;
  buyPrice: number;
  quantity: number;
  conversion: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: "cash" | "qris" | "debt";
  cashPaid: number;
  change: number;
  note?: string;
  customerId?: string;
  customerName?: string;
  discountAmount?: number;
  pointsEarned?: number; // Poin yang didapat dari transaksi ini
}

export type UserRole = "owner" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  warungId: string;
}

export interface AppSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  enableTax: boolean;
  taxRate: number;
  footerMessage: string;
  showLogo: boolean;
  logoUrl?: string | null;
  securityPin: string | null;
  printerName?: string | null;
  tierDiscounts: {
    bronze: number;
    silver: number;
    gold: number;
  };
  // Loyalty Settings
  enablePoints: boolean;
  pointValue: number; // Misal: 1000 (Tiap 1000 rupiah dapat 1 poin)
  tierMultipliers: {
    bronze: number;
    silver: number;
    gold: number;
  };
}
