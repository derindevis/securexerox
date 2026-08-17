import { getCountdownColor } from '../../utils/timers';

export default function CountdownTimer({
  seconds,
  totalSeconds,
  size = 120,
  strokeWidth = 6,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? seconds / totalSeconds : 0;
  const offset = circumference * (1 - progress);
  const colorClass = getCountdownColor(progress);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`transition-all duration-1000 ease-linear ${colorClass}`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-mono font-bold ${
            size >= 120 ? 'text-2xl' : size >= 80 ? 'text-lg' : 'text-sm'
          } ${progress <= 0.2 ? 'text-red-400' : progress <= 0.5 ? 'text-yellow-400' : 'text-white'}`}
        >
          {display}
        </span>
        {size >= 100 && (
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
            remaining
          </span>
        )}
      </div>
    </div>
  );
}
