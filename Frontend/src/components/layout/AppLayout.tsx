import { useMemo, useState } from 'react';
import { Outlet } from 'react-router';
import { NavSlotContext } from '../../context/NavSlotContext';
import { PilotProvider } from '../../context/PilotProvider';
import OrbitalRings from '../auth/OrbitalRings';
import GalaxyBackdrop from '../ui/GalaxyBackdrop';
import SystemsStatusToast from './SystemsStatusToast';
import TopNav from './TopNav';

// Shell shared by every signed-in screen: nav on top, the current page below,
// over the darkened galaxy and a few slow rings (as on the splash and sign-in)
export default function AppLayout() {
  // The nav bar's middle slot, which pages can portal into (see useNavSlot)
  const [slotElement, setSlotElement] = useState<HTMLDivElement | null>(null);
  const [slotInUse, setSlotInUse] = useState(false);
  const navSlot = useMemo(() => ({ element: slotElement, setInUse: setSlotInUse }), [slotElement]);

  return (
    <PilotProvider>
      <NavSlotContext value={navSlot}>
        {/* isolate keeps the backdrop (-z-10) behind the page but above the body */}
        <div className="relative isolate min-h-screen text-slate-100">
          <GalaxyBackdrop deep />
          <OrbitalRings variant="app" />
          <TopNav slotRef={setSlotElement} slotInUse={slotInUse} />
          <Outlet />
          <SystemsStatusToast />
        </div>
      </NavSlotContext>
    </PilotProvider>
  );
}
