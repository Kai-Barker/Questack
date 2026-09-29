import { useContext } from 'react';
import { PilotContext } from '../context/PilotContext';

export function usePilot() {
  const context = useContext(PilotContext);
  if (!context) throw new Error('usePilot must be used inside <PilotProvider>');
  return context;
}
