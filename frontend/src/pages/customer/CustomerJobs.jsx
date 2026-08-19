import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FileText, ArrowRight, Filter, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JOB_STATUS, STATUS_CONFIG, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'destroyed', label: 'Destroyed' },
  { key: 'expired', label: 'Expired' },
];

export default function CustomerJobs() {
  const { jobs, currentUser } = useApp();
  const [filter, setFilter] = useState('all');

  const customerJobs = jobs.filter(
    (j) => !currentUser?.id || j.customerId === currentUser.id || j.user_id === currentUser.id
  );

  const filteredJobs = customerJobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ![JOB_STATUS.DESTROYED, JOB_STATUS.EXPIRED, JOB_STATUS.FAILED].includes(job.status);
    if (filter === 'completed') return job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.ACCESS_REVOKED;
    if (filter === 'destroyed') return job.status === JOB_STATUS.DESTROYED;
    if (filter === 'expired') return job.status === JOB_STATUS.EXPIRED;
    return true;
  });

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap" style={{ maxWidth: '56rem' }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="sx-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>My Print Jobs</h1>
              <p className="text-[var(--ink-muted)] text-sm mt-1">{customerJobs.length} total jobs</p>
            </div>
            <Link to="/customer/upload" className="sx-button sx-button--sm">
              <Upload size={14} /> New Job
            </Link>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-[var(--ink-muted)] flex-shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  filter === f.key
                    ? 'bg-[var(--ink)] text-white'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-black/3'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Jobs List */}
          {filteredJobs.length === 0 ? (
            <div className="sx-panel text-center py-12">
              <FileText className="w-12 h-12 text-[var(--ink-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--ink)] mb-2">No jobs found</h3>
              <p className="text-[var(--ink-muted)] text-sm mb-6">
                {filter === 'all' ? "You haven't created any print jobs yet" : `No ${filter} jobs`}
              </p>
              <Link to="/customer/upload" className="sx-button">
                <Upload size={14} /> Upload Document
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map((job) => {
                const config = STATUS_CONFIG[job.status];
                return (
                  <Link key={job.id} to={`/customer/jobs/${job.id}`}>
                    <div className="sx-card !p-4 flex items-center justify-between group cursor-pointer mb-2">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--sage)] flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-[var(--ink-secondary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--ink)] group-hover:text-[var(--emerald)] transition-colors">
                            {job.documents && job.documents.length > 1
                              ? `${job.documents[0].fileName} + ${job.documents.length - 1} more`
                              : job.documents?.[0]?.fileName || job.fileName || 'Batch Document'}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-[var(--ink-muted)] font-mono">{job.printId}</span>
                            <span className="text-xs text-[var(--ink-muted)]">{formatRelativeTime(job.createdAt || job.created_at)}</span>
                            <span className="text-xs text-[var(--ink-muted)]">
                              {job.documents
                                ? `${job.documents.reduce((s, d) => s + (d.copies || 1), 0)} total copies`
                                : `${job.copies || 1} copies`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="sx-badge sx-badge--success text-xs">
                          {config?.label || job.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--emerald)] transition-colors hidden sm:block" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
