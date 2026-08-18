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
                    ? 'bg-[var(--emerald-soft)] text-[var(--emerald)] border border-[var(--emerald)]/30'
                    : stageState === 'active'
                    ? 'bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue)]/30'
                    : 'bg-[var(--canvas)] text-[var(--ink-muted)] border border-[var(--line-strong)]'
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
                      ? 'bg-[var(--emerald)]/30'
                      : 'bg-[var(--line)]'
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <div className={`pt-1 ${compact ? 'pb-0' : 'pb-2'}`}>
              <span
                className={`text-sm font-medium transition-colors duration-500 ${
                  stageState === 'completed'
                    ? 'text-[var(--emerald)]'
                    : stageState === 'active'
                    ? 'text-[var(--blue)]'
                    : 'text-[var(--ink-muted)]'
                }`}
              >
                {stage.label}
              </span>
              {stageState === 'active' && (
                <span className="ml-2 text-xs text-[var(--blue)] opacity-60 animate-pulse">
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
