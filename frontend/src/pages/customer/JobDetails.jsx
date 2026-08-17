import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, Shield, ShieldAlert, ShieldCheck, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STATUS_CONFIG, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import StatusTimeline from '../../components/common/StatusTimeline';

export default function JobDetails() {
  const { jobId } = useParams();
  const { jobs } = useApp();
  const job = jobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-radial-glow pt-24 flex items-center justify-center">
          <Card className="text-center max-w-md">
            <p className="text-gray-400 mb-4">Job not found</p>
            <Link to="/customer/jobs"><Button variant="secondary">Back to Jobs</Button></Link>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const config = STATUS_CONFIG[job.status];

  return (
    <PageTransition>
      <div className="min-h-screen bg-radial-glow bg-grid-pattern pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back */}
          <Link to="/customer/jobs" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Jobs
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{job.fileName}</h1>
                <span className="text-sm text-gray-500 font-mono">{job.printId}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {job.violations > 0 && (
                <Badge color={job.violations >= 3 ? 'red' : 'orange'} size="lg">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 inline" /> {job.violations}/3 Violations
                </Badge>
              )}
              <Badge color={config?.color || 'gray'} size="lg" dot pulse={['PRINTING', 'SECURE_SESSION'].includes(job.status)}>
                {config?.label || job.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline */}
            <div className="lg:col-span-2">
              <Card>
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Document Lifecycle
                </h2>
                <StatusTimeline currentStatus={job.status} />
              </Card>

              {/* Security Audit Report Card */}
              <Card className={`mt-6 ${
                job.violations > 0
                  ? job.violations >= 3 ? 'border-red-500/40 bg-red-500/5' : 'border-orange-500/30 bg-orange-500/5'
                  : 'border-green-500/20 bg-green-500/5'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    job.violations > 0
                      ? job.violations >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {job.violations > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-sm font-semibold ${
                        job.violations > 0
                          ? job.violations >= 3 ? 'text-red-400' : 'text-orange-400'
                          : 'text-green-400'
                      }`}>
                        {job.violations > 0
                          ? `${job.violations}/3 Security ${job.violations === 1 ? 'Violation' : 'Violations'} Recorded`
                          : 'Clean Session — 0 Security Violations'}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {job.violations >= 3
                        ? 'Session locked by anti-tamper protocol due to repeated focus loss or unauthorized inspection attempts at the print shop.'
                        : job.violations > 0
                        ? `${job.violations} security ${job.violations === 1 ? 'attempt was' : 'attempts were'} detected during print execution (e.g. window blur or shortcut key). Security shields prevented unauthorized capture.`
                        : 'Zero security warnings triggered. The print operator executed the session strictly inside the secure fullscreen vault.'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Details sidebar */}
            <div className="space-y-6">
              <Card>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Print Settings</h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Copies', job.copies],
                    ['Paper', job.paperSize],
                    ['Color', job.colorMode],
                    ['Orientation', job.orientation],
                    ['Pages', job.pageRange],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Timestamps</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-white text-xs">{formatRelativeTime(job.createdAt)}</span>
                  </div>
                  {job.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Printed</span>
                      <span className="text-white text-xs">{formatRelativeTime(job.completedAt)}</span>
                    </div>
                  )}
                  {job.destroyedAt && (
                    <div className="flex justify-between">
                      <span className="text-green-400">Destroyed</span>
                      <span className="text-green-400 text-xs">{formatRelativeTime(job.destroyedAt)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {job.destroyedAt && (
                <Card className="border-green-500/15 text-center" hover={false}>
                  <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-400">Document Destroyed</p>
                  <p className="text-xs text-gray-500 mt-1">Your data is no longer stored anywhere</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
