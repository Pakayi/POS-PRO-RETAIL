import React from "react";

// --- Types & Variants ---
const HEADER_VARIANTS = {
  white: "",
  "blue-header": "border-t-4 border-t-blue-500",
  "green-header": "border-t-4 border-t-emerald-500",
  "red-header": "border-t-4 border-t-red-500",
  "amber-header": "border-t-4 border-t-amber-500",
  "indigo-header": "border-t-4 border-t-brand-600",
  "flat-blue": "bg-blue-600 rounded-t-lg",
  "flat-amber": "bg-dashboard-warning rounded-t-lg",
};

const STAT_COLORS = {
  cyan: "bg-dashboard-info",
  amber: "bg-dashboard-warning text-white",
  emerald: "bg-dashboard-success",
  crimson: "bg-dashboard-danger",
  indigo: "bg-brand-600",
};

// --- Card ---
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  variant?: keyof typeof HEADER_VARIANTS;
  title?: string;
}> = ({ children, className = "", noPadding = false, variant = "white", title }) => (
  <div className={`bg-white rounded shadow-sm overflow-hidden border border-slate-200 ${className}`}>
    {variant.startsWith("flat") && <div className={`${HEADER_VARIANTS[variant]} px-4 py-2`}>{title && <h3 className="text-sm font-bold text-white">{title}</h3>}</div>}
    {!variant.startsWith("flat") && variant !== "white" && <div className={HEADER_VARIANTS[variant]}></div>}
    {title && !variant.startsWith("flat") && (
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      </div>
    )}
    <div className={noPadding ? "" : "p-4"}>{children}</div>
  </div>
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
  <div className={`${STAT_COLORS[color]} rounded shadow overflow-hidden relative group transition-transform active:scale-95 cursor-pointer flex flex-col`} onClick={onClick}>
    <div className="p-4 flex-1 flex flex-col justify-center min-h-[100px] relative">
      <div className="relative z-10 text-white">
        <h3 className="text-4xl font-bold mb-1">{value}</h3>
        <p className="text-sm font-normal opacity-90">{title}</p>
      </div>
      <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-110 transition-transform text-white">
        <i className={icon}></i>
      </div>
    </div>
    <div className="w-full py-1.5 bg-black/10 hover:bg-black/20 text-white text-[11px] font-normal flex items-center justify-center gap-1.5 transition-colors">
      More Info <i className="fa-solid fa-circle-right"></i>
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
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };

  const sizes = {
    sm: "px-3 py-1 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50 active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : icon ? <i className={icon}></i> : null}
      {children}
    </button>
  );
};
Button.displayName = "Button";

// --- Input ---
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, prefix, className = "", ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>}
    <div className="relative group">
      {prefix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">{prefix}</div>}
      <input
        ref={ref}
        className={`w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all ${prefix ? "pl-9" : ""} ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded shadow-xl w-full max-w-lg relative animate-in zoom-in-95 duration-200">
        <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">{footer}</div>}
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
    {label && <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">{label}</label>}
    <div className="relative group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</div>
      <input
        type="number"
        autoFocus={autoFocus}
        className={`w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm font-bold focus:outline-none focus:border-blue-500 transition-all ${className}`}
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
    brand: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    red: "bg-red-600 text-white",
    yellow: "bg-dashboard-warning text-white",
    slate: "bg-slate-500 text-white",
    blue: "bg-cyan-600 text-white",
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[color]}`}>{children}</span>;
};
Badge.displayName = "Badge";

// --- Toast ---
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
    <div className={`fixed bottom-6 right-6 z-[100] ${bg} text-white px-5 py-2.5 rounded shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300`}>
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-5 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
      <i className="fa-solid fa-wifi-slash"></i>
      <span className="text-xs font-bold uppercase tracking-widest">Offline</span>
    </div>
  );
};
OfflineIndicator.displayName = "OfflineIndicator";
