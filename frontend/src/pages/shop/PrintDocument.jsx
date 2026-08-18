import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ScanLine, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatPrintIdInput, isValidPrintIdFormat } from '../../utils/printId';
import PageTransition from '../../components/common/PageTransition';

export default function PrintDocument() {
  const [id, setId] = useState('');
  const [job, setJob] = useState();
  const [error, setError] = useState('');
  const { getJobByPrintId, startSecureSession } = useApp();
  const nav = useNavigate();

  const verify = () => {
    if (!isValidPrintIdFormat(id)) { setError('Enter an ID in the format SX-XXXXXX.'); return; }
    const found = getJobByPrintId(id);
    if (!found || ['DESTROYED', 'EXPIRED', 'COMPLETED', 'ACCESS_REVOKED', 'SESSION_LOCKED'].includes(found.status)) {
      setError('This Print ID is not available.'); return;
    }
    setJob(found);
    setError('');
  };

  const begin = async () => {
    await startSecureSession(job.id, job.printId);
    nav(`/shop/confirm-print/${job.id}`);
  };

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap sx-form">
          <p className="sx-kicker">Operator verification</p>
          <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
            Start with<br /><em>permission.</em>
          </h1>
          <p className="sx-lede">Ask for the temporary Print ID. The document itself stays with the customer.</p>

          <section className="sx-panel mt-10">
            <div className="sx-field">
              <label htmlFor="print-id">Customer Print ID</label>
              <input
                id="print-id"
                style={{ fontFamily: 'var(--mono)', letterSpacing: '0.18em', fontSize: '1.25rem' }}
                value={id}
                onChange={(e) => { setId(formatPrintIdInput(e.target.value)); setJob(); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && verify()}
                placeholder="SX-XXXXXX"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <button onClick={verify} className="sx-button mt-5 w-full">
              <ScanLine size={16} /> Verify Print ID
            </button>
          </section>

          {job && (
            <section className="sx-panel mt-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[var(--emerald)]" />
                <div>
                  <p className="sx-status">Verified for print</p>
                  <h2 className="mt-1 text-xl font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--serif)' }}>
                    {job.fileType.toUpperCase()} · {job.copies} {job.copies === 1 ? 'copy' : 'copies'}
                  </h2>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-[var(--ink-muted)]">
                <span>Paper <b className="block mt-1 text-[var(--ink)] font-medium">{job.paperSize}</b></span>
                <span>Mode <b className="block mt-1 text-[var(--ink)] font-medium">{job.colorMode}</b></span>
              </div>
              <button onClick={begin} className="sx-button mt-7 w-full">
                Open print session <ArrowRight size={16} />
              </button>
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}