import React from "react";

// --- Types & Variants ---
const HEADER_VARIANTS = {
  white: "",
  "blue-header": "border-t-4 border-t-blue-500",
  "green-header": "border-t-4 border-t-emerald-500",
  "red-header": "border-t-4 border-t-red-500",
  "amber-header": "border-t-4 border-t-amber-500",
  "indigo-header": "border-t-4 border-t-brand-600",
};

const STAT_COLORS = {
  cyan: "bg-cyan-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  crimson: "bg-red-500",
  indigo: "bg-brand-600",
};

// --- Card ---
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  variant?: keyof typeof HEADER_VARIANTS;
}> = ({ children, className = "", noPadding = false, variant = "white" }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${HEADER_VARIANTS[variant]} ${noPadding ? "" : "p-5"} ${className}`}>{children}</div>
);
Card.displayName = "Card";

// --- Stat Card ---
export const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: keyof typeof STAT_COLORS;
  onClick?: () => void;
}> = ({ title, value, icon, color, onClick }) => (
  <div className={`${STAT_COLORS[color]} rounded-xl shadow-md overflow-hidden relative group transition-transform active:scale-95 cursor-pointer`} onClick={onClick}>
    <div className="p-5 text-white">
      <div className="relative z-10">
        <h3 className="text-4xl font-black mb-1">{value}</h3>
        <p className="text-sm font-bold opacity-90 uppercase tracking-tight">{title}</p>
      </div>
      <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-110 transition-transform">
        <i className={icon}></i>
      </div>
    </div>
    <div className="w-full py-2 bg-black/10 hover:bg-black/20 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
      Detail Selengkapnya <i className="fa-solid fa-circle-right"></i>
    </div>
  </div>
);
StatCard.displayName = "StatCard";

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "success";
  size?: "sm" | "md" | "lg";
  icon?: string;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = "primary", size = "md", icon, loading, className = "", ...props }) => {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-100 shadow-md",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-100 shadow-md",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 focus:ring-red-50",
    ghost: "text-slate-600 hover:bg-slate-50 focus:ring-slate-100",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-100",
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5",
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-4 disabled:opacity-50 active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : icon ? <i className={icon}></i> : null}
      {children}
    </button>
  );
};
Button.displayName = "Button";

// --- Input (Fixed Syntax) ---
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, prefix, className = "", ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>}
    <div className="relative group">
      {prefix && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">{prefix}</div>}
      <input
        ref={ref}
        className={`w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all ${prefix ? "pl-11" : ""} ${error ? "border-red-300 bg-red-50 focus:ring-red-100" : ""} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{error}</p>}
  </div>
));
Input.displayName = "Input";

// --- Modal ---
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">{children}</div>
        {footer && <div className="p-4 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};
Modal.displayName = "Modal";

// --- Currency Input ---
export const CurrencyInput: React.FC<{
  label?: string;
  value: number;
  onChange: (val: number) => void;
  className?: string;
  autoFocus?: boolean;
}> = ({ label, value, onChange, className = "", autoFocus }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase ml-1">{label}</label>}
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors font-bold text-sm">Rp</div>
      <input
        type="number"
        autoFocus={autoFocus}
        className={`w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all ${className}`}
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  </div>
);
CurrencyInput.displayName = "CurrencyInput";

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; color?: "brand" | "green" | "red" | "yellow" | "slate" | "blue" }> = ({ children, color = "brand" }) => {
  const colors = {
    brand: "bg-brand-50 text-brand-700 border-brand-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    yellow: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
  };
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${colors[color]}`}>{children}</span>;
};
Badge.displayName = "Badge";

// --- Toast ---
// FIXED: Added and exported Toast component
export const Toast: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: "success" | "error" | "info";
}> = ({ isOpen, onClose, message, type = "success" }) => {
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-600" : "bg-blue-600";

  return (
    <div className={`fixed bottom-6 right-6 z-[100] ${bg} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300`}>
      <i className={`fa-solid ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : "fa-info-circle"}`}></i>
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
};
Toast.displayName = "Toast";

// --- Offline Indicator ---
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
      <i className="fa-solid fa-wifi-slash"></i>
      <span className="text-xs font-bold uppercase tracking-widest">Mode Offline Aktif</span>
    </div>
  );
};
OfflineIndicator.displayName = "OfflineIndicator";
