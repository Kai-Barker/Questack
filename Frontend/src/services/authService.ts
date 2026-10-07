import { isAxiosError } from 'axios';
import api from './api';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';

// Account calls. The session itself is an httpOnly cookie that the browser
// sends automatically; this code never sees or stores the token.

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await api.get<{ user: AuthUser }>('/auth/me');
    return res.data.user;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 401) return null;
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const res = await api.post<{ user: AuthUser }>('/auth/login', input);
  return res.data.user;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const res = await api.post<{ user: AuthUser }>('/auth/register', input);
  return res.data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

// The sign-in forms' name for the shared helper (see utils/requestFailure.ts)
export { toRequestFailure as toAuthFailure } from '../utils/requestFailure';
