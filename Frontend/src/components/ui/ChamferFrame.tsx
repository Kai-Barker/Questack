import type { ReactNode } from 'react';

const sizes = {
  sm: '[--chamfer:6px]',
  md: '[--chamfer:8px]',
  lg: '[--chamfer:12px]',
  xl: '[--chamfer:20px]', // banners
  octagon: '[--chamfer:29.3%]', // regular octagon on a square box
};

// How far the skin spreads past the frame on hover, in whole pixels
const grows = {
  sm: 'motion-safe:group-hover:-inset-0.5',
  md: 'motion-safe:group-hover:-inset-[3px]',
};

interface ChamferFrameProps {
  children: ReactNode;
  as?: 'div' | 'span'; // use 'span' inside buttons and other inline-only parents
  size?: keyof typeof sizes;
  borderClassName?: string; // background of the 1px border layer, e.g. 'bg-line'
  className?: string; // classes for the outer (border) layer, e.g. layout
  innerClassName?: string; // classes for the inner (content) layer, e.g. 'bg-panel p-4'
  grow?: keyof typeof grows; // grow when a `group` parent is hovered
}

// A cut-corner box with a 1px border that follows the chamfer.
// clip-path would cut a normal CSS border off at the corners, so the border is
// a clipped outer layer showing 1px around a clipped inner layer instead.
// Keep focus outlines on a parent element: clip-path hides them here.
export default function ChamferFrame({
  children,
  as: Tag = 'div',
  size = 'lg',
  borderClassName = 'bg-line',
  className = '',
  innerClassName = '',
  grow,
}: ChamferFrameProps) {
  if (grow) {
    return (
      <GrowingFrame Tag={Tag} size={size} grow={grow} borderClassName={borderClassName} className={className} innerClassName={innerClassName}>
        {children}
      </GrowingFrame>
    );
  }

  return (
    <Tag className={`chamfer p-px ${withDisplay(className)} ${sizes[size]} ${borderClassName}`}>
      <Tag className={`chamfer ${withHeight(withDisplay(innerClassName))}`}>{children}</Tag>
    </Tag>
  );
}

// Same look, but the border and background are painted by an absolutely
// positioned "skin" behind the content. On hover only the skin spreads out.
// Absolute elements take no space in the layout, so the growth can't nudge
// anything around it, and it lands on whole pixels so the border stays sharp.
// (Scaling the whole button blurs the 1px border; growing it with margins or
// borders makes neighbouring content shake while it animates.)
function GrowingFrame({
  children,
  Tag,
  size,
  grow,
  borderClassName,
  className,
  innerClassName,
}: Required<Omit<ChamferFrameProps, 'as'>> & { Tag: 'div' | 'span' }) {
  const { backgrounds, rest } = splitBackgrounds(innerClassName);

  return (
    <Tag className={`relative isolate p-px ${withDisplay(className)} ${sizes[size]}`}>
      <Tag
        aria-hidden="true"
        className={`chamfer absolute inset-0 -z-10 block p-px transition-[inset] duration-150 ${grows[grow]} ${borderClassName}`}
      >
        <Tag className={`chamfer block size-full ${backgrounds}`} />
      </Tag>
      <Tag className={withHeight(withDisplay(rest))}>{children}</Tag>
    </Tag>
  );
}

// Moves bg-* classes (including variants like group-hover:bg-*) onto the skin
function splitBackgrounds(classes: string) {
  const tokens = classes.split(/\s+/).filter(Boolean);
  const isBackground = (token: string) => /(^|:)bg-/.test(token);
  return {
    backgrounds: tokens.filter(isBackground).join(' '),
    rest: tokens.filter((token) => !isBackground(token)).join(' '),
  };
}

// Adds `block` (needed when rendering spans) unless the caller already chose a
// display, since two display utilities on one element fight each other.
const displayClass = /(^|\s)(block|flex|grid|inline-flex|inline-grid|inline-block|hidden)(\s|$)/;

function withDisplay(classes: string): string {
  return displayClass.test(classes) ? classes : `block ${classes}`;
}

// The inner layer fills the frame's height unless the caller sized it explicitly
const heightClass = /(^|\s)(size|h)-/;

function withHeight(classes: string): string {
  return heightClass.test(classes) ? classes : `h-full ${classes}`;
}
