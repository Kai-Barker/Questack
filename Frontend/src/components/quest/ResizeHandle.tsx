import { Separator } from 'react-resizable-panels';

interface ResizeHandleProps {
  direction: 'vertical' | 'horizontal'; // direction of the dashed line itself
  label: string;
}

// The dashed divider between resizable panes, with a grip in the middle.
// react-resizable-panels handles dragging, keyboard arrows and ARIA; the
// data-separator attribute says whether it's hovered or being dragged.
export default function ResizeHandle({ direction, label }: ResizeHandleProps) {
  const vertical = direction === 'vertical';
  return (
    <Separator
      aria-label={label}
      className={`group relative flex shrink-0 items-center justify-center outline-none ${
        vertical ? 'w-5 cursor-col-resize' : 'h-5 cursor-row-resize'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute border-dashed border-line-bright ${
          vertical ? 'inset-y-0 left-1/2 border-l' : 'inset-x-0 top-1/2 border-t'
        }`}
      />
      <span
        aria-hidden="true"
        className={`relative rounded-full bg-line-bright transition-colors group-hover:bg-accent/70 group-focus-visible:bg-accent group-data-[separator=active]:bg-accent ${
          vertical ? 'h-12 w-1' : 'h-1 w-12'
        }`}
      />
    </Separator>
  );
}
