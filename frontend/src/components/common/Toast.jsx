import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'text-[var(--emerald)]',
  error: 'text-[var(--danger)]',
  warning: 'text-[var(--amber)]',
  info: 'text-[var(--blue)]',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type] || Info;
        return (
          <div key={toast.id} className={`toast-item toast-item--${toast.type}`}>
            <Icon size={18} className={`mt-0.5 shrink-0 ${colorMap[toast.type] || ''}`} />
            <p className="flex-1 text-sm leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors text-[var(--ink-muted)]"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
