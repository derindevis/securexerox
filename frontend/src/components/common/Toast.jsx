import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeClasses = {
  success: 'toast-item--success text-emerald-200',
  error: 'toast-item--error text-rose-200',
  warning: 'toast-item--warning text-amber-200',
  info: 'toast-item--info text-sky-200',
};

const iconColors = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  warning: 'text-amber-400',
  info: 'text-sky-400',
};

const titles = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || icons.info;
        const titleText = titles[toast.type] || 'Notice';
        const cardTypeClass = typeClasses[toast.type] || typeClasses.info;
        const iconColorClass = iconColors[toast.type] || iconColors.info;

        return (
          <div
            key={toast.id}
            className={`toast-item ${cardTypeClass}`}
          >
            <div className={`p-2 rounded-lg bg-white/5 flex-shrink-0 ${iconColorClass}`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-0.5">
                {titleText}
              </h4>
              <p className="text-sm text-slate-100 font-medium leading-snug break-words">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 mt-0.5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

