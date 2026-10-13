import { useId, useRef, type ReactNode } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A yes/no question in a modal, e.g. before deleting a draft or leaving with unsaved changes
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useModalDialog(dialogRef);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md bg-transparent p-0 text-slate-100 backdrop:bg-space-950/80 backdrop:backdrop-blur-[2px]"
    >
      <ChamferFrame size="lg" borderClassName="bg-swarm/70" innerClassName="bg-panel px-6 py-6">
        <h2 id={titleId} className="font-display text-lg font-bold tracking-[0.1em] uppercase">
          {title}
        </h2>
        <div className="mt-3 text-sm text-slate-300">{children}</div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={busy} className="flex-1">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={busy} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </ChamferFrame>
    </dialog>
  );
}
