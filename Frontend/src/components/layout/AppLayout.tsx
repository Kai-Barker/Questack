import { useMemo, useState } from 'react';
import { Outlet } from 'react-router';
import { NavSlotContext } from '../../context/NavSlotContext';
import { PilotProvider } from '../../context/PilotProvider';
import SystemsStatusToast from './SystemsStatusToast';
import TopNav from './TopNav';

// Shell shared by every signed-in screen: nav on top, the current page below
export default function AppLayout() {
  // The nav bar's middle slot, which pages can portal into (see useNavSlot)
  const [slotElement, setSlotElement] = useState<HTMLDivElement | null>(null);
  const [slotInUse, setSlotInUse] = useState(false);
  const navSlot = useMemo(() => ({ element: slotElement, setInUse: setSlotInUse }), [slotElement]);

  return (
    <PilotProvider>
      <NavSlotContext value={navSlot}>
        <div className="min-h-screen bg-space-950 text-slate-100">
          <TopNav slotRef={setSlotElement} slotInUse={slotInUse} />
          <Outlet />
          <SystemsStatusToast />
        </div>
      </NavSlotContext>
    </PilotProvider>
  );
}
