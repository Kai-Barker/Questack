import ChamferFrame from '../ui/ChamferFrame';

const FONT_SIZES = { min: 12, max: 20, step: 2 };

interface TextSizeControlsProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  label: string; // what the buttons resize, e.g. 'code' or 'briefing'
}

// A− / A+ buttons in the Quest screen's pane headers
export default function TextSizeControls({ fontSize, onFontSizeChange, label }: TextSizeControlsProps) {
  return (
    <div className="ml-auto flex items-center gap-2" role="group" aria-label={`${label[0]!.toUpperCase()}${label.slice(1)} text size`}>
      <span className="font-display text-xs tracking-[0.2em] text-muted uppercase">Text size</span>
      {[
        { label: 'A−', name: `Smaller ${label} text`, size: fontSize - FONT_SIZES.step, disabled: fontSize <= FONT_SIZES.min },
        { label: 'A+', name: `Larger ${label} text`, size: fontSize + FONT_SIZES.step, disabled: fontSize >= FONT_SIZES.max },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          aria-label={option.name}
          disabled={option.disabled}
          onClick={() => onFontSizeChange(option.size)}
          className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChamferFrame
            as="span"
            size="sm"
            grow={option.disabled ? undefined : 'sm'}
            borderClassName="bg-line group-hover:bg-line-bright"
            innerClassName="bg-space-950 px-2 py-1 font-display text-xs text-slate-300"
          >
            {option.label}
          </ChamferFrame>
        </button>
      ))}
    </div>
  );
}
