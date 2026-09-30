import { isAxiosError } from 'axios';
import api from './api';
import type { AuthFailure, AuthUser, LoginInput, RegisterInput } from '../types/auth';

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

// Turns any auth request error into something the form can show
export function toAuthFailure(err: unknown): AuthFailure {
  if (!isAxiosError<{ error?: string; fields?: Record<string, string> }>(err) || !err.response) {
    return { kind: 'offline', message: 'Could not reach Questack command. Check your connection and try again.', fields: {} };
  }
  const { status, data } = err.response;
  const message = data?.error ?? 'Something went wrong. Try again.';
  const fields = data?.fields ?? {};
  if (status === 400) return { kind: 'invalid', message, fields };
  if (status === 401) return { kind: 'denied', message, fields };
  if (status === 409) return { kind: 'conflict', message, fields };
  if (status === 429) return { kind: 'limited', message, fields };
  return { kind: 'error', message, fields };
}
