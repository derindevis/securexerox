import { FileText, Clock, Printer, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JOB_STATUS, STATUS_CONFIG } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

export default function PrintQueuePage() {
  const { jobs } = useApp();

  const queueJobs = jobs.filter(
    (j) => [JOB_STATUS.WAITING, JOB_STATUS.PRINT_ID_GENERATED, JOB_STATUS.SECURE_SESSION, JOB_STATUS.PRINTING].includes(j.status)
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-radial-glow bg-grid-pattern pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Print Queue</h1>
            <p className="text-gray-400 text-sm">{queueJobs.length} jobs in queue • First In → First Out</p>
          </div>

          {queueJobs.length === 0 ? (
            <Card className="text-center !py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Queue is empty</h3>
              <p className="text-gray-500 text-sm">No documents waiting to be printed</p>
            </Card>
          ) : (
            <div className="space-y-3 stagger-children">
              {queueJobs.map((job, index) => {
                const config = STATUS_CONFIG[job.status];
                const isPrinting = job.status === JOB_STATUS.PRINTING || job.status === JOB_STATUS.SECURE_SESSION;
                return (
                  <Card
                    key={job.id}
                    className={`!p-4 flex items-center gap-4 ${isPrinting ? 'border-blue-500/20' : ''}`}
                  >
                    {/* Position */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${
                      isPrinting ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-gray-500'
                    }`}>
                      #{index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{job.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 font-mono">{job.printId}</span>
                        <span className="text-xs text-gray-600">• {job.copies} {job.copies === 1 ? 'copy' : 'copies'}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <Badge color={config?.color || 'gray'} size="sm" dot pulse={isPrinting}>
                      {isPrinting ? 'PRINTING' : 'WAITING'}
                    </Badge>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <Card className="mt-8 !p-4" hover={false}>
            <p className="text-xs text-gray-500">
              📋 Jobs are processed in First-In-First-Out (FIFO) order. Active sessions are shown at the top.
            </p>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
