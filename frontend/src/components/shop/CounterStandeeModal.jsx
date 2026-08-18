import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Printer, Download, X, Smartphone, FileUp, Key } from 'lucide-react';
import Modal from '../common/Modal';

export default function CounterStandeeModal({ isOpen, onClose, shopUser }) {
  const standeeRef = useRef(null);

  if (!shopUser) return null;

  const shopPublicId = shopUser.shopPublicId || `SX-SHOP-${shopUser.id?.slice(0, 4).toUpperCase()}`;
  const qrUrl = shopUser.shopQrPayload || `${window.location.origin}/customer/upload?shop=${shopPublicId}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Counter Standee Generator">
      <div className="flex flex-col gap-6">
        
        {/* Printable Standee Card */}
        <div
          ref={standeeRef}
          id="printable-standee"
          className="p-8 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] shadow-md flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Top Banner */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--emerald-soft)] text-[var(--emerald)] text-[11px] font-bold tracking-wider uppercase mb-4 border border-[var(--emerald)]/20">
            <ShieldCheck size={14} />
            Official Zero-Trust Print Vault
          </div>

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--serif)' }}>
            {shopUser.name || 'Secure Print Shop'}
          </h2>
          <p className="text-xs text-[var(--ink-muted)] mb-6">
            Scan to upload & print with military-grade privacy. Zero disk persistence.
          </p>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl border-2 border-[var(--line)] shadow-inner mb-4 flex flex-col items-center">
            <QRCodeSVG
              value={qrUrl}
              size={180}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Public Shop ID Badge */}
          <div className="mb-6 flex flex-col items-center">
            <span className="text-[11px] text-[var(--ink-muted)] uppercase tracking-wider font-semibold">
              Shop Location Code:
            </span>
            <span className="font-mono text-xl font-extrabold tracking-widest text-[var(--ink)] bg-[var(--surface-muted)] px-4 py-1 rounded-xl border border-[var(--line)] mt-1">
              {shopPublicId}
            </span>
          </div>

          {/* 3 Step Instructions */}
          <div className="w-full grid grid-cols-3 gap-2 pt-4 border-t border-[var(--line)] text-left">
            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] flex flex-col gap-1">
              <span className="w-5 h-5 rounded-full bg-[var(--ink)] text-[var(--surface)] text-[10px] font-bold flex items-center justify-center">1</span>
              <p className="text-[11px] font-bold text-[var(--ink)]">Scan QR</p>
              <p className="text-[10px] text-[var(--ink-muted)] leading-tight">Open camera & tap link to open upload vault.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] flex flex-col gap-1">
              <span className="w-5 h-5 rounded-full bg-[var(--ink)] text-[var(--surface)] text-[10px] font-bold flex items-center justify-center">2</span>
              <p className="text-[11px] font-bold text-[var(--ink)]">Upload File</p>
              <p className="text-[10px] text-[var(--ink-muted)] leading-tight">Pick file & print settings. Encrypted in RAM.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] flex flex-col gap-1">
              <span className="w-5 h-5 rounded-full bg-[var(--ink)] text-[var(--surface)] text-[10px] font-bold flex items-center justify-center">3</span>
              <p className="text-[11px] font-bold text-[var(--ink)]">Show PIN</p>
              <p className="text-[10px] text-[var(--ink-muted)] leading-tight">Give 6-digit release code to cashier to print.</p>
            </div>
          </div>

          {/* Footer Security Notice */}
          <div className="mt-6 text-[10px] text-[var(--ink-muted)] tracking-tight">
            🔒 Protected by SecureXerox • In-Memory Cryptographic Shredding
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[var(--ink-muted)]">
            Place this standee at your counter for one-tap mobile uploads.
          </p>
          <button
            type="button"
            onClick={handlePrint}
            className="sx-button justify-center gap-2 text-xs py-2.5 px-5"
          >
            <Printer size={15} /> Print Desk Standee
          </button>
        </div>

      </div>
    </Modal>
  );
}
