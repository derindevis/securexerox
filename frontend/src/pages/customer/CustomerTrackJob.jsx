import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import { STATUS_CONFIG, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';
import StatusTimeline from '../../components/common/StatusTimeline';

export default function CustomerTrackJob() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let pollInterval;

    const fetchJob = async () => {
      try {
        const data = await api.getJob(jobId);
        if (isMounted) {
          setJob(data);
          setLoading(false);
          
          if (['COMPLETED', 'DESTROYED', 'EXPIRED', 'FAILED'].includes(data.status)) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to track job status');
          setLoading(false);
        }
      }
    };

    fetchJob();
    pollInterval = setInterval(fetchJob, 3000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId]);

  if (loading) {
    return (
      <PageTransition>
        <main className="sx-page flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--ink)] animate-spin" />
            <p className="text-sm text-[var(--ink-muted)]">Connecting to secure vault...</p>
          </div>
        </main>
      </PageTransition>
    );
  }

  if (error || !job) {
    return (
      <PageTransition>
        <main className="sx-page flex items-center justify-center">
          <div className="sx-panel text-center max-w-md">
            <h1 className="text-xl font-bold text-[var(--ink)] mb-2">Tracking Failed</h1>
            <p className="text-[var(--ink-secondary)] mb-6">{error || 'Job not found'}</p>
            <Link to="/customer/upload" className="sx-button justify-center mx-auto">
              <ArrowLeft size={16} /> Return to Upload
            </Link>
          </div>
        </main>
      </PageTransition>
    );
  }

  const config = STATUS_CONFIG[job.status];

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap" style={{ maxWidth: '56rem' }}>
          {/* Back */}
          <Link to="/customer/upload" className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Print Another Document
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--sage)] flex items-center justify-center">
                <FileText className="w-6 h-6 text-[var(--ink-secondary)]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--ink)]">
                  {job.documents && job.documents.length > 1
                    ? `${job.documents[0].fileName} + ${job.documents.length - 1} more (${job.documents.length} files)`
                    : job.documents?.[0]?.fileName || job.fileName || 'Batch Print Job'}
                </h1>
                <span className="text-sm text-[var(--ink-muted)] font-mono">{job.printId}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {job.violations > 0 && (
                <span className={`sx-badge ${job.violations >= 3 ? 'sx-badge--danger' : 'sx-badge--warning'}`}>
                  <ShieldAlert className="w-3.5 h-3.5" /> {job.violations}/3 Violations
                </span>
              )}
              <span className="sx-badge sx-badge--success">
                {config?.label || job.status.replaceAll('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline */}
            <div className="lg:col-span-2">
              <div className="sx-card">
                <h2 className="text-base font-semibold text-[var(--ink)] mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[var(--blue)]" />
                  Document Lifecycle
                </h2>
                <StatusTimeline currentStatus={job.status} />
              </div>

              {/* Security Audit */}
              <div className={`sx-card mt-6 ${
                job.violations > 0
                  ? job.violations >= 3 ? '!border-[var(--danger)]/30 bg-[var(--danger-soft)]' : '!border-[var(--amber)]/30 bg-[var(--amber-soft)]'
                  : '!border-[var(--emerald)]/20 bg-[var(--emerald-soft)]'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    job.violations > 0
                      ? job.violations >= 3 ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--amber-soft)] text-[var(--amber)]'
                      : 'bg-[var(--emerald-soft)] text-[var(--emerald)]'
                  }`}>
                    {job.violations > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${
                      job.violations > 0
                        ? job.violations >= 3 ? 'text-[var(--danger)]' : 'text-[var(--amber)]'
                        : 'text-[var(--emerald)]'
                    }`}>
                      {job.violations > 0
                        ? `${job.violations}/3 Security ${job.violations === 1 ? 'Violation' : 'Violations'} Recorded`
                        : 'Clean Session — 0 Security Violations'}
                    </h3>
                    <p className="text-xs text-[var(--ink-muted)] leading-relaxed mt-1">
                      {job.violations >= 3
                        ? 'Session locked by anti-tamper protocol due to repeated focus loss or unauthorized inspection attempts at the print shop.'
                        : job.violations > 0
                        ? `${job.violations} security ${job.violations === 1 ? 'attempt was' : 'attempts were'} detected during print execution. Security shields prevented unauthorized capture.`
                        : 'Zero security warnings triggered. The print operator executed the session strictly inside the secure vault.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Batch Documents Card */}
              {job.documents && job.documents.length > 0 && (
                <div className="sx-card mt-6">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-3">
                    Batch Documents ({job.documents.length})
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {job.documents.map((d, idx) => (
                      <div key={d.id || idx} className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-[var(--ink-muted)]" />
                          <span className="font-semibold text-[var(--ink)] truncate max-w-xs">{d.fileName}</span>
                        </div>
                        <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                          {d.copies}x • {d.colorMode} • {d.paperSize}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details sidebar */}
            <div className="space-y-6">
              <div className="sx-card">
                <h3 className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-3">Session Metadata</h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Total Files', job.documents ? job.documents.length : 1],
                    ['Total Copies', job.documents ? job.documents.reduce((s, d) => s + (d.copies || 1), 0) : job.copies || 1],
                    ['Created', formatRelativeTime(job.createdAt || job.created_at)],
                    ['Status', job.status.replaceAll('_', ' ')],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">{label}</span>
                      <span className="font-medium text-[var(--ink)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sx-card">
                <h3 className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-3">Timestamps</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--ink-muted)]">Created</span>
                    <span className="text-[var(--ink)] text-xs">{formatRelativeTime(job.createdAt || job.created_at)}</span>
                  </div>
                  {(job.completedAt || job.completed_at) && (
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Printed</span>
                      <span className="text-[var(--ink)] text-xs">{formatRelativeTime(job.completedAt || job.completed_at)}</span>
                    </div>
                  )}
                  {(job.destroyedAt || job.destroyed_at) && (
                    <div className="flex justify-between">
                      <span className="text-[var(--emerald)]">Destroyed</span>
                      <span className="text-[var(--emerald)] text-xs">{formatRelativeTime(job.destroyedAt || job.destroyed_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {(job.destroyedAt || job.destroyed_at || job.status === 'DESTROYED') && (
                <div className="sx-card !border-[var(--emerald)]/15 text-center">
                  <Shield className="w-8 h-8 text-[var(--emerald)] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[var(--emerald)]">Document Destroyed</p>
                  <p className="text-xs text-[var(--ink-muted)] mt-1">Your data is no longer stored anywhere</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
