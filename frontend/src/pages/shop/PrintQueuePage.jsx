import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Printer } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JOB_STATUS, STATUS_CONFIG } from '../../utils/constants';
import { api } from '../../utils/api';
import PageTransition from '../../components/common/PageTransition';

export default function PrintQueuePage() {
  const { jobs } = useApp();
  const navigate = useNavigate();

  const queueJobs = jobs.filter(
    (j) => [JOB_STATUS.WAITING, JOB_STATUS.PRINT_ID_GENERATED, JOB_STATUS.SECURE_SESSION, JOB_STATUS.PRINTING].includes(j.status)
  );

  const handleAcceptPrint = async (jobId) => {
    try {
      await api.startSession(jobId);
      navigate(`/shop/secure-print/${jobId}`);
    } catch (err) {
      alert(err.message || 'Failed to accept print job');
    }
  };

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap" style={{ maxWidth: '48rem' }}>
          <div className="mb-8">
            <h1 className="sx-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>Print Queue</h1>
            <p className="text-[var(--ink-muted)] text-sm mt-1">{queueJobs.length} jobs in queue — First In, First Out</p>
          </div>

          {queueJobs.length === 0 ? (
            <div className="sx-panel text-center py-12">
              <Clock className="w-12 h-12 text-[var(--ink-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--ink)] mb-2">Queue is empty</h3>
              <p className="text-[var(--ink-muted)] text-sm">No documents waiting to be printed</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queueJobs.map((job, index) => {
                const config = STATUS_CONFIG[job.status];
                const isPrinting = job.status === JOB_STATUS.PRINTING || job.status === JOB_STATUS.SECURE_SESSION;
                return (
                  <div
                    key={job.id}
                    className={`sx-card !p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isPrinting ? '!border-[var(--blue)]/20' : ''}`}
                  >
                    <div className="flex gap-4 items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg font-mono ${
                        isPrinting ? 'bg-[var(--blue-soft)] text-[var(--blue)]' : 'bg-[var(--sage)] text-[var(--ink-muted)]'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--ink)] truncate">{job.fileName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[var(--ink-muted)] font-mono">{job.printId}</span>
                          <span className="text-xs text-[var(--ink-muted)]">{job.copies} {job.copies === 1 ? 'copy' : 'copies'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 md:mt-0">
                      <span className={`sx-badge shrink-0 ${isPrinting ? 'sx-badge--success' : ''}`}>
                        {isPrinting ? 'PRINTING' : job.status.replaceAll('_', ' ')}
                      </span>
                      {job.status === 'PRINT_ID_GENERATED' && (
                        <button 
                          onClick={() => handleAcceptPrint(job.id)}
                          className="sx-button py-1.5 px-3 text-xs justify-center shrink-0"
                        >
                          Accept & Print
                        </button>
                      )}
                      {job.status === 'SECURE_SESSION' && (
                        <button 
                          onClick={() => navigate(`/shop/secure-print/${job.id}`)}
                          className="sx-button py-1.5 px-3 text-xs justify-center shrink-0 bg-[var(--blue)] hover:bg-[#1d4ed8] text-white border-transparent"
                        >
                          Resume Session
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="sx-infobar mt-8">
            <Printer size={16} className="shrink-0" />
            <p className="text-sm">Jobs are processed in First-In-First-Out (FIFO) order. Active sessions are shown at the top.</p>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
