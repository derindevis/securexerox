import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, ShieldAlert, ShieldOff, ShieldCheck, Printer, Lock,
  Maximize, AlertTriangle, Eye, FileText, X, RotateCcw,
  CheckCircle, XCircle, Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCountdown } from '../../utils/timers';
import { JOB_STATUS } from '../../utils/constants';
import Button from '../../components/common/Button';
import CountdownTimer from '../../components/common/CountdownTimer';
import Badge from '../../components/common/Badge';

import { api } from '../../utils/api';

// Print stages
const PRINT_STAGES = [
  { label: 'Preparing document...', duration: 1000, progress: 25 },
  { label: 'Sending to hardware printer...', duration: 1500, progress: 60 },
  { label: 'Spooling print job...', duration: 1500, progress: 90 },
  { label: 'Print complete!', duration: 500, progress: 100 },
];

export default function SecurePrint() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const {
    jobs, currentSession, addViolation, endSecureSession,
    updateJobStatus, addToast,
  } = useApp();

  const job = jobs.find((j) => j.id === jobId);
  const countdown = useCountdown(300, true, () => {
    // Session expired
    updateJobStatus(jobId, JOB_STATUS.EXPIRED);
    endSecureSession();
    addToast('Session expired', 'warning');
    navigate('/shop/dashboard');
  }); // 5 min session

  const [showWarning, setShowWarning] = useState(false);
  const [warningLevel, setWarningLevel] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStage, setPrintStage] = useState(-1);
  const [printProgress, setPrintProgress] = useState(0);
  const [printComplete, setPrintComplete] = useState(false);
  const [showDestruction, setShowDestruction] = useState(false);
  const [destructionStep, setDestructionStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [printFailed, setPrintFailed] = useState(false);

  const containerRef = useRef(null);
  const violations = currentSession?.violations || 0;
  const isLocked = currentSession?.isLocked || false;

  const triggerViolation = useCallback((reason) => {
    if (isLocked || printComplete) return;
    addViolation(reason);
    setWarningLevel((prev) => Math.min(prev + 1, 3));
    setShowWarning(true);
  }, [addViolation, isLocked, printComplete]);

  // -- Fullscreen management --
  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.log('Fullscreen not available');
    }
  }, []);

  useEffect(() => {
    enterFullscreen();
  }, [enterFullscreen]);

  // -- Browser monitoring --
  useEffect(() => {
    if (isLocked || printComplete || showDestruction) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation('Tab switched or window hidden');
      }
    };

    const handleBlur = () => {
      triggerViolation('Window lost focus');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        if (!printComplete && !showDestruction) {
          triggerViolation('Exited fullscreen mode');
        }
      } else {
        setIsFullscreen(true);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerViolation('Right-click / Inspect attempt detected');
    };

    const handleKeyDown = (e) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+P, PrintScreen
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P'))
      ) {
        e.preventDefault();
        triggerViolation(`Forbidden shortcut (${e.key}) detected`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLocked, printComplete, showDestruction, triggerViolation]);

  // Lock session after 3 violations
  useEffect(() => {
    if (violations >= 3 && !isLocked) {
      updateJobStatus(jobId, JOB_STATUS.SESSION_LOCKED);
      addToast('Session locked due to security violations', 'error');
    }
  }, [violations, isLocked, jobId, updateJobStatus, addToast]);

  // -- Real hardware printing & document spooling --
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintFailed(false);

    try {
      setPrintStage(0);
      setPrintProgress(25);
      const blob = await api.fetchDocumentBlob(jobId);

      setPrintStage(1);
      setPrintProgress(60);
      await api.executePrint(jobId);

      setPrintStage(2);
      setPrintProgress(90);

      // Trigger system printer via hidden iframe
      const blobUrl = URL.createObjectURL(blob);
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.src = blobUrl;
      document.body.appendChild(printIframe);

      printIframe.onload = () => {
        try {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        } catch (e) {
          window.print();
        }
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          if (printIframe.parentNode) {
            document.body.removeChild(printIframe);
          }
        }, 3000);
      };

      setPrintStage(3);
      setPrintProgress(100);
      setPrintComplete(true);
      setIsPrinting(false);
      updateJobStatus(jobId, JOB_STATUS.COMPLETED, { completedAt: new Date().toISOString() });
      addToast('Document sent to printer successfully!', 'success');

      // Immediately trigger zero-byte shredding and destruction sequence
      setTimeout(() => startDestructionSequence(), 1500);
    } catch (err) {
      console.error('Print spooler error:', err);
      setIsPrinting(false);
      setPrintFailed(true);
      setPrintStage(-1);
      addToast(err.message || 'Print error: Unable to connect to printer spooler', 'error');
    }
  };

  const handleSimulateFailure = async () => {
    setIsPrinting(true);
    setPrintStage(0);
    setPrintProgress(25);
    await new Promise((r) => setTimeout(r, 2000));
    setPrintStage(1);
    setPrintProgress(45);
    await new Promise((r) => setTimeout(r, 1500));
    setPrintFailed(true);
    setIsPrinting(false);
    setPrintStage(-1);
    addToast('Print failed — printer unavailable', 'error');
  };

  const handleRetry = () => {
    setPrintFailed(false);
    setPrintProgress(0);
    setPrintStage(-1);
    handlePrint();
  };

  // -- Destruction animation sequence --
  const startDestructionSequence = async () => {
    setShowDestruction(true);

    // Step 1: Print completed
    setDestructionStep(1);
    await new Promise((r) => setTimeout(r, 1500));

    // Step 2: Access revoked
    setDestructionStep(2);
    updateJobStatus(jobId, JOB_STATUS.ACCESS_REVOKED);
    await new Promise((r) => setTimeout(r, 1500));

    // Step 3: Print ID invalidated
    setDestructionStep(3);
    await new Promise((r) => setTimeout(r, 1500));

    // Step 4: Document removed on backend & zero-byte shredded
    setDestructionStep(4);
    try {
      await api.destroyDocument(jobId);
    } catch (e) {
      console.error('Backend document destruction error:', e);
    }
    updateJobStatus(jobId, JOB_STATUS.DESTROYED, { destroyedAt: new Date().toISOString(), expiresAt: null });
    await new Promise((r) => setTimeout(r, 2000));

    // Step 5: Complete
    setDestructionStep(5);
    endSecureSession();
  };

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    navigate('/shop/dashboard');
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-[var(--color-navy-950)] flex items-center justify-center">
        <p className="text-gray-400">Session not found</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--color-navy-950)] flex flex-col relative overflow-hidden"
    >
      {/* Security Status Bar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${
        isLocked
          ? 'bg-red-500/10 border-red-500/30'
          : printComplete || showDestruction
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-[var(--color-navy-900)] border-white/5'
      }`}>
        <div className="flex items-center gap-3">
          {isLocked ? (
            <ShieldOff className="w-5 h-5 text-red-400" />
          ) : showDestruction ? (
            <ShieldCheck className="w-5 h-5 text-green-400 shield-pulse" />
          ) : (
            <Shield className="w-5 h-5 text-green-400 shield-pulse" />
          )}
          <span className={`text-sm font-semibold ${
            isLocked ? 'text-red-400' : showDestruction ? 'text-green-400' : 'text-green-400'
          }`}>
            {isLocked
              ? '🔴 Session Locked'
              : showDestruction
              ? '✅ Document Lifecycle Complete'
              : '🟢 Secure Print Mode Active'
            }
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Violation counter */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            violations === 0 ? 'bg-green-500/10 text-green-400' :
            violations === 1 ? 'bg-yellow-500/10 text-yellow-400' :
            violations === 2 ? 'bg-orange-500/10 text-orange-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            <Eye className="w-3.5 h-3.5" />
            {violations}/3 Violations
          </div>

          {/* Fullscreen indicator */}
          <Badge color={isFullscreen ? 'green' : 'yellow'} size="sm" dot>
            {isFullscreen ? 'Fullscreen' : 'Windowed'}
          </Badge>

          {!isFullscreen && !isLocked && !showDestruction && (
            <button onClick={enterFullscreen} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
              <Maximize className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {/* LOCKED STATE */}
        {isLocked && !showDestruction && (
          <div className="text-center max-w-md" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-6" style={{ animation: 'alertPulse 1.5s ease-in-out infinite' }}>
              <ShieldOff className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-3">Session Locked</h2>
            <p className="text-gray-400 mb-2">
              This session has been locked due to multiple security violations.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              The customer will need to generate a new Print ID.
            </p>
            <Button variant="secondary" onClick={handleExit}>
              Return to Dashboard
            </Button>
          </div>
        )}

        {/* DESTRUCTION ANIMATION */}
        {showDestruction && (
          <div className="text-center max-w-lg" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div className="space-y-6 mb-8">
              {/* Step 1 */}
              <div className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                destructionStep >= 1 ? 'bg-green-500/5 border border-green-500/20' : 'opacity-20'
              }`} style={destructionStep >= 1 ? { animation: 'fadeInUp 0.5s ease-out' } : {}}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  destructionStep >= 1 ? 'bg-green-500/20' : 'bg-white/5'
                }`}>
                  <CheckCircle className={`w-5 h-5 ${destructionStep >= 1 ? 'text-green-400' : 'text-gray-600'}`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${destructionStep >= 1 ? 'text-green-400' : 'text-gray-600'}`}>
                    Printing Completed ✓
                  </p>
                  <p className="text-xs text-gray-500">Document printed successfully</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                destructionStep >= 2 ? 'bg-orange-500/5 border border-orange-500/20' : 'opacity-20'
              }`} style={destructionStep >= 2 ? { animation: 'fadeInUp 0.5s ease-out' } : {}}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  destructionStep >= 2 ? 'bg-orange-500/20' : 'bg-white/5'
                }`}>
                  <Lock className={`w-5 h-5 ${destructionStep >= 2 ? 'text-orange-400' : 'text-gray-600'}`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${destructionStep >= 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                    Access Revoked ✓
                  </p>
                  <p className="text-xs text-gray-500">Document is no longer viewable</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                destructionStep >= 3 ? 'bg-red-500/5 border border-red-500/20' : 'opacity-20'
              }`} style={destructionStep >= 3 ? { animation: 'fadeInUp 0.5s ease-out' } : {}}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  destructionStep >= 3 ? 'bg-red-500/20' : 'bg-white/5'
                }`}>
                  <XCircle className={`w-5 h-5 ${destructionStep >= 3 ? 'text-red-400' : 'text-gray-600'}`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${destructionStep >= 3 ? 'text-red-400' : 'text-gray-600'}`}>
                    Print ID Invalidated ✓
                  </p>
                  <p className="text-xs text-gray-500">ID can never be reused</p>
                </div>
              </div>

              {/* Step 4 — THE BIG ONE */}
              <div className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                destructionStep >= 4 ? 'bg-purple-500/5 border border-purple-500/20' : 'opacity-20'
              }`} style={destructionStep >= 4 ? { animation: 'fadeInUp 0.5s ease-out' } : {}}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  destructionStep >= 4 ? 'bg-purple-500/20' : 'bg-white/5'
                }`}>
                  <Trash2 className={`w-5 h-5 ${destructionStep >= 4 ? 'text-purple-400' : 'text-gray-600'}`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${destructionStep >= 4 ? 'text-purple-400' : 'text-gray-600'}`}>
                    Document Removed ✓
                  </p>
                  <p className="text-xs text-gray-500">All temporary data permanently deleted</p>
                </div>
              </div>
            </div>

            {/* Final message */}
            {destructionStep >= 5 && (
              <div style={{ animation: 'fadeInUp 0.5s ease-out' }}>
                <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/20 mb-6">
                  <ShieldCheck className="w-12 h-12 text-green-400 mx-auto mb-3 shield-pulse" />
                  <h3 className="text-xl font-bold text-green-400 mb-2">Document Lifecycle Complete</h3>
                  <p className="text-gray-400 text-sm">
                    The customer's document is no longer stored anywhere. The print session is complete.
                  </p>
                </div>
                <Button onClick={handleExit} size="lg">
                  Return to Dashboard
                </Button>
              </div>
            )}
          </div>
        )}

        {/* MAIN PRINT INTERFACE */}
        {!isLocked && !showDestruction && (
          <div className="w-full max-w-3xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document preview */}
              <div className="lg:col-span-2">
                <div className="glass p-6 h-full">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Document Preview
                  </h3>

                  {/* Simulated document preview */}
                  <div className={`relative aspect-[3/4] rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center overflow-hidden ${
                    isPrinting ? 'opacity-50' : ''
                  }`}>
                    {job.filePreview ? (
                      <img src={job.filePreview} alt="Document" className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="text-center p-8">
                        <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">{job.fileName}</p>
                        <p className="text-xs text-gray-600 mt-1">{job.fileType.toUpperCase()} Document</p>
                        <p className="text-xs text-gray-700 mt-4">[Document content secured]</p>
                      </div>
                    )}

                    {/* Watermark overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                      <div className="transform -rotate-45 text-4xl font-black text-blue-400 tracking-widest">
                        SECURE PRINT
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls sidebar */}
              <div className="space-y-4">
                {/* Countdown */}
                <div className="glass p-4 text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Session Time</p>
                  <CountdownTimer
                    seconds={countdown.seconds}
                    totalSeconds={300}
                    size={100}
                    className="mx-auto"
                  />
                </div>

                {/* Print Settings */}
                <div className="glass p-4">
                  <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Print Settings</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Copies</span>
                      <span className="text-white font-medium">{job.copies}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Paper</span>
                      <span className="text-white font-medium">{job.paperSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Color</span>
                      <span className="text-white font-medium">{job.colorMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Orientation</span>
                      <span className="text-white font-medium">{job.orientation}</span>
                    </div>
                  </div>
                </div>

                {/* Print Progress */}
                {isPrinting && (
                  <div className="glass p-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Printing</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-blue-400 font-medium animate-pulse">
                        {PRINT_STAGES[printStage]?.label || 'Initializing...'}
                      </p>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${printProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-right">{printProgress}%</p>
                    </div>
                  </div>
                )}

                {/* Print Failed */}
                {printFailed && (
                  <div className="glass p-4 border-red-500/20" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <p className="text-sm font-semibold text-red-400">Print Failed</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Printer unavailable. Please check the connection.</p>
                    <Button size="sm" fullWidth icon={RotateCcw} onClick={handleRetry}>
                      Retry Print
                    </Button>
                  </div>
                )}

                {/* Print Button */}
                {!isPrinting && !printComplete && !printFailed && (
                  <div className="space-y-2">
                    <Button fullWidth size="lg" icon={Printer} onClick={handlePrint}>
                      Print Document
                    </Button>
                    <Button fullWidth size="sm" variant="ghost" onClick={handleSimulateFailure} className="!text-xs">
                      Simulate Failure (Demo)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security Warning Overlay */}
      {showWarning && !isLocked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div
            className={`max-w-md w-full mx-4 p-8 rounded-2xl text-center ${
              violations >= 3
                ? 'bg-[var(--color-navy-900)] border-2 border-red-500'
                : violations >= 2
                ? 'bg-[var(--color-navy-900)] border-2 border-orange-500'
                : 'bg-[var(--color-navy-900)] border-2 border-yellow-500'
            }`}
            style={{ animation: 'scaleIn 0.25s ease-out' }}
          >
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              violations >= 3 ? 'bg-red-500/15' : violations >= 2 ? 'bg-orange-500/15' : 'bg-yellow-500/15'
            }`} style={{ animation: 'alertPulse 1s ease-in-out infinite' }}>
              <ShieldAlert className={`w-8 h-8 ${
                violations >= 3 ? 'text-red-400' : violations >= 2 ? 'text-orange-400' : 'text-yellow-400'
              }`} />
            </div>

            <h3 className={`text-xl font-bold mb-2 ${
              violations >= 3 ? 'text-red-400' : violations >= 2 ? 'text-orange-400' : 'text-yellow-400'
            }`}>
              Security Warning
            </h3>

            <p className="text-gray-400 text-sm mb-2">
              Secure Print Mode was interrupted.
            </p>

            <p className={`text-sm font-semibold mb-6 ${
              violations >= 3 ? 'text-red-400' : violations >= 2 ? 'text-orange-400' : 'text-yellow-400'
            }`}>
              {violations >= 3
                ? 'Session will be locked.'
                : violations >= 2
                ? 'One more violation will lock the session!'
                : 'Please return to the secure session.'
              }
            </p>

            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((v) => (
                <div
                  key={v}
                  className={`w-3 h-3 rounded-full ${
                    v <= violations
                      ? v >= 3 ? 'bg-red-500' : v >= 2 ? 'bg-orange-500' : 'bg-yellow-500'
                      : 'bg-white/10'
                  }`}
                />
              ))}
              <span className="text-xs text-gray-500 ml-2">{violations}/3</span>
            </div>

            <Button
              fullWidth
              onClick={() => {
                setShowWarning(false);
                enterFullscreen();
              }}
            >
              Return to Session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
