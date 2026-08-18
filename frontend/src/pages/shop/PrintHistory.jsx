import { FileText, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STATUS_CONFIG, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';

export default function PrintHistory() {
  const { jobs } = useApp();

  const historyJobs = jobs.filter((j) =>
    ['COMPLETED', 'ACCESS_REVOKED', 'DESTROYED', 'EXPIRED', 'FAILED', 'SESSION_LOCKED'].includes(j.status)
  );

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap" style={{ maxWidth: '56rem' }}>
          <div className="mb-8">
            <h1 className="sx-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Print History</h1>
            <p className="text-[var(--ink-muted)] text-sm mt-1">{historyJobs.length} completed jobs</p>
          </div>

          {historyJobs.length === 0 ? (
            <div className="sx-panel text-center py-12">
              <Clock className="w-12 h-12 text-[var(--ink-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--ink)] mb-2">No history yet</h3>
              <p className="text-[var(--ink-muted)] text-sm">Completed print jobs will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyJobs.map((job) => {
                const config = STATUS_CONFIG[job.status];
                return (
                  <div key={job.id} className="sx-card !p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--sage)] flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[var(--ink-secondary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--ink)]">{job.fileName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-[var(--ink-muted)] font-mono">{job.printId}</span>
                            <span className="text-xs text-[var(--ink-muted)]">{formatRelativeTime(job.createdAt)}</span>
                            {job.violations > 0 && (
                              <span className="text-xs text-[var(--amber)] flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {job.violations} violation{job.violations > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {job.destroyedAt && (
                          <span className="text-xs text-[var(--emerald)] flex items-center gap-1 hidden sm:flex">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Data Destroyed
                          </span>
                        )}
                        <span className="sx-badge sx-badge--success">
                          {config?.label || job.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
