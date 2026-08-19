import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ShieldCheck, Printer, Download } from 'lucide-react';
import Modal from '../common/Modal';

export default function CounterStandeeModal({ isOpen, onClose, shopUser }) {
  const standeeRef = useRef(null);

  if (!shopUser) return null;

  const shopPublicId = shopUser.shopPublicId || shopUser.shop_public_id || `SX-SHOP-${shopUser.id?.slice(0, 4).toUpperCase()}`;
  const qrUrl = shopUser.shopQrPayload || shopUser.shop_qr_payload || `${window.location.origin}/customer/upload?shop=${shopPublicId}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById('shop-qr-canvas');
    if (!canvas) return;
    
    // Create a temporary canvas to add some white padding around the QR code
    const padding = 20;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width + (padding * 2);
    tempCanvas.height = canvas.height + (padding * 2);
    const ctx = tempCanvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, padding, padding);

    const pngUrl = tempCanvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${shopPublicId}-QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Counter Standee Generator">
      <div className="flex flex-col gap-4">
        
        {/* Printable Standee Card */}
        <div
          ref={standeeRef}
          id="printable-standee"
          className="p-5 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] shadow-xs flex flex-col items-center text-center relative overflow-hidden max-w-sm mx-auto w-full"
        >
          {/* Top Banner */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--emerald-soft)] text-[var(--emerald)] text-[10px] font-bold tracking-wider uppercase mb-2 border border-[var(--emerald)]/20">
            <ShieldCheck size={12} />
            Official Zero-Trust Print Vault
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-0.5" style={{ fontFamily: 'var(--serif)' }}>
            {shopUser.name || 'Secure Print Shop'}
          </h2>
          <p className="text-[11px] text-[var(--ink-muted)] mb-3">
            Scan to upload & print with military-grade privacy.
          </p>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-xl border border-[var(--line)] shadow-inner mb-3 flex flex-col items-center">
            <QRCodeCanvas
              id="shop-qr-canvas"
              value={qrUrl}
              size={135}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Public Shop ID Badge */}
          <div className="mb-3 flex flex-col items-center">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider font-semibold">
              Shop Location Code:
            </span>
            <span className="font-mono text-base font-extrabold tracking-widest text-[var(--ink)] bg-[var(--surface-muted)] px-3 py-0.5 rounded-lg border border-[var(--line)] mt-0.5">
              {shopPublicId}
            </span>
          </div>

          {/* 3 Step Instructions */}
          <div className="w-full grid grid-cols-3 gap-1.5 pt-3 border-t border-[var(--line)] text-left">
            <div className="p-2 rounded-lg bg-[var(--surface-muted)] flex flex-col gap-0.5">
              <span className="w-4 h-4 rounded-full bg-[var(--ink)] text-[var(--surface)] text-[9px] font-bold flex items-center justify-center">1</span>
              <p className="text-[10px] font-bold text-[var(--ink)]">Scan QR</p>
              <p className="text-[9px] text-[var(--ink-muted)] leading-tight">Open camera to launch vault.</p>
            </div>

            <div className="p-2 rounded-lg bg-[var(--surface-muted)] flex flex-col gap-0.5">
              <span className="w-4 h-4 rounded-full bg-[var(--ink)] text-[var(--surface)] text-[9px] font-bold flex items-center justify-center">2</span>
              <p className="text-[10px] font-bold text-[var(--ink)]">Upload</p>
              <p className="text-[9px] text-[var(--ink-muted)] leading-tight">Encrypted in RAM only.</p>
            </div>

            <div className="p-2 rounded-lg bg-[var(--surface-muted)] flex flex-col gap-0.5">
              <span className="w-4 h-4 rounded-full bg-[var(--ink)] text-[var(--surface)] text-[9px] font-bold flex items-center justify-center">3</span>
              <p className="text-[10px] font-bold text-[var(--ink)]">Show PIN</p>
              <p className="text-[9px] text-[var(--ink-muted)] leading-tight">Wait for tracking status.</p>
            </div>
          </div>

          {/* Footer Security Notice */}
          <div className="mt-3 text-[9px] text-[var(--ink-muted)] tracking-tight">
            🔒 In-Memory Cryptographic Shredding • Zero Disk Storage
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-1 gap-3">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download size={14} /> Download Image
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="sx-button justify-center gap-1.5 text-xs py-2 px-4 cursor-pointer w-full md:w-auto"
          >
            <Printer size={14} /> Print Standee
          </button>
        </div>

      </div>
    </Modal>
  );
}
