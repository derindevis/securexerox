import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer, Lock, FileText, CheckCircle2,
  Trash2, ArrowLeft, Layers, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCountdown } from '../../utils/timers';
import { JOB_STATUS, formatFileSize } from '../../utils/constants';
import CountdownTimer from '../../components/common/CountdownTimer';
import { api } from '../../utils/api';

export default function SecurePrint() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { jobs, updateJobStatus, addToast } = useApp();

  const [job, setJob] = useState(() => jobs.find((j) => j.id === jobId) || null);
  const [loading, setLoading] = useState(!job);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStage, setPrintStage] = useState(0); // 0: idle, 1: sending to spooler, 2: complete
  const [errorMsg, setErrorMsg] = useState(null);

  // 5-minute ephemeral release timer
  const countdown = useCountdown(300, true, () => {
    updateJobStatus(jobId, JOB_STATUS.EXPIRED);
    addToast('Print release window expired. Files destroyed.', 'warning');
    navigate('/shop/dashboard');
  });

  // Fetch job details & metadata if not in memory
  useEffect(() => {
    let isMounted = true;
    async function loadJob() {
      try {
        const fetched = await api.getJob(jobId);
        if (isMounted) {
          setJob(fetched);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg('Failed to load job metadata or session expired.');
          setLoading(false);
        }
      }
    }
    if (!job) loadJob();
    return () => { isMounted = false; };
  }, [jobId, job]);

  // Execute print hardware command (Zero rendered document content)
  const handleExecutePrint = async () => {
    setIsPrinting(true);
    setErrorMsg(null);
    try {
      setPrintStage(1);
      // Calls backend direct print spooler endpoint
      await api.executePrint(jobId);
      setPrintStage(2);
      updateJobStatus(jobId, JOB_STATUS.COMPLETED);
      addToast('Print job spooled and physical session closed.', 'success');
    } catch (err) {
      console.error('Print execution failed:', err);
      setErrorMsg(err.message || 'Printer hardware error occurred.');
      setIsPrinting(false);
      setPrintStage(0);
    }
  };

  if (loading) {
    return (
      <main className="sx-page flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--ink)]/20 border-t-[var(--ink)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--ink-muted)]">Verifying one-time PIN authorization...</p>
        </div>
      </main>
    );
  }

  if (errorMsg && !job) {
    return (
      <main className="sx-page">
        <div className="sx-wrap sx-form text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h1 className="sx-title text-2xl mb-2">Access Denied or Expired</h1>
          <p className="sx-lede text-sm mb-6">{errorMsg}</p>
          <button onClick={() => navigate('/shop/dashboard')} className="sx-button justify-center">
            <ArrowLeft size={16} /> Return to Queue
          </button>
        </div>
      </main>
    );
  }

  const documents = job?.documents || [
    {
      id: job?.id || '1',
      fileName: job?.fileName || job?.file_name || 'Document',
      fileSize: job?.fileSize || job?.file_size || 0,
      copies: job?.copies || 1,
      paperSize: job?.paperSize || job?.paper_size || 'A4',
      colorMode: job?.colorMode || job?.color_mode || 'Black & White',
      orientation: job?.orientation || 'Portrait',
      pageRange: job?.pageRange || job?.page_range || 'All',
    }
  ];

  return (
    <main className="sx-page">
      <div className="sx-wrap max-w-3xl">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => navigate('/shop/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] mb-2 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h1 className="sx-title" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', margin: 0 }}>
              Authorized Print <em>Execution</em>
            </h1>
            <p className="text-xs text-[var(--ink-muted)] mt-1 font-mono">
              JOB ID: {job?.print_id || job?.printId || jobId} • ZERO-RENDER MODE
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CountdownTimer secondsLeft={countdown.secondsLeft} isRunning={!printStage} />
          </div>
        </div>

        {/* ── Metadata-Only Job Card (No document content is rendered) ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 mb-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[var(--ink)]" />
              <span className="font-semibold text-sm text-[var(--ink)]">
                Batch Print Specifications ({documents.length} {documents.length === 1 ? 'file' : 'files'})
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-muted)] text-[var(--ink-muted)] border border-[var(--line)]">
              Authorized via Customer PIN
            </span>
          </div>

          {/* Document list */}
          <div className="flex flex-col gap-3">
            {documents.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--line)] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--surface-muted)] text-[var(--ink)] shrink-0 mt-0.5">
                    <FileText size={18} />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-[var(--ink)] block truncate max-w-sm">
                      {doc.fileName}
                    </strong>
                    <span className="text-xs text-[var(--ink-muted)]">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-1 rounded bg-[var(--surface-muted)] text-[var(--ink)] border border-[var(--line)]">
                    {doc.copies} {doc.copies === 1 ? 'Copy' : 'Copies'}
                  </span>
                  <span className="px-2 py-1 rounded bg-[var(--surface-muted)] text-[var(--ink)] border border-[var(--line)]">
                    {doc.paperSize}
                  </span>
                  <span className={`px-2 py-1 rounded border ${doc.colorMode === 'Color' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold' : 'bg-[var(--surface-muted)] text-[var(--ink)] border-[var(--line)]'}`}>
                    {doc.colorMode}
                  </span>
                  <span className="px-2 py-1 rounded bg-[var(--surface-muted)] text-[var(--ink-muted)] border border-[var(--line)]">
                    {doc.orientation}
                  </span>
                  {doc.pageRange && doc.pageRange !== 'All' && (
                    <span className="px-2 py-1 rounded bg-[var(--surface-muted)] text-[var(--ink-muted)] border border-[var(--line)]">
                      Pages: {doc.pageRange}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Privacy Footnote */}
          <div className="mt-4 pt-4 border-t border-[var(--line)] flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <ShieldCheck size={14} className="text-[var(--emerald)] shrink-0" />
            <span>Document content is piped directly to the printer spooler without being rendered or cached on this display.</span>
          </div>
        </div>

        {/* ── Action / Print Execution Stage ── */}
        {printStage === 2 ? (
          <div className="p-6 rounded-2xl bg-[var(--emerald-soft)] border border-[var(--emerald)]/20 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--emerald)] text-white flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-lg font-semibold text-[var(--ink)] mb-1">Print Job Completed & Ephemeral Files Purged</h2>
            <p className="text-xs text-[var(--ink-muted)] mb-5">
              Decryption keys have been purged from memory. Session closed permanently.
            </p>
            <button onClick={() => navigate('/shop/dashboard')} className="sx-button justify-center mx-auto">
              Return to Shop Dashboard
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] text-xs flex items-center gap-2 border border-[var(--danger)]/20">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleExecutePrint}
              disabled={isPrinting}
              className="sx-button sx-button--lg w-full justify-center py-4 text-base font-semibold shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPrinting ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--canvas)]/30 border-t-[var(--canvas)] rounded-full animate-spin" />
                  Spooling to Hardware Printer...
                </>
              ) : (
                <>
                  <Printer size={18} />
                  Execute Direct Print
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
