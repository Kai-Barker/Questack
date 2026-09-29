import { useId, type ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  label?: string;
  className?: string; // outer (border) layer, e.g. layout
  bodyClassName?: string; // inner content layer, e.g. 'flex flex-col'
}

// The standard chamfered HUD panel, with an optional cyan heading
export default function Panel({ children, label, className = '', bodyClassName = '' }: PanelProps) {
  const labelId = useId();

  return (
    <section aria-labelledby={label ? labelId : undefined} className={`chamfer bg-line p-px ${className}`}>
      <div className={`chamfer h-full bg-panel p-5 ${bodyClassName}`}>
        {label && (
          <h2 id={labelId} className="font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            {label}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}
