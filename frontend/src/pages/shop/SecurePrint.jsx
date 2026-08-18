import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, ShieldAlert, ShieldOff, ShieldCheck, Printer, Lock,
  Maximize, AlertTriangle, Eye, FileText, RotateCcw,
  CheckCircle, XCircle, Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCountdown } from '../../utils/timers';
import { JOB_STATUS } from '../../utils/constants';
import CountdownTimer from '../../components/common/CountdownTimer';

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
    updateJobStatus(jobId, JOB_STATUS.EXPIRED);
    endSecureSession();
    addToast('Session expired', 'warning');
    navigate('/shop/dashboard');
  });

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

  // -- Real hardware printing --
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
    setDestructionStep(1);
    await new Promise((r) => setTimeout(r, 1500));
    setDestructionStep(2);
    updateJobStatus(jobId, JOB_STATUS.ACCESS_REVOKED);
    await new Promise((r) => setTimeout(r, 1500));
    setDestructionStep(3);
    await new Promise((r) => setTimeout(r, 1500));
    setDestructionStep(4);
    try { await api.destroyDocument(jobId); } catch (e) { console.error('Backend document destruction error:', e); }
    updateJobStatus(jobId, JOB_STATUS.DESTROYED, { destroyedAt: new Date().toISOString(), expiresAt: null });
    await new Promise((r) => setTimeout(r, 2000));
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
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center">
        <p className="text-[var(--ink-secondary)]">Session not found</p>
      </div>
    );
  }

  // Destruction step configs for light mode
  const destructionSteps = [
    { step: 1, icon: CheckCircle, label: 'Printing Completed ✓', desc: 'Document printed successfully', color: 'var(--emerald)', soft: 'var(--emerald-soft)' },
    { step: 2, icon: Lock, label: 'Access Revoked ✓', desc: 'Document is no longer viewable', color: 'var(--amber)', soft: 'var(--amber-soft)' },
    { step: 3, icon: XCircle, label: 'Print ID Invalidated ✓', desc: 'ID can never be reused', color: 'var(--danger)', soft: 'var(--danger-soft)' },
    { step: 4, icon: Trash2, label: 'Document Removed ✓', desc: 'All temporary data permanently deleted', color: 'var(--ink)', soft: 'var(--sage)' },
  ];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--canvas)] flex flex-col relative overflow-hidden"
    >
      {/* Security Status Bar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${
        isLocked
          ? 'bg-[var(--danger-soft)] border-[var(--danger)]/20'
          : printComplete || showDestruction
          ? 'bg-[var(--emerald-soft)] border-[var(--emerald)]/20'
          : 'bg-[var(--surface)] border-[var(--line)]'
      }`}>
        <div className="flex items-center gap-3">
          {isLocked ? (
            <ShieldOff className="w-5 h-5 text-[var(--danger)]" />
          ) : showDestruction ? (
            <ShieldCheck className="w-5 h-5 text-[var(--emerald)]" />
          ) : (
            <Shield className="w-5 h-5 text-[var(--emerald)]" />
          )}
          <span className={`text-sm font-semibold ${
            isLocked ? 'text-[var(--danger)]' : 'text-[var(--emerald)]'
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
            violations === 0 ? 'bg-[var(--emerald-soft)] text-[var(--emerald)]' :
            violations === 1 ? 'bg-[var(--amber-soft)] text-[var(--amber)]' :
            violations === 2 ? 'bg-[var(--amber-soft)] text-[var(--amber)]' :
            'bg-[var(--danger-soft)] text-[var(--danger)]'
          }`}>
            <Eye className="w-3.5 h-3.5" />
            {violations}/3 Violations
          </div>

          {/* Fullscreen indicator */}
          <span className={`sx-badge ${isFullscreen ? 'sx-badge--success' : 'sx-badge--warning'}`}>
            <span className="sx-badge__dot" />
            {isFullscreen ? 'Fullscreen' : 'Windowed'}
          </span>

          {!isFullscreen && !isLocked && !showDestruction && (
            <button onClick={enterFullscreen} className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-black/5 transition-colors cursor-pointer">
              <Maximize className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {/* LOCKED STATE */}
        {isLocked && !showDestruction && (
          <div className="text-center max-w-md" style={{ animation: 'sxSlideUp 0.3s var(--ease-out-expo)' }}>
            <div className="w-20 h-20 rounded-full bg-[var(--danger-soft)] flex items-center justify-center mx-auto mb-6">
              <ShieldOff className="w-10 h-10 text-[var(--danger)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--danger)] mb-3">Session Locked</h2>
            <p className="text-[var(--ink-secondary)] mb-2">
              This session has been locked due to multiple security violations.
            </p>
            <p className="text-sm text-[var(--ink-muted)] mb-8">
              The customer will need to generate a new Print ID.
            </p>
            <button className="sx-button sx-button--ghost" onClick={handleExit}>
              Return to Dashboard
            </button>
          </div>
        )}

        {/* DESTRUCTION ANIMATION */}
        {showDestruction && (
          <div className="text-center max-w-lg" style={{ animation: 'sxFadeIn 0.5s var(--ease-out-expo)' }}>
            <div className="space-y-4 mb-8">
              {destructionSteps.map(({ step, icon: Icon, label, desc, color, soft }) => (
                <div
                  key={step}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                    destructionStep >= step ? 'border' : 'opacity-20'
                  }`}
                  style={destructionStep >= step
                    ? { borderColor: `${color}30`, background: soft, animation: 'sxSlideUp 0.5s var(--ease-out-expo)' }
                    : {}
                  }
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: destructionStep >= step ? soft : 'var(--sage)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: destructionStep >= step ? color : 'var(--ink-muted)' }} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm" style={{ color: destructionStep >= step ? color : 'var(--ink-muted)' }}>
                      {label}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Final message */}
            {destructionStep >= 5 && (
              <div style={{ animation: 'sxSlideUp 0.5s var(--ease-out-expo)' }}>
                <div className="p-6 rounded-2xl bg-[var(--emerald-soft)] border border-[var(--emerald)]/20 mb-6">
                  <ShieldCheck className="w-12 h-12 text-[var(--emerald)] mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-[var(--emerald)] mb-2">Document Lifecycle Complete</h3>
                  <p className="text-[var(--ink-secondary)] text-sm">
                    The customer's document is no longer stored anywhere. The print session is complete.
                  </p>
                </div>
                <button className="sx-button sx-button--lg" onClick={handleExit}>
                  Return to Dashboard
                </button>
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
                <div className="sx-panel h-full">
                  <h3 className="text-sm font-semibold text-[var(--ink-secondary)] mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Document Preview
                  </h3>

                  <div className={`relative aspect-[3/4] rounded-xl bg-[var(--sage)] border border-[var(--line)] flex items-center justify-center overflow-hidden ${
                    isPrinting ? 'opacity-50' : ''
                  }`}>
                    {job.filePreview ? (
                      <img src={job.filePreview} alt="Document" className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="text-center p-8">
                        <FileText className="w-16 h-16 text-[var(--ink-muted)] mx-auto mb-4" />
                        <p className="text-[var(--ink-secondary)] font-medium">{job.fileName}</p>
                        <p className="text-xs text-[var(--ink-muted)] mt-1">{job.fileType.toUpperCase()} Document</p>
                        <p className="text-xs text-[var(--ink-muted)] mt-4">[Document content secured]</p>
                      </div>
                    )}

                    {/* Watermark overlay */}
                    <div className="sx-watermark">
                      <span>SECURE PRINT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls sidebar */}
              <div className="space-y-4">
                {/* Countdown */}
                <div className="sx-panel text-center">
                  <p className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-3">Session Time</p>
                  <CountdownTimer
                    seconds={countdown.seconds}
                    totalSeconds={300}
                    size={100}
                    className="mx-auto"
                  />
                </div>

                {/* Print Settings */}
                <div className="sx-panel">
                  <h4 className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-3">Print Settings</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      ['Copies', job.copies],
                      ['Paper', job.paperSize],
                      ['Color', job.colorMode],
                      ['Orientation', job.orientation],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-[var(--ink-muted)]">{label}</span>
                        <span className="text-[var(--ink)] font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Progress */}
                {isPrinting && (
                  <div className="sx-panel" style={{ animation: 'sxFadeIn 0.3s var(--ease-out-expo)' }}>
                    <h4 className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-3">Printing</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-[var(--blue)] font-medium animate-pulse">
                        {PRINT_STAGES[printStage]?.label || 'Initializing...'}
                      </p>
                      <div className="h-2 rounded-full bg-[var(--sage)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--blue)] rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${printProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--ink-muted)] text-right">{printProgress}%</p>
                    </div>
                  </div>
                )}

                {/* Print Failed */}
                {printFailed && (
                  <div className="sx-panel !border-[var(--danger)]/20" style={{ animation: 'sxFadeIn 0.3s var(--ease-out-expo)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-[var(--danger)]" />
                      <p className="text-sm font-semibold text-[var(--danger)]">Print Failed</p>
                    </div>
                    <p className="text-xs text-[var(--ink-muted)] mb-3">Printer unavailable. Please check the connection.</p>
                    <button className="sx-button sx-button--sm w-full" onClick={handleRetry}>
                      <RotateCcw size={14} /> Retry Print
                    </button>
                  </div>
                )}

                {/* Print Button */}
                {!isPrinting && !printComplete && !printFailed && (
                  <div className="space-y-2">
                    <button className="sx-button sx-button--lg w-full" onClick={handlePrint}>
                      <Printer size={16} /> Print Document
                    </button>
                    <button className="sx-button sx-button--ghost sx-button--sm w-full" onClick={handleSimulateFailure}>
                      Simulate Failure (Demo)
                    </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(247, 245, 240, 0.85)', backdropFilter: 'blur(8px)', animation: 'sxFadeIn 0.2s var(--ease-out-expo)' }}
        >
          <div
            className={`max-w-md w-full mx-4 p-8 rounded-2xl text-center bg-[var(--surface)] border-2 ${
              violations >= 3 ? 'border-[var(--danger)]' : violations >= 2 ? 'border-[var(--amber)]' : 'border-[var(--amber)]'
            }`}
            style={{ animation: 'sxSlideUp 0.25s var(--ease-out-expo)', boxShadow: 'var(--shadow-xl)' }}
          >
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              violations >= 3 ? 'bg-[var(--danger-soft)]' : 'bg-[var(--amber-soft)]'
            }`}>
              <ShieldAlert className={`w-8 h-8 ${
                violations >= 3 ? 'text-[var(--danger)]' : 'text-[var(--amber)]'
              }`} />
            </div>

            <h3 className={`text-xl font-bold mb-2 ${
              violations >= 3 ? 'text-[var(--danger)]' : 'text-[var(--amber)]'
            }`}>
              Security Warning
            </h3>

            <p className="text-[var(--ink-secondary)] text-sm mb-2">
              Secure Print Mode was interrupted.
            </p>

            <p className={`text-sm font-semibold mb-6 ${
              violations >= 3 ? 'text-[var(--danger)]' : 'text-[var(--amber)]'
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
                      ? v >= 3 ? 'bg-[var(--danger)]' : 'bg-[var(--amber)]'
                      : 'bg-[var(--line)]'
                  }`}
                />
              ))}
              <span className="text-xs text-[var(--ink-muted)] ml-2">{violations}/3</span>
            </div>

            <button
              className="sx-button w-full"
              onClick={() => {
                setShowWarning(false);
                enterFullscreen();
              }}
            >
              Return to Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
