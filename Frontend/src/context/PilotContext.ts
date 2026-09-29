import { createContext } from 'react';
import type { PilotSummary } from '../types/pilot';

export interface PilotContextValue {
  pilot: PilotSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const PilotContext = createContext<PilotContextValue | null>(null);
