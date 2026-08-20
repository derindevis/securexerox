import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle2, Search, UploadCloud } from 'lucide-react';
import Modal from './Modal';

export default function QrScannerModal({ isOpen, onClose, onScanSuccess, onManualEntryClick }) {
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const qrRegionId = 'sx-qr-camera-region';

  // Helper to extract Shop ID from raw QR text or URL
  const extractShopId = (decodedText) => {
    if (!decodedText) return null;
    const text = decodedText.trim();

    try {
      if (text.includes('shop=')) {
        const urlObj = new URL(text.startsWith('http') ? text : `http://dummy.com/${text}`);
        const shopParam = urlObj.searchParams.get('shop');
        if (shopParam) return shopParam.toUpperCase();
      }
    } catch {
      // ignore URL parse errors
    }

    const match = text.match(/SX-(?:SHOP-)?[A-Z0-9]{4,6}/i);
    if (match) return match[0].toUpperCase();

    return text.toUpperCase();
  };

  const handleSuccess = (decodedText, html5QrCode, isMounted) => {
    const parsedShopId = extractShopId(decodedText);
    if (parsedShopId && isMounted) {
      setScannedResult(parsedShopId);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          if (isMounted) setIsScanning(false);
        }).catch(() => {});
      }
      setTimeout(() => {
        if (isMounted) {
          onScanSuccess(parsedShopId);
          onClose();
        }
      }, 600);
    }
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

        const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
        const onScan = (decodedText) => handleSuccess(decodedText, html5QrCode, isMounted);

        try {
          await html5QrCode.start({ facingMode: "environment" }, qrConfig, onScan, () => {});
          if (isMounted) setIsScanning(true);
        } catch (facingErr) {
          try {
            await html5QrCode.start({ facingMode: "user" }, qrConfig, onScan, () => {});
            if (isMounted) setIsScanning(true);
          } catch (userErr) {
            const devices = await Html5Qrcode.getCameras();
            if (!isMounted) return;

            if (!devices || devices.length === 0) {
              setCameraError('No video cameras detected. You can take a photo of the QR instead.');
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
        }
      } catch (err) {
        console.error('Camera QR scanner init error:', err);
        if (isMounted) {
          const isPerm = err?.name === 'NotAllowedError' || String(err).includes('Permission');
          setCameraError(
            isPerm
              ? 'Camera permission denied. Please allow access, or take a photo of the QR instead.'
              : 'Unable to open camera viewfinder. You can take a photo of the QR instead.'
          );
        }
      }
    }

    if (isOpen) {
      const timer = setTimeout(initScanner, 250);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          try {
            // Unconditionally try to stop, catching both sync and async errors
            // since scannerRef.current.isScanning might be undefined.
            const stopPromise = scannerRef.current.stop();
            if (stopPromise && stopPromise.then) {
              stopPromise.catch(() => {}).finally(() => {
                try { scannerRef.current.clear(); } catch (e) {}
              });
            } else {
              try { scannerRef.current.clear(); } catch (e) {}
            }
          } catch (e) {
            try { scannerRef.current.clear(); } catch (e2) {}
          }
        }
      };
    }
  }, [isOpen, onScanSuccess, onClose]);

  // Switch camera
  const handleSwitchCamera = async () => {
    if (!scannerRef.current) return;
    try {
      let devList = cameras;
      if (devList.length === 0) {
        devList = await Html5Qrcode.getCameras();
        setCameras(devList);
      }
      if (devList.length <= 1) return;

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      const nextIdx = (devList.findIndex(c => c.id === selectedCameraId) + 1) % devList.length;
      const nextCam = devList[nextIdx];
      setSelectedCameraId(nextCam.id);

      await scannerRef.current.start(
        nextCam.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleSuccess(decodedText, scannerRef.current, true),
        () => {}
      );
    } catch (e) {
      console.error('Error switching camera:', e);
    }
  };

  // Fallback: Scan from image file (triggers native camera on mobile)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(qrRegionId);
      } else if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }

      const decodedText = await scannerRef.current.scanFile(file, false);
      handleSuccess(decodedText, scannerRef.current, true);
    } catch (err) {
      console.error('Error scanning image:', err);
      alert('Could not find a valid QR code in the image. Please try again or enter the ID manually.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Shop Standee QR">
      <div className="flex flex-col items-center">

        {/* Viewfinder container */}
        <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black/90 border-2 border-[var(--line)] flex items-center justify-center shadow-inner mb-4">
          
          {/* We must ensure the div is always present for html5-qrcode to bind to it */}
          <div id={qrRegionId} className="w-full h-full" style={{ display: cameraError && !isScanning ? 'none' : 'block' }} />

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

          {/* Processing Image Loader */}
          {isProcessingImage && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-semibold">Scanning image...</p>
            </div>
          )}

          {/* Success Flash */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center text-white animate-in fade-in zoom-in duration-200 z-20">
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
          {cameraError && !scannedResult && !isProcessingImage && (
            <div className="absolute inset-0 bg-[var(--canvas)] p-6 flex flex-col items-center justify-center text-center z-10">
              <div className="w-12 h-12 rounded-full bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mb-3">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1">Camera Access Notice</p>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-5">{cameraError}</p>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="sx-button text-xs py-2 px-4 justify-center cursor-pointer shadow-sm bg-[var(--emerald)] text-white hover:bg-[var(--emerald)]"
              >
                <Camera size={13} className="text-white" /> Take Photo of QR
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Input for Native Camera/Image Scan Fallback */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden" 
        />

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
            >
              <UploadCloud size={14} /> Upload QR Image
            </button>

            {cameras.length > 1 && !cameraError && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] hover:bg-[var(--surface)] text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw size={14} /> Switch
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onManualEntryClick) onManualEntryClick();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
          >
            <Search size={14} /> Enter ID Manually
          </button>
          
        </div>

      </div>
    </Modal>
  );
}
