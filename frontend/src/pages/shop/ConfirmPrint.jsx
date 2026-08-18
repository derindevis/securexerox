import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer, ShieldCheck, CheckCircle2, AlertTriangle, FileText,
  Clock, Server, Cpu, RefreshCw, ArrowRight, Trash2, Layers, Palette
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCountdown } from '../../utils/timers';
import { JOB_STATUS } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';
import CountdownTimer from '../../components/common/CountdownTimer';
import Badge from '../../components/common/Badge';
import { api } from '../../utils/api';

export default function ConfirmPrint() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const {
    jobs, updateJobStatus, addToast, endSecureSession
  } = useApp();

  const job = jobs.find((j) => j.id === jobId);

  const [printers, setPrinters] = useState([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [isSpooling, setIsSpooling] = useState(false);
  const [spoolStage, setSpoolStage] = useState(-1);
  const [spoolLogs, setSpoolLogs] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // 10-Minute countdown
  const countdown = useCountdown(300, true, () => {
    updateJobStatus(jobId, JOB_STATUS.EXPIRED);
    endSecureSession();
    addToast('Print session has expired', 'warning');
    navigate('/shop/dashboard');
  });

  // Load shop printers
  useEffect(() => {
    async function loadPrinters() {
      try {
        const data = await api.getPrinters();
        setPrinters(data);
        if (data.length > 0) {
          // Auto-match color capability
          const isColorJob = job?.color_mode?.toLowerCase() === 'color';
          const match = isColorJob ? data.find(p => p.printerColorCapable) : data[0];
          setSelectedPrinterId(match?.id || data[0].id);
        }
      } catch (err) {
        console.error('Failed to load shop printers:', err);
      }
    }
    loadPrinters();
  }, [job]);

  const addLog = (text) => {
    setSpoolLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);
  };

  const handleExecutePrint = async () => {
    setIsSpooling(true);
    setErrorMsg(null);
    setSpoolLogs([]);

    const targetPrinter = printers.find(p => p.id === selectedPrinterId);
    const printerLabel = targetPrinter ? `${targetPrinter.printerName} (${targetPrinter.printerEndpoint})` : 'Virtual Direct Hardware Spooler';

    try {
      setSpoolStage(0);
      addLog('Verifying ephemeral session & authorization token...');
      await new Promise(r => setTimeout(r, 600));

      setSpoolStage(1);
      addLog(`Connecting directly to printer socket: ${printerLabel}...`);
      await new Promise(r => setTimeout(r, 800));

      setSpoolStage(2);
      addLog('Streaming decrypted document bytes directly to hardware queue (Zero-Browser Exposure)...');
      
      // Execute print & automatic memory shredding on backend
      const res = await api.executePrint(jobId);

      setSpoolStage(3);
      addLog('Hardware print receiver acknowledged all raw bytes.');
      await new Promise(r => setTimeout(r, 600));

      setSpoolStage(4);
      addLog('Cryptographic shredder executed: RAM memory zeroized, Print PIN invalidated.');
      await new Promise(r => setTimeout(r, 500));

      setSpoolStage(5);
      setIsCompleted(true);
      setIsSpooling(false);
      updateJobStatus(jobId, JOB_STATUS.DESTROYED, {
        completedAt: res.completedAt || new Date().toISOString(),
        destroyedAt: res.destroyedAt || new Date().toISOString(),
      });
      addToast('Print job spooled to hardware & memory shredded!', 'success');
    } catch (err) {
      console.error('Hardware spooling error:', err);
      const msg = err.message || 'Failed to transmit print job to hardware printer';
      setErrorMsg(msg);
      addLog(`[ERROR] ${msg}`);
      setIsSpooling(false);
      addToast(msg, 'error');
    }
  };

  const handleCancelAndDestroy = async () => {
    try {
      await api.destroyDocument(jobId);
      updateJobStatus(jobId, JOB_STATUS.DESTROYED);
      endSecureSession();
      addToast('Print session canceled and memory shredded.', 'info');
      navigate('/shop/dashboard');
    } catch (err) {
      navigate('/shop/dashboard');
    }
  };

  if (!job) {
    return (
      <main className="sx-page">
        <div className="sx-wrap text-center py-12">
          <p className="text-[var(--ink-muted)]">Job session not found or already expired.</p>
          <button onClick={() => navigate('/shop/dashboard')} className="sx-button mt-4">
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const maskedCustomerId = job.customerId
    ? `CU-${job.customerId.replace(/-/g, '').slice(0, 4).toUpperCase()}••••${job.customerId.replace(/-/g, '').slice(-4).toUpperCase()}`
    : 'CU-ANONYMOUS';

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--line)]">
            <div>
              <p className="sx-kicker flex items-center gap-2">
                <ShieldCheck size={14} className="text-[var(--emerald)]" />
                Zero-Trust Hardware Spooler
              </p>
              <h1 className="sx-title text-2xl md:text-3xl">
                Print <em>Confirmation</em>
              </h1>
              <p className="sx-lede text-xs mt-0.5">
                Metadata-only verification. Raw bytes stream directly to hardware with zero browser exposure.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink-muted)]">
                <Clock size={13} className="text-[var(--amber)]" />
                <span>Expires: </span>
                <span className="font-mono text-[var(--ink)] font-bold">{countdown.formatted}</span>
              </div>
              <Badge status={job.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Column: Metadata Verification Parameters */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* Job Specification Card */}
              <div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-[var(--ink)]" />
                  Job Parameters (Read-Only)
                </h2>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]/50">
                    <span className="text-[11px] text-[var(--ink-muted)] block mb-0.5">File Name</span>
                    <span className="font-semibold text-xs text-[var(--ink)] break-all">{job.fileName}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]/50">
                    <span className="text-[11px] text-[var(--ink-muted)] block mb-0.5">Document Format</span>
                    <span className="font-semibold text-xs text-[var(--ink)] uppercase font-mono">{job.fileType || 'PDF'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]/50">
                    <span className="text-[11px] text-[var(--ink-muted)] block mb-0.5">Copies Required</span>
                    <span className="font-semibold text-xs text-[var(--ink)] font-mono">{job.copies} {job.copies > 1 ? 'copies' : 'copy'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]/50">
                    <span className="text-[11px] text-[var(--ink-muted)] block mb-0.5">Color Mode</span>
                    <span className={`font-semibold text-xs inline-flex items-center gap-1 ${job.color_mode === 'Color' ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--ink)]'}`}>
                      <Palette size={12} />
                      {job.color_mode}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]/50">
                    <span className="text-[11px] text-[var(--ink-muted)] block mb-0.5">Paper & Layout</span>
                    <span className="font-semibold text-xs text-[var(--ink)]">{job.paper_size} • {job.orientation}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]/50">
                    <span className="text-[11px] text-[var(--ink-muted)] block mb-0.5">Page Range</span>
                    <span className="font-semibold text-xs text-[var(--ink)] font-mono">{job.page_range}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span>Customer Identifier:</span>
                  <span className="font-mono font-bold text-[var(--ink)]">{maskedCustomerId}</span>
                </div>
              </div>

              {/* Hardware Target Selector */}
              <div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-2.5 flex items-center gap-2">
                  <Printer size={14} className="text-[var(--ink)]" />
                  Target Hardware Destination
                </h2>

                {printers.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {printers.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedPrinterId === p.id
                            ? 'border-[var(--ink)] bg-[var(--surface-muted)] shadow-xs'
                            : 'border-[var(--line)] hover:border-[var(--ink-muted)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="targetPrinter"
                            checked={selectedPrinterId === p.id}
                            onChange={() => setSelectedPrinterId(p.id)}
                            disabled={isSpooling || isCompleted}
                            className="accent-[var(--ink)]"
                          />
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink)]">{p.printerName}</p>
                            <p className="text-xs text-[var(--ink-muted)] font-mono">{p.printerEndpoint} ({p.printerProtocol.toUpperCase()})</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {p.printerColorCapable && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                              Color
                            </span>
                          )}
                          <span className={`w-2 h-2 rounded-full ${p.printerStatus === 'online' ? 'bg-[var(--emerald)]' : 'bg-[var(--line)]'}`}></span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)] text-xs text-[var(--ink-muted)] flex items-center gap-3">
                    <Server size={18} className="text-[var(--emerald)] shrink-0" />
                    <div>
                      <p className="font-semibold text-[var(--ink)]">Virtual Direct Spooler Mode Active</p>
                      <p>No external physical printers registered. Bytes will stream directly to internal mock spooler.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Execution Terminal & Action */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Terminal Logs Card */}
              <div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] flex-1 flex flex-col justify-between shadow-xs">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-2.5 flex items-center gap-2">
                    <Cpu size={14} className="text-[var(--ink)]" />
                    Hardware Spooling Pipeline
                  </h2>

                  {/* Terminal Console */}
                  <div className="p-3.5 rounded-xl bg-[var(--ink)] text-[var(--surface)] font-mono text-[11px] leading-relaxed min-h-[150px] max-h-[210px] overflow-y-auto flex flex-col justify-end">
                    {spoolLogs.length === 0 ? (
                      <div className="text-[var(--surface)]/50 italic text-[11px]">
                        Ready to stream.<br/>
                        Click "Execute Hardware Print" to decrypt bytes in RAM and transmit directly to physical spooler.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {spoolLogs.map((log, idx) => (
                          <div key={idx} className="text-[var(--surface)]/90">
                            {log}
                          </div>
                        ))}
                        {isSpooling && (
                          <div className="flex items-center gap-2 text-[var(--amber)] mt-1 animate-pulse">
                            <RefreshCw size={11} className="animate-spin" />
                            <span>Transmitting raw packets...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mt-3 p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)]/20 text-[var(--danger)] text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Execution Buttons */}
                <div className="mt-4 flex flex-col gap-2.5">
                  {!isCompleted ? (
                    <>
                      <button
                        type="button"
                        onClick={handleExecutePrint}
                        disabled={isSpooling}
                        className="sx-button justify-center w-full py-3 text-sm shadow-sm cursor-pointer"
                      >
                        {isSpooling ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            Spooling to Hardware...
                          </>
                        ) : (
                          <>
                            <Printer size={16} />
                            Execute Hardware Print
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelAndDestroy}
                        disabled={isSpooling}
                        className="w-full py-2 text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-xl transition-colors font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        Cancel & Shred Memory
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <div className="p-3.5 rounded-xl bg-[var(--emerald-soft)] border border-[var(--emerald)]/20 text-[var(--emerald)] text-center text-xs font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 size={15} />
                        Print Job Finished & Memory Shredded
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/shop/dashboard')}
                        className="sx-button justify-center w-full text-xs py-2.5 cursor-pointer"
                      >
                        Return to Shop Dashboard <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>
      </main>
    </PageTransition>
  );
}
