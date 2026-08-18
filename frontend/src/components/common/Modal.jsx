import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="sx-modal-overlay" onClick={onClose}>
      <div className="sx-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sx-modal__header">
          <h2 className="sx-modal__title">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors text-[var(--ink-secondary)]"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
