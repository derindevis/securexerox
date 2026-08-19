import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import Modal from './Modal';

export default function QrScannerModal({ isOpen, onClose, onScanSuccess, onManualEntryClick }) {
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const scannerRef = useRef(null);
  const qrRegionId = 'sx-qr-camera-region';

  // Helper to extract Shop ID from raw QR text or URL
  const extractShopId = (decodedText) => {
    if (!decodedText) return null;
    const text = decodedText.trim();

    // Check URL query param e.g. ?shop=SX-SHOP-0042
    try {
      if (text.includes('shop=')) {
        const urlObj = new URL(text.startsWith('http') ? text : `http://dummy.com/${text}`);
        const shopParam = urlObj.searchParams.get('shop');
        if (shopParam) return shopParam.toUpperCase();
      }
    } catch {
      // ignore URL parse errors
    }

    // Check regex pattern SX-SHOP-XXXX or SX-XXXX
    const match = text.match(/SX-(?:SHOP-)?[A-Z0-9]{4,6}/i);
    if (match) {
      return match[0].toUpperCase();
    }

    return text.toUpperCase();
  };

  // Initialize scanner when modal opens
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;

    async function initScanner() {
      if (!isOpen) return;
      setCameraError(null);
      setScannedResult(null);

      try {
        html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        const qrConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        const onScan = (decodedText) => {
          const parsedShopId = extractShopId(decodedText);
          if (parsedShopId && isMounted) {
            setScannedResult(parsedShopId);
            html5QrCode.stop().then(() => {
              if (isMounted) {
                setIsScanning(false);
                setTimeout(() => {
                  onScanSuccess(parsedShopId);
                  onClose();
                }, 400);
              }
            }).catch(() => {
              if (isMounted) {
                onScanSuccess(parsedShopId);
                onClose();
              }
            });
          }
        };

        // Try direct environment (rear) camera first for instant mobile access
        try {
          await html5QrCode.start({ facingMode: "environment" }, qrConfig, onScan, () => {});
          if (isMounted) setIsScanning(true);
        } catch (facingErr) {
          // Fallback to explicit camera list / default camera
          const devices = await Html5Qrcode.getCameras();
          if (!isMounted) return;

          if (!devices || devices.length === 0) {
            setCameraError('No video cameras detected on this device.');
            return;
          }

          setCameras(devices);
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          const cameraIdToUse = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(cameraIdToUse);

          await html5QrCode.start(cameraIdToUse, qrConfig, onScan, () => {});
          if (isMounted) setIsScanning(true);
        }
      } catch (err) {
        console.error('Camera QR scanner init error:', err);
        if (isMounted) {
          const isPerm = err?.name === 'NotAllowedError' || String(err).includes('Permission');
          setCameraError(
            isPerm
              ? 'Camera permission was denied or dismissed. Please allow camera access in your browser or enter the Shop ID manually.'
              : 'Unable to open camera viewfinder. Please verify device permissions or enter the Shop ID manually.'
          );
        }
      }
    }

    if (isOpen) {
      const timer = setTimeout(initScanner, 150);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {}).then(() => {
            scannerRef.current?.clear();
          });
        }
      };
    }
  }, [isOpen, onScanSuccess, onClose]);

  // Switch camera if multiple cameras are available
  const handleSwitchCamera = async () => {
    if (!scannerRef.current) return;
    try {
      let devList = cameras;
      if (devList.length === 0) {
        devList = await Html5Qrcode.getCameras();
        setCameras(devList);
      }
      if (devList.length <= 1) return;

      await scannerRef.current.stop();
      const nextIdx = (devList.findIndex(c => c.id === selectedCameraId) + 1) % devList.length;
      const nextCam = devList[nextIdx];
      setSelectedCameraId(nextCam.id);

      await scannerRef.current.start(
        nextCam.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const parsedShopId = extractShopId(decodedText);
          if (parsedShopId) {
            scannerRef.current.stop().catch(() => {});
            onScanSuccess(parsedShopId);
            onClose();
          }
        },
        () => {}
      );
    } catch (e) {
      console.error('Error switching camera:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Shop Standee QR">
      <div className="flex flex-col items-center">

        {/* Viewfinder container */}
        <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black/90 border-2 border-[var(--line)] flex items-center justify-center shadow-inner">
          <div id={qrRegionId} className="w-full h-full" />

          {/* Scanner Reticle Overlay */}
          {isScanning && !scannedResult && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-emerald-400/80 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-lg" />
                <div className="w-full h-0.5 bg-emerald-400/70 absolute top-1/2 -translate-y-1/2 animate-bounce" />
              </div>
            </div>
          )}

          {/* Success Flash */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white animate-in fade-in zoom-in duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-lg">
                <CheckCircle2 size={32} />
              </div>
              <strong className="text-lg font-bold">Shop Identified!</strong>
              <span className="font-mono text-sm px-3 py-1 rounded-lg bg-emerald-900/60 border border-emerald-500/30 mt-1">
                {scannedResult}
              </span>
            </div>
          )}

          {/* Error Message & Graceful Fallback */}
          {cameraError && (
            <div className="absolute inset-0 bg-[var(--canvas)] p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mb-3">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1">Camera Access Notice</p>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-5">{cameraError}</p>
              
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onManualEntryClick) onManualEntryClick();
                }}
                className="sx-button text-xs py-2 px-4 justify-center cursor-pointer shadow-sm"
              >
                <Search size={13} /> Enter Shop ID Manually
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex items-center justify-between w-full text-xs text-[var(--ink-muted)] px-1">
          <span>Align the shop's counter standee QR code inside the box.</span>
          {cameras.length > 1 && !cameraError && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface)] text-[var(--ink)] font-semibold transition-colors cursor-pointer shrink-0 ml-3"
            >
              <RefreshCw size={13} /> Switch Camera
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
}
