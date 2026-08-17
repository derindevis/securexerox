import {
  Upload, Key, Clock, Shield, Printer, CheckCircle, Lock, ShieldCheck,
} from 'lucide-react';
import { LIFECYCLE_STAGES, JOB_STATUS } from '../../utils/constants';

const iconMap = {
  Upload, Key, Clock, Shield, Printer, CheckCircle, Lock, ShieldCheck,
};

function getStageState(stageIndex, currentStatusIndex, jobStatus) {
  if (jobStatus === JOB_STATUS.DESTROYED) {
    return 'completed';
  }
  // Special cases for terminal states
  if (jobStatus === JOB_STATUS.EXPIRED || jobStatus === JOB_STATUS.FAILED || jobStatus === JOB_STATUS.SESSION_LOCKED) {
    if (stageIndex <= currentStatusIndex) return 'completed';
    return 'inactive';
  }
  if (stageIndex < currentStatusIndex) return 'completed';
  if (stageIndex === currentStatusIndex) return 'active';
  return 'inactive';
}

export default function StatusTimeline({ currentStatus, compact = false }) {
  const currentIndex = LIFECYCLE_STAGES.findIndex(
    (s) => s.status === currentStatus
  );

  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-0'}`}>
      {LIFECYCLE_STAGES.map((stage, index) => {
        const stageState = getStageState(index, currentIndex, currentStatus);
        const Icon = iconMap[stage.icon] || CheckCircle;

        return (
          <div key={stage.key} className="flex items-start gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  transition-all duration-500
                  ${stageState === 'completed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : stageState === 'active'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 breathe'
                    : 'bg-white/5 text-gray-600 border border-white/10'
                  }
                `}
              >
                {stageState === 'completed' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              {/* Connector line */}
              {index < LIFECYCLE_STAGES.length - 1 && (
                <div
                  className={`w-0.5 ${compact ? 'h-4' : 'h-6'} transition-colors duration-500 ${
                    stageState === 'completed'
                      ? 'bg-green-500/40'
                      : 'bg-white/5'
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <div className={`pt-1 ${compact ? 'pb-0' : 'pb-2'}`}>
              <span
                className={`text-sm font-medium transition-colors duration-500 ${
                  stageState === 'completed'
                    ? 'text-green-400'
                    : stageState === 'active'
                    ? 'text-blue-400'
                    : 'text-gray-600'
                }`}
              >
                {stage.label}
              </span>
              {stageState === 'active' && (
                <span className="ml-2 text-xs text-blue-400/60 animate-pulse">
                  Current
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
