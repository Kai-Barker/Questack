import { useContext, useEffect } from 'react';
import { NavSlotContext } from '../context/NavSlotContext';

// Claims the top bar's middle slot while the calling page is mounted (hiding
// the nav tabs) and returns the element to portal into.
// Usage: const slot = useNavSlot(); ... {slot && createPortal(<Controls />, slot)}
export function useNavSlot(): HTMLElement | null {
  const navSlot = useContext(NavSlotContext);
  const setInUse = navSlot?.setInUse;

  useEffect(() => {
    if (!setInUse) return;
    setInUse(true);
    return () => setInUse(false);
  }, [setInUse]);

  return navSlot?.element ?? null;
}
