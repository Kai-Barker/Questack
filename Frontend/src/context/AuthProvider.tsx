import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthStatus } from './AuthContext';
import api from '../services/api';
import * as authService from '../services/authService';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

const ANONYMOUS: AuthState = { status: 'anonymous', user: null };

// Knows who's signed in. On load it asks the backend (the session cookie is
// httpOnly, so the browser can't tell by itself), and it signs the pilot out
// locally if any API call later comes back 401 (e.g. the session expired).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    let cancelled = false;
    authService.getCurrentUser().then(
      (user) => {
        if (!cancelled) setState(user ? { status: 'authenticated', user } : ANONYMOUS);
      },
      // Backend unreachable: treat as signed out; the login screen shows the uplink as offline
      () => {
        if (!cancelled) setState(ANONYMOUS);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(undefined, (err: unknown) => {
      // Auth endpoints report their own 401s (e.g. a wrong password on the login form)
      const isAuthCall = isAxiosError(err) && err.config?.url?.startsWith('/auth/');
      if (isAxiosError(err) && err.response?.status === 401 && !isAuthCall) setState(ANONYMOUS);
      return Promise.reject(err);
    });
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const user = await authService.login(input);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const user = await authService.register(input);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  // Never rejects: if the backend can't be reached, the current account is kept
  // and the change shows up on the next load
  const refreshUser = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      setState(user ? { status: 'authenticated', user } : ANONYMOUS);
    } catch {
      // Offline: keep what we have
    }
  }, []);

  // Never rejects: the pilot is signed out locally even if the request
  // failed (the cookie expires anyway), so callers can carry on to /login
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Offline: nothing more to do
    }
    setState(ANONYMOUS);
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, refreshUser }),
    [state, login, register, logout, refreshUser],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
