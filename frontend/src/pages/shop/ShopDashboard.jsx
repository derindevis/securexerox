import { Link } from 'react-router-dom';
import { ScanLine, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JOB_STATUS, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';

export default function ShopDashboard() {
  const { jobs } = useApp();
  const queue = jobs.filter(j => ['WAITING', 'PRINT_ID_GENERATED', 'SECURE_SESSION', 'PRINTING'].includes(j.status));
  const completed = jobs.filter(j => j.status === JOB_STATUS.DESTROYED);

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">
          {/* Header */}
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="sx-kicker">Operator console</p>
              <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)' }}>
                Print with<br /><em>restraint.</em>
              </h1>
              <p className="sx-lede">Verify a customer's Print ID, open only the required session, then close it cleanly.</p>
            </div>
            <Link to="/shop/print" className="sx-button">
              <ScanLine size={16} /> Verify Print ID
            </Link>
          </header>

          {/* Stats */}
          <section className="sx-statline">
            <div className="sx-stat">
              <strong>{queue.length}</strong>
              <span>Waiting or active</span>
            </div>
            <div className="sx-stat">
              <strong>{completed.length}</strong>
              <span>Removal recorded</span>
            </div>
            <div className="sx-stat">
              <strong>FIFO</strong>
              <span>Queue discipline</span>
            </div>
          </section>

          {/* Queue */}
          <section className="sx-section">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--serif)' }}>
                  Next in line
                </h2>
              </div>
              <Link className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink)]" to="/shop/queue">Open queue</Link>
            </div>

            <div className="sx-list">
              {queue.slice(0, 5).map((job, index) => (
                <div className="sx-row" key={job.id}>
                  <div className="flex gap-4">
                    <span className="text-[var(--emerald)] font-mono font-bold">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong className="text-[var(--ink)] font-medium">{job.fileName}</strong>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">{job.printId} · {formatRelativeTime(job.createdAt)}</p>
                    </div>
                  </div>
                  <span className="sx-status">{job.status.replaceAll('_', ' ')}</span>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="sx-panel text-[var(--ink-secondary)] mt-4">The queue is clear.</div>
              )}
            </div>
          </section>

          {/* Info */}
          <aside className="sx-infobar">
            <ShieldCheck className="shrink-0" size={18} />
            <p>Use the Print ID for verification. Do not request the customer's original document.</p>
          </aside>
        </div>
      </main>
    </PageTransition>
  );
}