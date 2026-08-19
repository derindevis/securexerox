import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ScanLine, ShieldCheck, Layers, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatPrintIdInput, isValidPrintIdFormat } from '../../utils/printId';
import PageTransition from '../../components/common/PageTransition';
import { api } from '../../utils/api';

export default function PrintDocument() {
  const [id, setId] = useState('');
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { getJobByPrintId, startSecureSession, fetchJobs } = useApp();
  const nav = useNavigate();

  const verify = async () => {
    const cleanId = id.trim().toUpperCase();
    if (!isValidPrintIdFormat(cleanId)) {
      setError('Enter an ID in the format SX-XXXXXX.');
      return;
    }

    setIsVerifying(true);
    setError('');
    setJob(null);

    try {
      // 1. Verify directly against backend database & claim Universal Print ID
      const verifiedJob = await api.verifyPrintId(cleanId);
      setJob(verifiedJob);
      setError('');
      fetchJobs(); // Sync queue in background
    } catch (err) {
      // 2. Fallback to local memory if offline
      const found = getJobByPrintId(cleanId);
      if (found && !['DESTROYED', 'EXPIRED', 'COMPLETED', 'ACCESS_REVOKED', 'SESSION_LOCKED'].includes(found.status)) {
        setJob(found);
        setError('');
      } else {
        setError(err.message || 'This Print ID is not available or has expired.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const begin = async () => {
    if (!job) return;
    await startSecureSession(job.id, job.printId);
    nav(`/shop/confirm-print/${job.id}`);
  };

  const docCount = job?.documents?.length || 1;
  const primaryDoc = job?.documents?.[0];
  const displayFileName = docCount > 1 
    ? `${primaryDoc?.fileName || 'Document'} + ${docCount - 1} more (${docCount} files)`
    : primaryDoc?.fileName || job?.fileName || 'Document';

  const displayType = primaryDoc?.fileType || job?.fileType || 'PDF';
  const totalCopies = job?.documents?.reduce((s, d) => s + (d.copies || 1), 0) || job?.copies || 1;
  const displayPaper = primaryDoc?.paperSize || job?.paperSize || 'A4';
  const displayColor = primaryDoc?.colorMode || job?.colorMode || 'Black & White';

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap sx-form">
          <p className="sx-kicker">Operator verification</p>
          <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
            Start with<br /><em>permission.</em>
          </h1>
          <p className="sx-lede">Enter the customer's temporary 6-digit Print ID to open a secure printing session.</p>

          <section className="sx-panel mt-8">
            <div className="sx-field">
              <label htmlFor="print-id">Customer Print ID</label>
              <input
                id="print-id"
                style={{ fontFamily: 'var(--mono)', letterSpacing: '0.18em', fontSize: '1.25rem' }}
                value={id}
                onChange={(e) => { setId(formatPrintIdInput(e.target.value)); setJob(null); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && verify()}
                placeholder="SX-XXXXXX"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-[var(--danger)] mt-2">{error}</p>}
            <button 
              type="button"
              onClick={verify} 
              disabled={isVerifying}
              className="sx-button mt-5 w-full justify-center cursor-pointer disabled:opacity-60"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--canvas)]/30 border-t-[var(--canvas)] rounded-full animate-spin" />
                  Verifying ID...
                </>
              ) : (
                <>
                  <ScanLine size={16} /> Verify Print ID
                </>
              )}
            </button>
          </section>

          {job && (
            <section className="sx-panel mt-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--emerald-soft)] text-[var(--emerald)] border border-[var(--emerald)]/20">
                  <ShieldCheck size={24} />
                </div>
                <div className="min-w-0">
                  <p className="sx-status">Verified for print</p>
                  <h2 className="mt-0.5 text-lg font-bold text-[var(--ink)] truncate" style={{ fontFamily: 'var(--serif)' }}>
                    {displayFileName}
                  </h2>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-[var(--ink-muted)]">
                <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase block">Files & Copies</span>
                  <b className="text-xs text-[var(--ink)] font-bold mt-0.5 block">
                    {docCount} {docCount === 1 ? 'file' : 'files'} · {totalCopies} {totalCopies === 1 ? 'copy' : 'copies'}
                  </b>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase block">Paper Size</span>
                  <b className="text-xs text-[var(--ink)] font-bold mt-0.5 block">{displayPaper}</b>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase block">Color Mode</span>
                  <b className="text-xs text-[var(--ink)] font-bold mt-0.5 block">{displayColor}</b>
                </div>
              </div>
              <button onClick={begin} className="sx-button mt-6 w-full justify-center cursor-pointer">
                Open print session <ArrowRight size={16} />
              </button>
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}