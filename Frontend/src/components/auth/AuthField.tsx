import type { InputHTMLAttributes, ReactNode } from 'react';
import ChamferFrame from '../ui/ChamferFrame';
import { CheckIcon } from '../ui/icons';

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'className'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode; // right of the label, e.g. "Public" or a link
  error?: string;
  valid?: boolean; // shows a tick once the value passes the format rules
  reveal?: { shown: boolean; onToggle: () => void }; // Reveal / Hide for access codes
}

// A labelled console input. While focused, the frame and label turn cyan and
// a bar marks the left edge, so the focus state doesn't rely on the caret alone.
export default function AuthField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  valid = false,
  reveal,
  ...inputProps
}: AuthFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="group">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted uppercase group-focus-within:text-accent"
        >
          <span aria-hidden="true" className="h-px w-2.5 bg-current" />
          {label}
        </label>
        {hint && <span className="font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase">{hint}</span>}
      </div>

      <ChamferFrame
        size="md"
        className="mt-2"
        borderClassName={error ? 'bg-swarm/70' : 'bg-line group-focus-within:bg-accent/70'}
        // Solid background: a see-through one would let the border layer tint the field
        innerClassName="flex items-center bg-space-950 group-focus-within:shadow-[inset_3px_0_0_var(--color-accent)]"
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent px-5 py-3.5 font-mono text-sm text-slate-100 placeholder:text-muted focus:outline-none"
          {...inputProps}
        />
        {valid && !error && (
          <span className="mr-4 text-buff">
            <CheckIcon aria-hidden="true" />
            <span className="sr-only">Looks good</span>
          </span>
        )}
        {reveal && (
          <button
            type="button"
            aria-pressed={reveal.shown}
            aria-controls={id}
            onClick={reveal.onToggle}
            className="mr-2 rounded px-3 py-1.5 font-display text-xs tracking-[0.2em] text-muted uppercase hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {reveal.shown ? 'Hide' : 'Reveal'}
            <span className="sr-only"> access code</span>
          </button>
        )}
      </ChamferFrame>

      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-swarm">
          {error}
        </p>
      )}
    </div>
  );
}
