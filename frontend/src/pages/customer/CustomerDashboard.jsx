import { Link } from 'react-router-dom';
import { ArrowRight, FilePlus, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JOB_STATUS, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';

export default function CustomerDashboard() {
  const { jobs, currentUser } = useApp();
  const mine = jobs.filter(j => !currentUser?.id || j.customerId === currentUser?.id || j.user_id === currentUser?.id);
  const active = mine.filter(j => !['DESTROYED', 'EXPIRED', 'FAILED'].includes(j.status));
  const removed = mine.filter(j => j.status === JOB_STATUS.DESTROYED);

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap">
          {/* Header */}
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="sx-kicker">Customer space</p>
              <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)' }}>
                Your print<br /><em>journey.</em>
              </h1>
              <p className="sx-lede">Create a temporary print handoff and follow its status from one place.</p>
            </div>
            <Link to="/customer/upload" className="sx-button">
              <FilePlus size={16} /> New print job
            </Link>
          </header>

          {/* Stats */}
          <section className="sx-statline">
            <div className="sx-stat">
              <strong>{active.length}</strong>
              <span>Active handoffs</span>
            </div>
            <div className="sx-stat">
              <strong>{removed.length}</strong>
              <span>Removal recorded</span>
            </div>
            <div className="sx-stat">
              <strong>{mine.length}</strong>
              <span>All print jobs</span>
            </div>
          </section>

          {/* Recent Jobs */}
          <section className="sx-section">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--serif)' }}>
                  What's happening now
                </h2>
              </div>
              <Link className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink)]" to="/customer/jobs">View all</Link>
            </div>

            <div className="sx-list">
              {mine.slice(0, 5).map(job => (
                <Link className="sx-row" key={job.id} to={`/customer/jobs/${job.id}`}>
                  <div>
                    <strong className="text-[var(--ink)] font-medium">{job.fileName}</strong>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {job.printId} · {formatRelativeTime(job.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="sx-status">{job.status.replaceAll('_', ' ')}</span>
                    <ArrowRight size={15} className="text-[var(--ink-muted)]" />
                  </div>
                </Link>
              ))}
              {mine.length === 0 && (
                <div className="sx-panel text-[var(--ink-secondary)] mt-4">No jobs yet. Start with a temporary Print ID.</div>
              )}
            </div>
          </section>

          {/* Security Info */}
          <aside className="sx-infobar">
            <ShieldCheck className="shrink-0" size={18} />
            <p>Share only the Print ID with the shop. Keep the original document private.</p>
          </aside>
        </div>
      </main>
    </PageTransition>
  );
}