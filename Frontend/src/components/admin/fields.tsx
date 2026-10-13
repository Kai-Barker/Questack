import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import ChamferFrame from '../ui/ChamferFrame';
import Dropdown, { type DropdownOption } from '../ui/Dropdown';

// Form controls for the admin console: a small label above a chamfered box,
// which turns cyan while focused and amber with a message when invalid.

export const fieldLabelClasses =
  'block font-display text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase group-focus-within:text-accent';

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-swarm">
      {message}
    </p>
  );
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, error, hint, className = '', children }: FieldShellProps) {
  return (
    <div className={`group ${className}`}>
      <label htmlFor={id} className={fieldLabelClasses}>
        {label}
      </label>
      <ChamferFrame
        size="sm"
        className="mt-2"
        borderClassName={error ? 'bg-swarm/70' : 'bg-line group-focus-within:bg-accent/70'}
        innerClassName="relative bg-space-950"
      >
        {children}
      </ChamferFrame>
      <FieldError id={`${id}-error`} message={error} />
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const controlClasses = 'w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-muted focus:outline-none';

const describedBy = (id: string, error?: string) =>
  error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'className' | 'id'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  className?: string;
  mono?: boolean;
}

export function TextField({ id, label, value, onChange, error, hint, className, mono, ...inputProps }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlClasses} ${mono ? 'font-mono' : ''}`}
        {...describedBy(id, error)}
        {...inputProps}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'className' | 'id'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  className?: string;
}

export function TextAreaField({ id, label, value, onChange, error, hint, className, rows = 3, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlClasses} block resize-y`}
        {...describedBy(id, error)}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectFieldProps<T extends string | number> {
  id: string;
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  className?: string;
}

// A labelled HUD dropdown (see components/ui/Dropdown.tsx)
export function SelectField<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  error,
  className = '',
}: SelectFieldProps<T>) {
  const labelId = `${id}-field-label`;
  return (
    <div className={`group ${className}`}>
      <label id={labelId} htmlFor={id} className={fieldLabelClasses}>
        {label}
      </label>
      <Dropdown
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        labelId={labelId}
        invalid={Boolean(error)}
        describedBy={error ? `${id}-error` : undefined}
        className="mt-2"
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface SwitchFieldProps {
  id: string;
  label: string; // the field's heading, e.g. "Side quest"
  checked: boolean;
  onChange: (checked: boolean) => void;
  onText: string;
  offText: string;
}

// An on/off switch with the current setting written next to it
export function SwitchField({ id, label, checked, onChange, onText, offText }: SwitchFieldProps) {
  return (
    <div className="group">
      <span id={`${id}-label`} className={fieldLabelClasses}>
        {label}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className="mt-2 flex items-center gap-3 py-2 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span
          aria-hidden="true"
          className={`relative h-5 w-10 rounded-full transition-colors ${checked ? 'bg-accent/70' : 'bg-line-bright'}`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-slate-100 transition-[left] ${checked ? 'left-[1.375rem]' : 'left-0.5'}`}
          />
        </span>
        {checked ? onText : offText}
      </button>
    </div>
  );
}
