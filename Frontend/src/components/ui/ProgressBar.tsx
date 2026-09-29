import { percent } from '../../utils/progress';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string; // read out by screen readers, e.g. "XP to level 8"
  className?: string;
}

export default function ProgressBar({ value, max, label, className = '' }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-1 w-full bg-line ${className}`}
    >
      <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${percent(value, max)}%` }} />
    </div>
  );
}
