import { useId, type ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  label?: string;
  className?: string; // outer (border) layer, e.g. layout
  bodyClassName?: string; // inner content layer, e.g. 'flex flex-col'
  tone?: 'default' | 'danger'; // danger: red border and heading, for failures
}

// The standard chamfered HUD panel, with an optional cyan (or red) heading
export default function Panel({ children, label, className = '', bodyClassName = '', tone = 'default' }: PanelProps) {
  const labelId = useId();
  const danger = tone === 'danger';

  return (
    <section aria-labelledby={label ? labelId : undefined} className={`chamfer p-px ${danger ? 'bg-swarm/60' : 'bg-line'} ${className}`}>
      <div className={`chamfer h-full bg-panel p-5 ${bodyClassName}`}>
        {label && (
          <h2
            id={labelId}
            className={`font-display text-xs font-semibold tracking-[0.2em] uppercase ${danger ? 'text-swarm' : 'text-accent'}`}
          >
            {label}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}
