import { FileText, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STATUS_CONFIG, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

export default function PrintHistory() {
  const { jobs } = useApp();

  const historyJobs = jobs.filter((j) =>
    ['COMPLETED', 'ACCESS_REVOKED', 'DESTROYED', 'EXPIRED', 'FAILED', 'SESSION_LOCKED'].includes(j.status)
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-radial-glow bg-grid-pattern pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Print History</h1>
            <p className="text-gray-400 text-sm">{historyJobs.length} completed jobs</p>
          </div>

          {historyJobs.length === 0 ? (
            <Card className="text-center !py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No history yet</h3>
              <p className="text-gray-500 text-sm">Completed print jobs will appear here</p>
            </Card>
          ) : (
            <div className="space-y-3 stagger-children">
              {historyJobs.map((job) => {
                const config = STATUS_CONFIG[job.status];
                return (
                  <Card key={job.id} className="!p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{job.fileName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500 font-mono">{job.printId}</span>
                            <span className="text-xs text-gray-600">{formatRelativeTime(job.createdAt)}</span>
                            {job.violations > 0 && (
                              <span className="text-xs text-orange-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {job.violations} violation{job.violations > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {job.destroyedAt && (
                          <span className="text-xs text-green-400 flex items-center gap-1 hide-mobile">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Data Destroyed ✓
                          </span>
                        )}
                        <Badge color={config?.color || 'gray'} size="sm">
                          {config?.label || job.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
