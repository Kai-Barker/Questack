import { createContext, useContext } from 'react';

// Backend status, checked once by AuthShell and shared with the auth pages
export type Uplink = 'checking' | 'online' | 'degraded' | 'offline';

export const UplinkContext = createContext<Uplink>('checking');

export function useUplink(): Uplink {
  return useContext(UplinkContext);
}
