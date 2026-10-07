import { useEffect, type RefObject } from 'react';

// Opens a native <dialog> as a modal while the component is mounted (the
// browser then traps focus and closes it on Escape). When it unmounts, the
// dialog is closed properly and focus goes back to whatever opened it, so
// keyboard users carry on from the same button.
export function useModalDialog(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      opener?.focus();
    };
  }, [ref]);
}
