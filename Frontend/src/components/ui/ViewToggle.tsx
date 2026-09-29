import ChamferFrame from './ChamferFrame';

export type MapView = 'map' | 'list';

const options: { value: MapView; label: string }[] = [
  { value: 'map', label: 'Map view' },
  { value: 'list', label: 'List view' },
];

interface ViewToggleProps {
  view: MapView;
  onChange: (view: MapView) => void;
  className?: string;
}

// Map / list switch shared by the galaxy and sector maps
export default function ViewToggle({ view, onChange, className = '' }: ViewToggleProps) {
  return (
    <div role="group" aria-label="Map or list view" className={`flex gap-2 ${className}`}>
      {options.map((option) => {
        const active = view === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChamferFrame
              as="span"
              size="sm"
              grow="sm"
              borderClassName={active ? 'bg-accent/70' : 'bg-line group-hover:bg-line-bright'}
              innerClassName={`px-5 py-1.5 font-display text-xs font-semibold tracking-[0.2em] uppercase ${
                active ? 'bg-accent-deep text-accent' : 'bg-space-950 text-slate-300'
              }`}
            >
              {option.label}
            </ChamferFrame>
          </button>
        );
      })}
    </div>
  );
}
