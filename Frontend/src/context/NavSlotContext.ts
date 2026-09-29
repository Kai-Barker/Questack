import { createContext } from 'react';

// Lets a page put its own controls in the middle of the top bar (the Quest
// screen's objective stepper) by portalling into `element`. Pages use the
// useNavSlot hook rather than this directly.
export interface NavSlot {
  element: HTMLElement | null;
  setInUse: (inUse: boolean) => void;
}

export const NavSlotContext = createContext<NavSlot | null>(null);
