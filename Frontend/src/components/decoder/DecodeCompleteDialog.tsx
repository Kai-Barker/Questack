import { useId, useRef } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import { CheckIcon } from '../ui/icons';

interface DecodeCompleteDialogProps {
  feedback: string;
  counted: boolean; // false when this transmission was decoded before
  onDecodeAnother: () => void;
  onClose: () => void; // stay on the decoder and look back over it
}

// Shown once the pilot passes the comprehension check, so it's clear the
// decode is finished and where to go next
export default function DecodeCompleteDialog({ feedback, counted, onDecodeAnother, onClose }: DecodeCompleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useModalDialog(dialogRef);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl bg-transparent p-0 text-slate-100 backdrop:bg-space-950/80 backdrop:backdrop-blur-[2px]"
    >
      <ChamferFrame size="lg" borderClassName="bg-buff/70" innerClassName="bg-panel px-6 py-7 sm:px-8">
        <p className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.25em] text-buff uppercase">
          <CheckIcon /> Comprehension check passed
        </p>
        <h2 id={titleId} className="mt-2 font-display text-2xl font-bold tracking-[0.08em] uppercase">
          Transmission understood
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{feedback}</p>
        <p className="mt-2 text-xs text-muted">
          {counted
            ? 'Logged towards your Decoder insignia.'
            : "You've decoded this transmission before, so it isn't counted again."}
        </p>

        {/* Same layout as the quest debrief: side by side when there's room, stacked when not */}
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={onDecodeAnother} className="w-full whitespace-nowrap">
            Decode another
          </Button>
          <Button to="/" className="w-full whitespace-nowrap">
            Back to Galaxy Map
          </Button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 font-display text-xs font-semibold tracking-[0.2em] text-muted uppercase hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          Stay and review
        </button>
      </ChamferFrame>
    </dialog>
  );
}
