import { createContext } from 'react';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>; // re-reads the account, e.g. after a callsign change
}

export const AuthContext = createContext<AuthContextValue | null>(null);
