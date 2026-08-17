import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FileText, ArrowRight, Filter, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JOB_STATUS, STATUS_CONFIG, formatRelativeTime } from '../../utils/constants';
import PageTransition from '../../components/common/PageTransition';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

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
      <div className="min-h-screen bg-radial-glow bg-grid-pattern pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">My Print Jobs</h1>
              <p className="text-gray-400 text-sm">{customerJobs.length} total jobs</p>
            </div>
            <Link to="/customer/upload">
              <Button icon={Upload} size="sm">New Job</Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  filter === f.key
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Jobs list */}
          {filteredJobs.length === 0 ? (
            <Card className="text-center !py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No jobs found</h3>
              <p className="text-gray-500 text-sm mb-6">
                {filter === 'all' ? "You haven't created any print jobs yet" : `No ${filter} jobs`}
              </p>
              <Link to="/customer/upload">
                <Button icon={Upload}>Upload Document</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3 stagger-children">
              {filteredJobs.map((job) => {
                const config = STATUS_CONFIG[job.status];
                return (
                  <Link key={job.id} to={`/customer/jobs/${job.id}`}>
                    <Card className="!p-4 flex items-center justify-between group cursor-pointer mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                            {job.fileName}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500 font-mono">{job.printId}</span>
                            <span className="text-xs text-gray-600">{formatRelativeTime(job.createdAt)}</span>
                            <span className="text-xs text-gray-600">{job.copies} {job.copies === 1 ? 'copy' : 'copies'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge color={config?.color || 'gray'} size="sm" dot pulse={job.status === JOB_STATUS.PRINTING || job.status === JOB_STATUS.SECURE_SESSION}>
                          {config?.label || job.status}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors hide-mobile" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
