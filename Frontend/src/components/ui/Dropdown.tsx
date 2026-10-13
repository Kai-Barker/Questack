import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import ChamferFrame from './ChamferFrame';
import { CheckIcon, ChevronDownIcon } from './icons';

export interface DropdownOption<T> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string | number> {
  id: string;
  value: T | null; // null shows the placeholder (e.g. an "+ Add …" picker)
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  labelId?: string; // id of a visible label; otherwise give ariaLabel
  ariaLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  variant?: 'field' | 'bare'; // bare: no frame, for use inside another box
  className?: string; // spacing only: a field fills its parent, so set the width on a wrapper
}

interface Position {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const GAP = 4;
const MAX_HEIGHT = 288;

// A select box in the HUD style. The browser's own <select> list is drawn by
// the operating system and can't be styled, so this is a button that opens a
// listbox (the ARIA listbox pattern: arrows, Home/End, Enter, Escape, Tab and
// typing a letter all work). The list is portalled out of the page (or into
// the open <dialog>), because panels are clipped to their chamfered shape and
// would cut it off.
export default function Dropdown<T extends string | number>({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  labelId,
  ariaLabel,
  disabled = false,
  invalid = false,
  describedBy,
  variant = 'field',
  className = '',
}: DropdownProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  // The list sits in the top layer when inside a modal dialog, else on the page
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];
  const valueId = `${id}-value`;
  const listId = `${id}-listbox`;
  const srLabelId = `${id}-label-sr`;
  const nameIds = `${labelId ?? (ariaLabel ? srLabelId : '')} ${valueId}`.trim();
  const optionId = (index: number) => `${id}-option-${index}`;

  // Below the trigger, or above it when there isn't room
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP * 2;
    const above = rect.top - GAP * 2;
    const wanted = Math.min(MAX_HEIGHT, options.length * 42 + 10);
    const openUp = below < wanted && above > below;
    setPosition({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(MAX_HEIGHT, openUp ? above : below)),
      ...(openUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    });
  }, [options.length]);

  function show(index = selectedIndex >= 0 ? selectedIndex : 0) {
    if (disabled || options.length === 0) return;
    setActiveIndex(index);
    setPortalTarget(triggerRef.current?.closest('dialog') ?? document.body);
    place();
    setOpen(true);
  }

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    close(true);
  }

  // While open: follow the trigger on scroll and resize, and close on a click elsewhere
  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const reposition = () => place();
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) close(false);
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [open, place, close]);

  // Keep the highlighted option in view
  useEffect(() => {
    if (open) document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' });
    // optionId only depends on id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, id]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show();
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    const move = (index: number) => {
      event.preventDefault();
      setActiveIndex(Math.max(0, Math.min(last, index)));
    };
    switch (event.key) {
      case 'ArrowDown':
        return move(activeIndex + 1);
      case 'ArrowUp':
        return move(activeIndex - 1);
      case 'Home':
      case 'PageUp':
        return move(0);
      case 'End':
      case 'PageDown':
        return move(last);
      case 'Enter':
      case ' ':
        event.preventDefault();
        return choose(activeIndex);
      case 'Escape':
      case 'Tab':
        event.preventDefault();
        return close(true);
      default:
        // Typing a letter jumps to the next option that starts with it
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const key = event.key.toLowerCase();
          const startsWith = (i: number) => options[i]!.label.replace(/^[^a-z0-9]+/i, '').toLowerCase().startsWith(key);
          for (let step = 1; step <= options.length; step++) {
            const index = (activeIndex + step) % options.length;
            if (startsWith(index)) return move(index);
          }
        }
    }
  }

  const bare = variant === 'bare';
  const label = selected?.label ?? placeholder;

  const face = (
    <>
      <span id={valueId} className={`min-w-0 truncate ${selected ? 'text-slate-100' : 'text-muted'}`}>
        {label}
      </span>
      <ChevronDownIcon
        className={`shrink-0 text-lg text-slate-300 transition-transform group-hover:text-accent motion-reduce:transition-none ${
          open ? 'rotate-180 text-accent' : ''
        }`}
      />
    </>
  );

  return (
    <>
      {ariaLabel && !labelId && (
        <span id={srLabelId} className="sr-only">
          {ariaLabel}
        </span>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={nameIds || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={onTriggerKeyDown}
        className={`group block text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
          bare ? '' : 'w-full'
        } ${className}`}
      >
        {bare ? (
          <span className="flex items-center gap-2 px-2 py-1.5">{face}</span>
        ) : (
          <ChamferFrame
            as="span"
            size="sm"
            borderClassName={
              open ? 'bg-accent/70' : invalid ? 'bg-swarm/70' : 'bg-line group-hover:bg-line-bright group-focus-visible:bg-accent/70'
            }
            innerClassName="flex items-center justify-between gap-3 bg-space-950 py-2.5 pr-3 pl-3.5"
          >
            {face}
          </ChamferFrame>
        )}
      </button>

      {open &&
        position &&
        portalTarget &&
        createPortal(
          <div
            className="fixed z-50"
            style={{ left: position.left, top: position.top, bottom: position.bottom, minWidth: Math.max(position.width, 180) }}
          >
            <ChamferFrame size="sm" borderClassName="bg-accent/60" innerClassName="bg-panel shadow-xl">
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                tabIndex={-1}
                aria-labelledby={labelId ?? (ariaLabel ? srLabelId : undefined)}
                aria-activedescendant={optionId(activeIndex)}
                onKeyDown={onListKeyDown}
                style={{ maxHeight: position.maxHeight }}
                className="overflow-y-auto py-1 focus:outline-none"
              >
                {options.map((option, index) => {
                  const isSelected = index === selectedIndex;
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={String(option.value)}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      // Keep focus on the list while clicking
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseMove={() => !isActive && setActiveIndex(index)}
                      onClick={() => choose(index)}
                      className={`flex cursor-pointer items-center justify-between gap-4 px-3.5 py-2.5 text-sm ${
                        isActive ? 'bg-accent-deep text-accent' : isSelected ? 'text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {isSelected && <CheckIcon className="shrink-0 text-base text-accent" />}
                    </li>
                  );
                })}
              </ul>
            </ChamferFrame>
          </div>,
          portalTarget,
        )}
    </>
  );
}
