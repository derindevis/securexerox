import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Printer, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import PageTransition from '../../components/common/PageTransition';

export default function CustomerTrackJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
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
          
          // Stop polling if completed or destroyed
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
    pollInterval = setInterval(fetchJob, 3000); // Poll every 3 seconds

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId]);

  if (loading) {
    return (
      <main className="sx-page flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--ink)] animate-spin" />
          <p className="text-sm text-[var(--ink-muted)]">Connecting to shop...</p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="sx-page">
        <div className="sx-wrap sx-form text-center py-12">
          <h1 className="text-xl font-bold text-[var(--ink)] mb-2">Tracking Failed</h1>
          <p className="text-sm text-[var(--ink-muted)] mb-6">{error || 'Job not found'}</p>
          <button onClick={() => navigate('/customer/upload')} className="sx-button justify-center mx-auto">
            <ArrowLeft size={16} /> Return to Upload
          </button>
        </div>
      </main>
    );
  }

  // Determine current stage
  let stage = 1;
  let statusText = 'Sent to Counter';
  let statusDesc = 'Waiting for shop operator to accept...';
  let icon = <Clock className="w-8 h-8 text-[var(--emerald)]" />;
  let isComplete = false;

  if (['WAITING', 'SECURE_SESSION', 'PRINTING'].includes(job.status)) {
    stage = 2;
    statusText = 'Printing in Progress';
    statusDesc = 'The operator is currently printing your documents.';
    icon = <Printer className="w-8 h-8 text-[var(--blue)] animate-pulse" />;
  } else if (['COMPLETED', 'DESTROYED'].includes(job.status)) {
    stage = 3;
    statusText = 'Securely Printed';
    statusDesc = 'Your documents have been printed and digitally shredded.';
    icon = <ShieldCheck className="w-8 h-8 text-[var(--emerald)]" />;
    isComplete = true;
  } else if (['EXPIRED', 'FAILED'].includes(job.status)) {
    stage = 3;
    statusText = 'Print Failed or Expired';
    statusDesc = 'The print job could not be completed and was destroyed.';
    icon = <ShieldCheck className="w-8 h-8 text-[var(--danger)]" />;
    isComplete = true;
  }

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap sx-form relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm ${
              stage === 1 ? 'bg-[var(--emerald-soft)]' : 
              stage === 2 ? 'bg-[var(--blue-soft)]' : 
              job.status.includes('FAILED') ? 'bg-[var(--danger-soft)]' : 'bg-[var(--emerald-soft)]'
            }`}>
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight mb-1">{statusText}</h1>
            <p className="text-sm text-[var(--ink-muted)]">{statusDesc}</p>
          </div>

          {/* Stepper */}
          <div className="relative mb-10 px-4">
            <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-[var(--line)] -translate-y-1/2 z-0" />
            <div className="absolute top-1/2 left-8 h-0.5 bg-[var(--emerald)] -translate-y-1/2 z-0 transition-all duration-700" style={{
              width: stage === 1 ? '0%' : stage === 2 ? '50%' : '100%',
              right: 'auto'
            }} />

            <div className="relative z-10 flex justify-between">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  stage >= 1 ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white' : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink-muted)]'
                }`}>
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase mt-2 text-[var(--ink)]">Sent</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  stage >= 2 ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white' : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink-muted)]'
                }`}>
                  {stage >= 2 ? <CheckCircle2 size={16} /> : <span className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <span className={`text-[10px] font-bold uppercase mt-2 ${stage >= 2 ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>Printing</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  stage >= 3 ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white' : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink-muted)]'
                }`}>
                  {stage >= 3 ? <CheckCircle2 size={16} /> : <span className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <span className={`text-[10px] font-bold uppercase mt-2 ${stage >= 3 ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>Done</span>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-[var(--surface-muted)] rounded-xl p-5 border border-[var(--line)] mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-3">Job Details</h3>
            <div className="space-y-3">
              {job.documents?.map((doc, idx) => (
                <div key={doc.id || idx} className="flex justify-between items-start border-b border-[var(--line)]/50 pb-3 last:border-0 last:pb-0">
                  <div className="truncate pr-4">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">{doc.fileName}</p>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">{doc.paperSize} • {doc.colorMode}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-[var(--ink)]">{doc.copies}x</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          {isComplete && (
            <button onClick={() => navigate('/customer/upload')} className="sx-button w-full justify-center">
              Print Another Document
            </button>
          )}

        </div>
      </main>
    </PageTransition>
  );
}
