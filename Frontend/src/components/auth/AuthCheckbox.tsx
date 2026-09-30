import type { ReactNode } from 'react';
import { CheckIcon } from '../ui/icons';

interface AuthCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
}

// A real checkbox (keyboard and screen readers work as normal), styled to match
export default function AuthCheckbox({ id, checked, onChange, children, error }: AuthCheckboxProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <span className="relative grid size-5 shrink-0 place-items-center">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`peer size-5 cursor-pointer appearance-none rounded-sm border bg-space-950 checked:border-accent checked:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              error ? 'border-swarm' : 'border-line-bright'
            }`}
          />
          <CheckIcon aria-hidden="true" className="pointer-events-none absolute text-sm text-accent opacity-0 peer-checked:opacity-100" />
        </span>
        <label htmlFor={id} className="cursor-pointer">
          {children}
        </label>
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-swarm">
          {error}
        </p>
      )}
    </div>
  );
}
